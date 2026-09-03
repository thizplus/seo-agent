package serviceimpl

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"

	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"

	"gorm.io/gorm"
)

type articleServiceImpl struct {
	articleRepo repositories.ArticleRepository
	keywordRepo repositories.KeywordRepository
	siteRepo    repositories.SiteRepository
	aiEngine    ports.AIEnginePort
	db          *gorm.DB
}

func NewArticleService(
	articleRepo repositories.ArticleRepository,
	keywordRepo repositories.KeywordRepository,
	siteRepo repositories.SiteRepository,
	aiEngine ports.AIEnginePort,
	db *gorm.DB,
) *articleServiceImpl {
	return &articleServiceImpl{
		articleRepo: articleRepo,
		keywordRepo: keywordRepo,
		siteRepo:    siteRepo,
		aiEngine:    aiEngine,
		db:          db,
	}
}

func (s *articleServiceImpl) Generate(ctx context.Context, req *dto.GenerateArticleRequest) (*models.Article, error) {
	siteID, err := uuid.Parse(req.SiteID)
	if err != nil {
		return nil, fmt.Errorf("invalid site ID: %w", err)
	}
	keywordID, err := uuid.Parse(req.KeywordID)
	if err != nil {
		return nil, fmt.Errorf("invalid keyword ID: %w", err)
	}

	site, err := s.siteRepo.GetByID(ctx, siteID)
	if err != nil {
		return nil, fmt.Errorf("site not found: %w", err)
	}
	keyword, err := s.keywordRepo.GetByID(ctx, keywordID)
	if err != nil {
		return nil, fmt.Errorf("keyword not found: %w", err)
	}

	article := &models.Article{SiteID: siteID, KeywordID: &keywordID, Status: "generating"}
	if err := s.articleRepo.Create(ctx, article); err != nil {
		return nil, err
	}

	aiReq := map[string]any{
		"keyword": keyword.Keyword, "site_url": site.URL, "site_name": site.Name,
		"brand_voice": site.BrandVoice, "industry": site.Industry, "llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	}
	if len(req.SecondaryKeywords) > 0 {
		aiReq["secondary_keywords"] = req.SecondaryKeywords
	}
	if req.PillarURL != "" {
		aiReq["pillar_url"] = req.PillarURL
	}
	if req.CustomTitle != "" {
		aiReq["custom_title"] = req.CustomTitle
	}
	if req.ContentGuide != "" {
		aiReq["content_guide"] = req.ContentGuide
	}
	if req.WritingTone != "" {
		aiReq["writing_tone"] = req.WritingTone
	}
	aiResp, err := s.aiEngine.GenerateArticle(ctx, aiReq)
	if err != nil {
		s.articleRepo.Delete(ctx, article.ID)
		return nil, fmt.Errorf("AI engine error: %w", err)
	}

	article.Title = getStr(aiResp, "title")
	article.Slug = getStr(aiResp, "slug")
	article.Content = getStr(aiResp, "content")
	article.MetaDescription = getStr(aiResp, "metaDescription")
	article.WordCount = getInt(aiResp, "wordCount")
	article.Status = "completed"
	if b, err := json.Marshal(aiResp["schemaMarkup"]); err == nil {
		article.SchemaMarkup = b
	}
	if b, err := json.Marshal(aiResp["eeatScore"]); err == nil {
		article.EEATScore = b
	}
	if err := s.articleRepo.Update(ctx, article); err != nil {
		return nil, err
	}

	s.saveVersion(article, "initial")

	// Background: Fetch SERP data
	go func() {
		bgCtx := context.Background()
		serpResp, err := s.aiEngine.AnalyzeSERP(bgCtx, keyword.Keyword)
		if err == nil {
			if b, err := json.Marshal(serpResp); err == nil {
				keyword.SERPData = b
				s.keywordRepo.Update(bgCtx, keyword)
				slog.Info("SERP data saved", "keyword", keyword.Keyword)
			}
		}
	}()

	slog.Info("Article generated", "article_id", article.ID)
	return article, nil
}

func (s *articleServiceImpl) GetByID(ctx context.Context, id uuid.UUID) (*models.Article, error) {
	return s.articleRepo.GetByID(ctx, id)
}

func (s *articleServiceImpl) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Article, error) {
	return s.articleRepo.GetBySiteID(ctx, siteID)
}

