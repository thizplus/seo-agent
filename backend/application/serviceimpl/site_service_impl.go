package serviceimpl

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"
)

type siteServiceImpl struct {
	siteRepo     repositories.SiteRepository
	sitePageRepo repositories.SitePageRepository
	keywordRepo  repositories.KeywordRepository
	aiEngine     ports.AIEnginePort
}

func NewSiteService(siteRepo repositories.SiteRepository, sitePageRepo repositories.SitePageRepository, keywordRepo repositories.KeywordRepository, aiEngine ports.AIEnginePort) *siteServiceImpl {
	return &siteServiceImpl{siteRepo: siteRepo, sitePageRepo: sitePageRepo, keywordRepo: keywordRepo, aiEngine: aiEngine}
}

func (s *siteServiceImpl) Create(ctx context.Context, userID uuid.UUID, req *dto.CreateSiteRequest) (*models.Site, error) {
	site := &models.Site{
		UserID: userID, Name: req.Name, URL: req.URL, AnalysisStatus: "pending",
		LLMProvider: req.LLMProvider, LLMApiKey: req.LLMApiKey,
		WPUrl: req.WPUrl, WPUsername: req.WPUsername, WPAppPassword: req.WPAppPassword,
	}
	if err := s.siteRepo.Create(ctx, site); err != nil {
		return nil, err
	}
	slog.Info("Site created", "site_id", site.ID, "user_id", userID)
	return site, nil
}

func (s *siteServiceImpl) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Site, error) {
	return s.siteRepo.GetByUserID(ctx, userID)
}

func (s *siteServiceImpl) GetByID(ctx context.Context, id uuid.UUID) (*models.Site, error) {
	return s.siteRepo.GetByID(ctx, id)
}

func (s *siteServiceImpl) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateSiteRequest) (*models.Site, error) {
	site, err := s.siteRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.Name != nil {
		site.Name = *req.Name
	}
	if req.URL != nil {
		site.URL = *req.URL
	}
	if req.Description != nil {
		site.Description = *req.Description
	}
	if req.Industry != nil {
		site.Industry = *req.Industry
	}
	if req.LLMProvider != nil {
		site.LLMProvider = *req.LLMProvider
	}
	if req.LLMApiKey != nil {
		site.LLMApiKey = *req.LLMApiKey
	}
	if req.WPUrl != nil {
		site.WPUrl = *req.WPUrl
	}
	if req.WPUsername != nil {
		site.WPUsername = *req.WPUsername
	}
	if req.WPAppPassword != nil {
		site.WPAppPassword = *req.WPAppPassword
	}
	if err := s.siteRepo.Update(ctx, site); err != nil {
		return nil, err
	}
	slog.Info("Site updated", "site_id", site.ID)
	return site, nil
}

func (s *siteServiceImpl) Delete(ctx context.Context, id uuid.UUID) error {
	return s.siteRepo.Delete(ctx, id)
}

