package handlers

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/pkg/utils"
)

type PageHandler struct {
	pageRepo     repositories.SitePageRepository
	keywordRepo  repositories.KeywordRepository
	siteRepo     repositories.SiteRepository
	analysisRepo repositories.PageAnalysisRepository
	serpRepo     repositories.SerpHistoryRepository
	aiEngine     ports.AIEnginePort
}

func NewPageHandler(
	pageRepo repositories.SitePageRepository,
	keywordRepo repositories.KeywordRepository,
	siteRepo repositories.SiteRepository,
	analysisRepo repositories.PageAnalysisRepository,
	serpRepo repositories.SerpHistoryRepository,
	aiEngine ports.AIEnginePort,
) *PageHandler {
	return &PageHandler{
		pageRepo: pageRepo, keywordRepo: keywordRepo, siteRepo: siteRepo,
		analysisRepo: analysisRepo, serpRepo: serpRepo, aiEngine: aiEngine,
	}
}

func (h *PageHandler) GetPages(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	pages, err := h.pageRepo.GetBySiteID(c.UserContext(), siteID)
	if err != nil {
		return utils.InternalErrorResponse(c, "Failed to get pages")
	}
	keywords, _ := h.keywordRepo.GetBySiteID(c.UserContext(), siteID)

	// Enrich with latest analysis
	result := make([]map[string]any, len(pages))
	for i, p := range pages {
		pageResp := dto.SitePageToResponse(&p, keywords)
		entry := map[string]any{
			"id": pageResp.ID, "siteId": pageResp.SiteID, "url": pageResp.URL,
			"title": pageResp.Title, "h1": pageResp.H1, "metaDescription": pageResp.MetaDescription,
			"pageType": pageResp.PageType, "wordCount": pageResp.WordCount,
			"keywords": pageResp.Keywords, "lastCrawledAt": pageResp.LastCrawledAt,
		}
		// Add latest audit score if available
		if analysis, err := h.analysisRepo.GetLatestByPageID(c.UserContext(), p.ID); err == nil {
			entry["auditScore"] = analysis.AuditScore
			entry["lastAnalyzedAt"] = analysis.AnalyzedAt
		}
		result[i] = entry
	}

	return utils.SuccessResponse(c, result)
}

func (h *PageHandler) AnalyzePage(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	pageID, err := uuid.Parse(c.Params("pageId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid page ID")
	}

	site, err := h.siteRepo.GetByID(c.UserContext(), siteID)
	if err != nil {
		return utils.NotFoundResponse(c, "Site not found")
	}
	page, err := h.pageRepo.GetByURL(c.UserContext(), siteID, "")
	// Get page by ID instead
	pages, _ := h.pageRepo.GetBySiteID(c.UserContext(), siteID)
	for _, p := range pages {
		if p.ID == pageID {
			page = &p
			break
		}
	}
	if page == nil || page.ID == uuid.Nil {
		return utils.NotFoundResponse(c, "Page not found")
	}

	// Get keywords for this page
	allKWs, _ := h.keywordRepo.GetBySiteID(c.UserContext(), siteID)
	keywords := []string{}
	for _, kw := range allKWs {
		if kw.PageID != nil && *kw.PageID == pageID {
			keywords = append(keywords, kw.Keyword)
		}
	}

	if len(keywords) == 0 {
		return utils.BadRequestResponse(c, "No keywords for this page")
	}

	// Call Python AI Engine
	resp, err := h.aiEngine.AnalyzePage(c.UserContext(), map[string]any{
		"page_url":     page.URL,
		"keywords":     keywords,
		"site_url":     site.URL,
		"llm_provider": site.LLMProvider,
		"llm_api_key":  site.LLMApiKey,
	})
	if err != nil {
		slog.Error("Analyze page failed", "error", err)
		return utils.BadRequestResponse(c, "Analysis failed: "+err.Error())
	}

	data, _ := resp["data"].(map[string]any)

	// Save analysis to DB
	analysis := &models.PageAnalysis{
		PageID:     pageID,
		AnalyzedAt: time.Now(),
	}
	if ourPage, ok := data["our_page"].(map[string]any); ok {
		if wc, ok := ourPage["word_count"].(float64); ok {
			analysis.OurWordCount = int(wc)
		}
		analysis.OurH1, _ = ourPage["h1"].(string)
		analysis.OurMeta, _ = ourPage["meta_description"].(string)
		if h2, ok := ourPage["h2_count"].(float64); ok {
			analysis.OurH2Count = int(h2)
		}
	}
	if avg, ok := data["avg_word_count"].(float64); ok {
		analysis.AvgWordCount = int(avg)
	}
	if cc, ok := data["competition_count"].(float64); ok {
		analysis.CompetitionCount = int(cc)
	}
	if score, ok := data["audit_score"].(float64); ok {
		analysis.AuditScore = int(score)
	}
	if b, err := json.Marshal(data["issues"]); err == nil {
		analysis.Issues = b
	}
	if b, err := json.Marshal(data["recommendations"]); err == nil {
		analysis.Recommendations = b
	}
	if b, err := json.Marshal(data["serp_snapshots"]); err == nil {
		analysis.SerpSnapshots = b
	}

	h.analysisRepo.Create(c.UserContext(), analysis)

	// Save SERP history per keyword
	if serpSnaps, ok := data["serp_snapshots"].(map[string]any); ok {
		for _, kw := range allKWs {
			if kw.PageID == nil || *kw.PageID != pageID {
				continue
			}
			if snap, ok := serpSnaps[kw.Keyword].(map[string]any); ok {
				history := &models.KeywordSerpHistory{
					KeywordID: kw.ID,
					CheckedAt: time.Now(),
				}
				if pos, ok := snap["our_position"].(float64); ok {
					history.OurPosition = int(pos)
				}
				if avg, ok := snap["avg_word_count"].(float64); ok {
					history.AvgWordCount = int(avg)
				}
				if b, err := json.Marshal(snap["results"]); err == nil {
					history.Results = b
				}
				h.serpRepo.Create(c.UserContext(), history)

				// Update keyword SERP data
				if b, err := json.Marshal(snap); err == nil {
					kw.SERPData = b
					h.keywordRepo.Update(c.UserContext(), &kw)
				}
			}
		}
	}

	slog.Info("Page analyzed", "page", page.URL, "score", analysis.AuditScore)
	return utils.SuccessResponse(c, dto.PageAnalysisToResponse(analysis))
}

func (h *PageHandler) GetAnalysis(c *fiber.Ctx) error {
	pageID, err := uuid.Parse(c.Params("pageId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid page ID")
	}
	analysis, err := h.analysisRepo.GetLatestByPageID(c.UserContext(), pageID)
	if err != nil {
		return utils.NotFoundResponse(c, "No analysis found")
	}
	return utils.SuccessResponse(c, dto.PageAnalysisToResponse(analysis))
}