func (s *articleServiceImpl) Publish(ctx context.Context, id uuid.UUID) (*models.Article, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	site, err := s.siteRepo.GetByID(ctx, article.SiteID)
	if err != nil {
		return nil, fmt.Errorf("site not found: %w", err)
	}
	if site.WPUrl == "" {
		return nil, fmt.Errorf("WordPress not configured")
	}

	resp, err := s.aiEngine.PublishArticle(ctx, map[string]any{
		"title": article.Title, "content": article.Content, "slug": article.Slug,
		"metaDescription": article.MetaDescription,
		"wpUrl": site.WPUrl, "wpUsername": site.WPUsername, "wpAppPassword": site.WPAppPassword,
	})
	if err != nil {
		return nil, fmt.Errorf("publish error: %w", err)
	}

	article.PublishedURL = getStr(resp, "publishedUrl")
	article.CMSPostID = getStr(resp, "cmsPostId")
	article.PublishStatus = "published"
	s.articleRepo.Update(ctx, article)

	slog.Info("Article published", "article_id", article.ID)
	return article, nil
}

func (s *articleServiceImpl) FetchMetrics(ctx context.Context, id uuid.UUID) (map[string]any, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if article.PublishedURL == "" {
		return nil, fmt.Errorf("article not published yet")
	}
	site, err := s.siteRepo.GetByID(ctx, article.SiteID)
	if err != nil {
		return nil, err
	}
	if site.GSCRefreshToken == "" {
		return nil, fmt.Errorf("GSC not connected")
	}

	resp, err := s.aiEngine.FetchMetrics(ctx, map[string]any{
		"page_url": article.PublishedURL, "gsc_refresh_token": site.GSCRefreshToken,
		"gsc_site_url": site.GSCSiteURL, "days": 28,
	})
	if err != nil {
		return nil, err
	}
	data, _ := resp["data"].(map[string]any)
	return data, nil
}

func (s *articleServiceImpl) RunOptimizer(ctx context.Context, id uuid.UUID) (map[string]any, error) {
	metrics, err := s.FetchMetrics(ctx, id)
	if err != nil {
		return nil, err
	}

	decideResp, err := s.aiEngine.DecideOptimization(ctx, metrics)
	if err != nil {
		return nil, err
	}
	action := getStr(decideResp, "action")
	if action == "" {
		return map[string]any{"action": nil, "message": "No optimization needed", "metrics": metrics}, nil
	}

	article, _ := s.articleRepo.GetByID(ctx, id)
	site, _ := s.siteRepo.GetByID(ctx, article.SiteID)
	keyword, _ := s.keywordRepo.GetByID(ctx, *article.KeywordID)
	kw := ""
	if keyword != nil {
		kw = keyword.Keyword
	}

	optimizeResp, err := s.aiEngine.OptimizeArticle(ctx, map[string]any{
		"title": article.Title, "content": article.Content, "keyword": kw,
		"action": action, "llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
	})
	if err != nil {
		return nil, err
	}

	data, _ := optimizeResp["data"].(map[string]any)
	afterData, _ := data["after"].(map[string]any)

	if action == "rewrite_title" {
		if t := getStr(afterData, "title"); t != "" {
			article.Title = t
			article.ContentVersion++
			s.articleRepo.Update(ctx, article)
			s.saveVersion(article, "rewrite_title")
		}
	} else if action == "expand_content" {
		if c := getStr(afterData, "content"); c != "" {
			article.Content = c
			article.ContentVersion++
			s.articleRepo.Update(ctx, article)
			s.saveVersion(article, "expand_content")
		}
	}

	return map[string]any{"action": action, "metrics": metrics, "result": data}, nil
}

func (s *articleServiceImpl) GenerateImages(ctx context.Context, id uuid.UUID, count int) (any, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	site, err := s.siteRepo.GetByID(ctx, article.SiteID)
	if err != nil {
		return nil, err
	}
	if site.LLMApiKey == "" {
		return nil, fmt.Errorf("LLM API key not configured")
	}

	keyword, _ := s.keywordRepo.GetByID(ctx, *article.KeywordID)
	kw := ""
	if keyword != nil {
		kw = keyword.Keyword
	}

	resp, err := s.aiEngine.GenerateImages(ctx, map[string]any{
		"title":           article.Title,
		"keyword":         kw,
		"content":         article.Content[:min(len(article.Content), 2000)],
		"count":           count,
		"llm_provider":    site.LLMProvider,
		"llm_api_key":     site.LLMApiKey,
		"image_provider":  site.LLMProvider, // ใช้ provider เดียวกับ LLM
		"wp_url":          site.WPUrl,
		"wp_username":     site.WPUsername,
		"wp_app_password": site.WPAppPassword,
	})
	if err != nil {
		return nil, err
	}

	data, _ := resp["data"]
	return data, nil
}