func (s *siteServiceImpl) AnalyzeSite(ctx context.Context, id uuid.UUID) (map[string]any, error) {
	site, err := s.siteRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if site.LLMApiKey == "" {
		return nil, fmt.Errorf("LLM API key not configured")
	}

	resp, err := s.aiEngine.AnalyzeSite(ctx, map[string]any{
		"url": site.URL, "site_name": site.Name,
		"llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	})
	if err != nil {
		return nil, err
	}

	data, _ := resp["data"].(map[string]any)

	// อัพเดท site fields
	if bv, ok := data["brandVoice"].(string); ok {
		site.BrandVoice = bv
	}
	if bt, ok := data["businessType"].(string); ok {
		site.BusinessType = bt
	}
	if ind, ok := data["industry"].(string); ok {
		site.Industry = ind
	}
	if b, err := json.Marshal(data); err == nil {
		site.AnalysisData = b
	}
	// เก็บ suggestedSeeds จาก crawl data
	if seeds, ok := data["suggestedSeeds"].([]any); ok && len(seeds) > 0 {
		if b, err := json.Marshal(seeds); err == nil {
			site.SuggestedSeeds = b
		}
	}
	site.AnalysisStatus = "completed"
	s.siteRepo.Update(ctx, site)

	seedCount := 0
	if seeds, ok := data["suggestedSeeds"].([]any); ok {
		seedCount = len(seeds)
	}
	slog.Info("Site analyzed", "site_id", id, "seeds", seedCount)
	return data, nil
}

func (s *siteServiceImpl) DiscoverKeywords(ctx context.Context, id uuid.UUID, seedKeywords []string) (any, error) {
	site, err := s.siteRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// ถ้าไม่มี seed → ใช้ suggestedSeeds จาก site analysis อัตโนมัติ
	if len(seedKeywords) == 0 && len(site.SuggestedSeeds) > 0 {
		var seeds []string
		if err := json.Unmarshal(site.SuggestedSeeds, &seeds); err == nil && len(seeds) > 0 {
			seedKeywords = seeds
			slog.Info("Using auto seeds from analysis", "site_id", id, "seeds", len(seeds))
		}
	}

	resp, err := s.aiEngine.DiscoverKeywords(ctx, map[string]any{
		"seed_keywords": seedKeywords, "site_url": site.URL,
		"gsc_refresh_token": site.GSCRefreshToken, "gsc_site_url": site.GSCSiteURL,
		"llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	})
	if err != nil {
		return nil, err
	}

	data, _ := resp["data"]
	return data, nil
}

func (s *siteServiceImpl) CreateCluster(ctx context.Context, id uuid.UUID, keywords []string) (map[string]any, error) {
	site, err := s.siteRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	resp, err := s.aiEngine.CreateCluster(ctx, map[string]any{
		"keywords": keywords, "site_url": site.URL, "llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	})
	if err != nil {
		return nil, err
	}

	data, _ := resp["data"].(map[string]any)
	return data, nil
}

func (s *siteServiceImpl) AnalyzeCompetitor(ctx context.Context, id uuid.UUID, competitorURL string) (map[string]any, error) {
	site, err := s.siteRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	resp, err := s.aiEngine.AnalyzeCompetitor(ctx, map[string]any{
		"competitor_url": competitorURL, "site_url": site.URL, "llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	})
	if err != nil {
		return nil, err
	}

	data, _ := resp["data"].(map[string]any)
	return data, nil
}

func (s *siteServiceImpl) RunPipeline(ctx context.Context, id uuid.UUID) (map[string]any, error) {
	site, err := s.siteRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if site.LLMApiKey == "" {
		return nil, fmt.Errorf("LLM API key not configured")
	}

	result := map[string]any{"steps": []map[string]any{}}
	addStep := func(name, status string, data any) {
		steps := result["steps"].([]map[string]any)
		result["steps"] = append(steps, map[string]any{"name": name, "status": status, "data": data})
	}

	// Step 1: Crawl Pages + Extract Keywords per Page
	slog.Info("Pipeline: Crawl pages", "site", site.Name)
	crawlResp, err := s.aiEngine.CrawlPages(ctx, map[string]any{
		"url": site.URL, "site_name": site.Name, "max_pages": 100,
		"llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	})
	if err != nil {
		addStep("crawl", "failed", err.Error())
		return result, nil
	}

	crawlData, _ := crawlResp["data"].(map[string]any)
	pages, _ := crawlData["pages"].([]any)
	pageKeywords, _ := crawlData["pageKeywords"].([]any)

	// Save pages to DB (upsert: update ถ้ามีอยู่แล้ว)
	savedPages := 0
	for _, p := range pages {
		pm, ok := p.(map[string]any)
		if !ok {
			continue
		}
		pageURL, _ := pm["url"].(string)
		if pageURL == "" {
			continue
		}

		existing, err := s.sitePageRepo.GetByURL(ctx, site.ID, pageURL)
		if err == nil && existing.ID != uuid.Nil {
			// Update existing page
			existing.Title, _ = pm["title"].(string)
			existing.H1, _ = pm["h1"].(string)
			existing.MetaDescription, _ = pm["meta_description"].(string)
			existing.PageType, _ = pm["page_type"].(string)
			if wc, ok := pm["word_count"].(float64); ok {
				existing.WordCount = int(wc)
			}
			existing.LastCrawledAt = time.Now()
			s.sitePageRepo.Update(ctx, existing)
		} else {
			// Create new page
			newPage := &models.SitePage{
				SiteID:    site.ID,
				URL:       pageURL,
				PageType:  fmt.Sprintf("%v", pm["page_type"]),
				LastCrawledAt: time.Now(),
			}
			newPage.Title, _ = pm["title"].(string)
			newPage.H1, _ = pm["h1"].(string)
			newPage.MetaDescription, _ = pm["meta_description"].(string)
			if wc, ok := pm["word_count"].(float64); ok {
				newPage.WordCount = int(wc)
			}
			s.sitePageRepo.Create(ctx, newPage)
		}
		savedPages++
	}

	// Save keywords ผูกกับ page
	savedKWCount := 0
	allSeeds := []string{}
	existingKWs, _ := s.keywordRepo.GetBySiteID(ctx, site.ID)
	existingKWSet := map[string]bool{}
	for _, k := range existingKWs {
		existingKWSet[k.Keyword] = true
	}

	for _, pk := range pageKeywords {
		pkm, ok := pk.(map[string]any)
		if !ok {
			continue
		}
		pageURL, _ := pkm["url"].(string)
		kws, _ := pkm["keywords"].([]any)

		// หา page ID จาก URL
		var pageID *uuid.UUID
		if pageURL != "" {
			if page, err := s.sitePageRepo.GetByURL(ctx, site.ID, pageURL); err == nil {
				pageID = &page.ID
			}
		}

		for _, kw := range kws {
			var kwStr, intent string
			var score int

			switch v := kw.(type) {
			case string:
				kwStr = v
			case map[string]any:
				kwStr, _ = v["keyword"].(string)
				intent, _ = v["intent"].(string)
				if s, ok := v["score"].(float64); ok {
					score = int(s)
				}
			default:
				continue
			}

			if kwStr == "" || existingKWSet[kwStr] {
				continue
			}
			newKW := &models.Keyword{
				SiteID:  site.ID,
				PageID:  pageID,
				Keyword: kwStr,
				Intent:  intent,
				Score:   score,
			}
			if err := s.keywordRepo.Create(ctx, newKW); err == nil {
				savedKWCount++
				existingKWSet[kwStr] = true
			}
			allSeeds = append(allSeeds, kwStr)
		}
	}

	// Save seeds ลง site
	if b, err := json.Marshal(allSeeds); err == nil && len(allSeeds) > 0 {
		site.SuggestedSeeds = b
		s.siteRepo.Update(ctx, site)
	}

	addStep("crawl", "completed", map[string]any{
		"pagesFound":    len(pages),
		"pagesSaved":    savedPages,
		"keywordsSaved": savedKWCount,
		"seeds":         allSeeds,
	})

	// Step 2: Analyze Site (brand voice, industry)
	slog.Info("Pipeline: Analyze site", "site", site.Name)
	analysis, err := s.AnalyzeSite(ctx, id)
	if err != nil {
		addStep("analyze", "failed", err.Error())
	} else {
		addStep("analyze", "completed", map[string]any{
			"businessType": analysis["businessType"], "industry": analysis["industry"],
		})
	}

	// Pipeline จบแค่ crawl + analyze
	// บทความเป็นอีก flow แยก (Content Generation) ทำ by page/keyword

	return result, nil
}
