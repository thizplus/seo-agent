package scheduler

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/robfig/cron/v3"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/domain/services"
)

type Scheduler struct {
	cron           *cron.Cron
	siteService    services.SiteService
	keywordService services.KeywordService
	articleService services.ArticleService
	siteRepo       repositories.SiteRepository
	articleRepo    repositories.ArticleRepository
	pageRepo       repositories.SitePageRepository
	keywordRepo    repositories.KeywordRepository
	analysisRepo   repositories.PageAnalysisRepository
	serpRepo       repositories.SerpHistoryRepository
	aiEngine       ports.AIEnginePort
}

func New(
	siteService services.SiteService,
	keywordService services.KeywordService,
	articleService services.ArticleService,
	siteRepo repositories.SiteRepository,
	articleRepo repositories.ArticleRepository,
	pageRepo repositories.SitePageRepository,
	keywordRepo repositories.KeywordRepository,
	analysisRepo repositories.PageAnalysisRepository,
	serpRepo repositories.SerpHistoryRepository,
	aiEngine ports.AIEnginePort,
) *Scheduler {
	return &Scheduler{
		cron:           cron.New(),
		siteService:    siteService,
		keywordService: keywordService,
		articleService: articleService,
		siteRepo:       siteRepo,
		articleRepo:    articleRepo,
		pageRepo:       pageRepo,
		keywordRepo:    keywordRepo,
		analysisRepo:   analysisRepo,
		serpRepo:       serpRepo,
		aiEngine:       aiEngine,
	}
}

func (s *Scheduler) Start() {
	// Step 2: ทุกวัน 03:00 → Page Analysis (SERP + audit ทุก page)
	s.cron.AddFunc("0 3 * * *", func() {
		slog.Info("Scheduler: Running page analysis (Step 2)")
		s.runPageAnalysis()
	})

	// Step 3: ทุกวัน 06:00 → Content Generation (สร้างบทความ by keyword)
	s.cron.AddFunc("0 6 * * *", func() {
		slog.Info("Scheduler: Running content generation (Step 3)")
		s.runContentGeneration()
	})

	// Step 4: ทุก 12 ชม. → Ranking Tracker (GSC metrics + optimize)
	s.cron.AddFunc("0 */12 * * *", func() {
		slog.Info("Scheduler: Running ranking tracker (Step 4)")
		s.runRankingTracker()
	})

	s.cron.Start()
	slog.Info("Scheduler started", "jobs", len(s.cron.Entries()))
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
	slog.Info("Scheduler stopped")
}

// Step 2: Page Analysis — SERP + on-page audit ทุก page ทุก site
func (s *Scheduler) runPageAnalysis() {
	ctx := context.Background()
	sites, err := s.siteRepo.GetAll(ctx)
	if err != nil {
		slog.Error("PageAnalysis: Failed to get sites", "error", err)
		return
	}

	for _, site := range sites {
		if site.LLMApiKey == "" {
			continue
		}
		pages, _ := s.pageRepo.GetBySiteID(ctx, site.ID)
		allKWs, _ := s.keywordRepo.GetBySiteID(ctx, site.ID)

		for _, page := range pages {
			// หา keywords ของ page นี้
			keywords := []string{}
			kwModels := []models.Keyword{}
			for _, kw := range allKWs {
				if kw.PageID != nil && *kw.PageID == page.ID {
					keywords = append(keywords, kw.Keyword)
					kwModels = append(kwModels, kw)
				}
			}
			if len(keywords) == 0 {
				continue
			}

			slog.Info("PageAnalysis: Analyzing", "page", page.URL, "keywords", len(keywords))

			resp, err := s.aiEngine.AnalyzePage(ctx, map[string]any{
				"page_url": page.URL, "keywords": keywords, "site_url": site.URL,
				"llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
			})
			if err != nil {
				slog.Warn("PageAnalysis: Failed", "page", page.URL, "error", err)
				time.Sleep(30 * time.Second)
				continue
			}

			data, _ := resp["data"].(map[string]any)

			// Save analysis
			analysis := &models.PageAnalysis{PageID: page.ID, AnalyzedAt: time.Now()}
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
			s.analysisRepo.Create(ctx, analysis)

			// Save SERP history per keyword
			if serpSnaps, ok := data["serp_snapshots"].(map[string]any); ok {
				for _, kw := range kwModels {
					if snap, ok := serpSnaps[kw.Keyword].(map[string]any); ok {
						history := &models.KeywordSerpHistory{KeywordID: kw.ID, CheckedAt: time.Now()}
						if pos, ok := snap["our_position"].(float64); ok {
							history.OurPosition = int(pos)
						}
						if avg, ok := snap["avg_word_count"].(float64); ok {
							history.AvgWordCount = int(avg)
						}
						if b, err := json.Marshal(snap["results"]); err == nil {
							history.Results = b
						}
						s.serpRepo.Create(ctx, history)

						if b, err := json.Marshal(snap); err == nil {
							kw.SERPData = b
							s.keywordRepo.Update(ctx, &kw)
						}
					}
				}
			}

			slog.Info("PageAnalysis: Done", "page", page.URL, "score", analysis.AuditScore)
			time.Sleep(30 * time.Second) // delay ระหว่าง page
		}

		time.Sleep(60 * time.Second) // delay ระหว่าง site
	}
}