func (s *articleServiceImpl) FindImages(ctx context.Context, id uuid.UUID, count int) (any, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	site, err := s.siteRepo.GetByID(ctx, article.SiteID)
	if err != nil {
		return nil, err
	}
	if site.LLMApiKey == "" {
		return nil, fmt.Errorf("LLM API key not configured")
	}

	keyword, _ := s.keywordRepo.GetByID(ctx, *article.KeywordID)
	kw := ""
	if keyword != nil {
		kw = keyword.Keyword
	}

	resp, err := s.aiEngine.FindImages(ctx, map[string]any{
		"title":           article.Title,
		"keyword":         kw,
		"count":           count,
		"llm_provider":    site.LLMProvider,
		"llm_api_key":     site.LLMApiKey,
		"wp_url":          site.WPUrl,
		"wp_username":     site.WPUsername,
		"wp_app_password": site.WPAppPassword,
		"wp_post_id":      article.CMSPostID,
	})
	if err != nil {
		return nil, err
	}

	data, _ := resp["data"]
	return data, nil
}

func (s *articleServiceImpl) SearchImages(ctx context.Context, keyword string, count int) (any, error) {
	resp, err := s.aiEngine.SearchImages(ctx, map[string]any{
		"keyword": keyword, "count": count,
	})
	if err != nil {
		return nil, err
	}
	return resp["data"], nil
}

func (s *articleServiceImpl) UploadSelectedImages(ctx context.Context, id uuid.UUID, images []map[string]any) (any, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	site, err := s.siteRepo.GetByID(ctx, article.SiteID)
	if err != nil {
		return nil, err
	}

	resp, err := s.aiEngine.UploadSelectedImages(ctx, map[string]any{
		"images":          images,
		"wp_url":          site.WPUrl,
		"wp_username":     site.WPUsername,
		"wp_app_password": site.WPAppPassword,
		"wp_post_id":      article.CMSPostID,
	})
	if err != nil {
		return nil, err
	}

	// บันทึกรูปลง DB
	data, _ := resp["data"].([]any)
	for i, item := range data {
		imgMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		url := getStr(imgMap, "url")
		if url == "" {
			continue
		}
		role := getStr(imgMap, "role")
		if role == "" {
			role = "content"
		}
		img := models.ArticleImage{
			ArticleID:  id,
			URL:        url,
			AltText:    getStr(imgMap, "alt_text"),
			Role:       role,
			Format:     getStr(imgMap, "format"),
			FileSizeKB: getInt(imgMap, "file_size_kb"),
			Position:   i + 1,
		}
		s.db.Create(&img)
	}

	return resp["data"], nil
}

func (s *articleServiceImpl) GetImages(ctx context.Context, id uuid.UUID) ([]models.ArticleImage, error) {
	var images []models.ArticleImage
	err := s.db.WithContext(ctx).Where("article_id = ?", id).Order("position ASC").Find(&images).Error
	return images, err
}

func (s *articleServiceImpl) DeleteImage(ctx context.Context, articleID uuid.UUID, imageID uuid.UUID) error {
	var img models.ArticleImage
	if err := s.db.WithContext(ctx).Where("id = ? AND article_id = ?", imageID, articleID).First(&img).Error; err != nil {
		return err
	}

	// ลบจาก WP
	var article models.Article
	s.db.First(&article, articleID)
	site, _ := s.siteRepo.GetByID(ctx, article.SiteID)
	if site != nil && site.WPUrl != "" && img.URL != "" {
		s.aiEngine.DeleteMedia(ctx, map[string]any{
			"image_url": img.URL, "wp_url": site.WPUrl,
			"wp_username": site.WPUsername, "wp_app_password": site.WPAppPassword,
		})
	}

	return s.db.WithContext(ctx).Delete(&img).Error
}

func (s *articleServiceImpl) DeleteArticleFull(ctx context.Context, id uuid.UUID) error {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	site, _ := s.siteRepo.GetByID(ctx, article.SiteID)

	// ลบ WP post
	if site != nil && site.WPUrl != "" && article.CMSPostID != "" {
		s.aiEngine.DeleteWPPost(ctx, map[string]any{
			"wp_post_id": article.CMSPostID, "wp_url": site.WPUrl,
			"wp_username": site.WPUsername, "wp_app_password": site.WPAppPassword,
		})
	}

	// ลบ images จาก WP
	var images []models.ArticleImage
	s.db.Where("article_id = ?", id).Find(&images)
	for _, img := range images {
		if site != nil && site.WPUrl != "" && img.URL != "" {
			s.aiEngine.DeleteMedia(ctx, map[string]any{
				"image_url": img.URL, "wp_url": site.WPUrl,
				"wp_username": site.WPUsername, "wp_app_password": site.WPAppPassword,
			})
		}
	}

	// ลบจาก DB (article + images + versions cascade)
	s.db.Where("article_id = ?", id).Delete(&models.ArticleImage{})
	s.db.Where("article_id = ?", id).Delete(&models.ArticleVersion{})
	return s.articleRepo.Delete(ctx, id)
}

func (s *articleServiceImpl) UpdateContent(ctx context.Context, id uuid.UUID, req *dto.UpdateContentRequest) (*models.Article, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("article not found: %w", err)
	}

	if req.Title != "" {
		article.Title = req.Title
	}
	if req.Content != "" {
		article.Content = req.Content
		// นับ word count ใหม่
		article.WordCount = countWords(req.Content)
	}
	if req.MetaDescription != "" {
		article.MetaDescription = req.MetaDescription
	}

	article.ContentVersion++
	if err := s.articleRepo.Update(ctx, article); err != nil {
		return nil, fmt.Errorf("failed to update article: %w", err)
	}

	s.saveVersion(article, "manual_edit")
	slog.InfoContext(ctx, "Article content updated", "article_id", id)
	return article, nil
}

func (s *articleServiceImpl) RandomFeaturedImage(ctx context.Context, id uuid.UUID) (*models.Article, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("article not found: %w", err)
	}
	if article.KeywordID == nil {
		return nil, fmt.Errorf("article has no keyword")
	}
	keyword, err := s.keywordRepo.GetByID(ctx, *article.KeywordID)
	if err != nil || keyword.PageID == nil {
		return nil, fmt.Errorf("keyword has no page")
	}

	// ดึงรูปจาก page → random 1 รูป
	var page models.SitePage
	if err := s.db.WithContext(ctx).First(&page, *keyword.PageID).Error; err != nil {
		return nil, fmt.Errorf("page not found: %w", err)
	}

	resp, err := s.aiEngine.ScrapePageImages(ctx, page.URL)
	if err != nil {
		return nil, fmt.Errorf("scrape failed: %w", err)
	}
	data, ok := resp["data"].([]any)
	if !ok || len(data) == 0 {
		return nil, fmt.Errorf("no images found on page")
	}

	idx := rand.Intn(len(data))
	imgMap, _ := data[idx].(map[string]any)
	article.FeaturedImageURL = getStr(imgMap, "url")
	s.articleRepo.Update(ctx, article)
	return article, nil
}

func (s *articleServiceImpl) ScrapePageImagesForArticle(ctx context.Context, id uuid.UUID) ([]map[string]any, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if article.KeywordID == nil {
		return nil, fmt.Errorf("article has no keyword")
	}
	keyword, err := s.keywordRepo.GetByID(ctx, *article.KeywordID)
	if err != nil || keyword.PageID == nil {
		return nil, fmt.Errorf("keyword has no page")
	}
	var page models.SitePage
	if err := s.db.WithContext(ctx).First(&page, *keyword.PageID).Error; err != nil {
		return nil, err
	}
	resp, err := s.aiEngine.ScrapePageImages(ctx, page.URL)
	if err != nil {
		return nil, err
	}
	data, ok := resp["data"].([]any)
	if !ok {
		return nil, fmt.Errorf("no images")
	}
	result := make([]map[string]any, 0, len(data))
	for _, item := range data {
		if m, ok := item.(map[string]any); ok {
			result = append(result, m)
		}
	}
	return result, nil
}

func (s *articleServiceImpl) SetFeaturedImage(ctx context.Context, id uuid.UUID, imageURL string) (*models.Article, error) {
	article, err := s.articleRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	article.FeaturedImageURL = imageURL
	if err := s.articleRepo.Update(ctx, article); err != nil {
		return nil, err
	}
	return article, nil
}

func countWords(s string) int {
	count := 0
	inWord := false
	for _, r := range s {
		if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
			inWord = false
		} else if !inWord {
			inWord = true
			count++
		}
	}
	return count
}

func (s *articleServiceImpl) saveVersion(article *models.Article, action string) {
	version := models.ArticleVersion{
		ArticleID: article.ID,
		Version:   article.ContentVersion,
		Title:     article.Title,
		Content:   article.Content,
		WordCount: article.WordCount,
		Action:    action,
	}
	s.db.Create(&version)
}

func (s *articleServiceImpl) GetVersions(ctx context.Context, id uuid.UUID) ([]models.ArticleVersion, error) {
	var versions []models.ArticleVersion
	err := s.db.WithContext(ctx).Where("article_id = ?", id).Order("version DESC").Find(&versions).Error
	return versions, err
}

func getStr(m map[string]any, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getInt(m map[string]any, key string) int {
	if v, ok := m[key]; ok {
		if f, ok := v.(float64); ok {
			return int(f)
		}
	}
	return 0
}