// Step 3: Content Generation — สร้างบทความสำหรับ keywords ที่ยังไม่มีบทความ
func (s *Scheduler) runContentGeneration() {
	ctx := context.Background()

	sites, err := s.siteRepo.GetAll(ctx)
	if err != nil {
		slog.Error("ContentGen: Failed to get sites", "error", err)
		return
	}

	for _, site := range sites {
		if site.LLMApiKey == "" || site.WPUrl == "" {
			continue
		}

		// ดึง keywords ทั้งหมด
		allKWs, _ := s.keywordService.GetBySiteID(ctx, site.ID)
		if len(allKWs) == 0 {
			continue
		}

		// ดึง articles ที่มีอยู่แล้ว — เช็คทั้ง keyword_id และ title (ป้องกันซ้ำ)
		allArticles, _ := s.articleService.GetBySiteID(ctx, site.ID)
		usedKWIDs := map[string]bool{}
		for _, a := range allArticles {
			if a.KeywordID != nil {
				usedKWIDs[a.KeywordID.String()] = true
			}
		}

		// Generate สำหรับ keywords ที่ยังไม่มีบทความ (max 3/day, delay 60s)
		generated := 0
		for _, kw := range allKWs {
			if generated >= 3 {
				break
			}
			if usedKWIDs[kw.ID.String()] {
				continue // keyword นี้มีบทความแล้ว
			}
			if generated > 0 {
				time.Sleep(60 * time.Second)
			}

			slog.Info("ContentGen: Generating", "keyword", kw.Keyword, "site", site.Name)
			article, err := s.articleService.Generate(ctx, &dto.GenerateArticleRequest{
				SiteID: site.ID.String(), KeywordID: kw.ID.String(),
			})
			if err != nil {
				slog.Warn("ContentGen: Failed", "keyword", kw.Keyword, "error", err)
				continue
			}

			slog.Info("ContentGen: Done", "title", article.Title, "words", article.WordCount)
			generated++
		}

		if generated > 0 {
			slog.Info("ContentGen: Site complete", "site", site.Name, "articles", generated)
		}
	}
}

// Step 4: Ranking Tracker — ดึง GSC metrics + auto optimize
func (s *Scheduler) runRankingTracker() {
	ctx := context.Background()

	sites, err := s.siteRepo.GetAll(ctx)
	if err != nil {
		slog.Error("Ranking: Failed to get sites", "error", err)
		return
	}

	for _, site := range sites {
		if site.GSCRefreshToken == "" {
			continue
		}

		articles, err := s.articleService.GetBySiteID(ctx, site.ID)
		if err != nil {
			continue
		}

		for _, article := range articles {
			if article.PublishStatus != "published" || article.PublishedURL == "" {
				continue
			}

			result, err := s.articleService.RunOptimizer(ctx, article.ID)
			if err != nil {
				continue
			}

			action, _ := result["action"].(string)
			if action != "" {
				slog.Info("Ranking: Optimized", "article_id", article.ID, "action", action)
			}
		}
	}
}
