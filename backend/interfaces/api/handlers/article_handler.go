package handlers

import (
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/services"
	"seo-agents-backend/pkg/utils"
)

type ArticleHandler struct {
	articleService services.ArticleService
	aiEngine       ports.AIEnginePort
}

func NewArticleHandler(articleService services.ArticleService, aiEngine ports.AIEnginePort) *ArticleHandler {
	return &ArticleHandler{articleService: articleService, aiEngine: aiEngine}
}

func (h *ArticleHandler) Generate(c *fiber.Ctx) error {
	var req dto.GenerateArticleRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequestResponse(c, "Invalid request body")
	}
	if req.SiteID == "" || req.KeywordID == "" {
		return utils.BadRequestResponse(c, "siteId and keywordId are required")
	}

	article, err := h.articleService.Generate(c.UserContext(), &req)
	if err != nil {
		slog.Error("Generate article failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.CreatedResponse(c, dto.ArticleToResponse(article))
}

func (h *ArticleHandler) ScrapePageImages(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	images, err := h.articleService.ScrapePageImagesForArticle(c.UserContext(), id)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, images)
}

func (h *ArticleHandler) SetFeaturedImage(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	var body struct {
		ImageURL string `json:"imageUrl"`
	}
	if err := c.BodyParser(&body); err != nil || body.ImageURL == "" {
		return utils.BadRequestResponse(c, "imageUrl is required")
	}
	article, err := h.articleService.SetFeaturedImage(c.UserContext(), id, body.ImageURL)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, dto.ArticleToResponse(article))
}

func (h *ArticleHandler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return utils.BadRequestResponse(c, "file is required")
	}
	altText := c.FormValue("alt_text", "")

	f, err := file.Open()
	if err != nil {
		return utils.BadRequestResponse(c, "failed to read file")
	}
	defer f.Close()

	fileData := make([]byte, file.Size)
	if _, err := f.Read(fileData); err != nil {
		return utils.BadRequestResponse(c, "failed to read file data")
	}

	result, err := h.aiEngine.UploadFile(c.UserContext(), fileData, file.Filename, altText)
	if err != nil {
		slog.Error("Upload file failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.SuccessResponse(c, result["data"])
}

func (h *ArticleHandler) UpdateContent(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}

	var req dto.UpdateContentRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequestResponse(c, "Invalid request body")
	}

	article, err := h.articleService.UpdateContent(c.UserContext(), id, &req)
	if err != nil {
		slog.Error("Update content failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.SuccessResponse(c, dto.ArticleToResponse(article))
}

func (h *ArticleHandler) GetVersions(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	versions, err := h.articleService.GetVersions(c.UserContext(), id)
	if err != nil {
		return utils.InternalErrorResponse(c, "Failed to get versions")
	}
	return utils.SuccessResponse(c, versions)
}

func (h *ArticleHandler) DeleteImage(c *fiber.Ctx) error {
	articleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	imageID, err := uuid.Parse(c.Params("imageId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid image ID")
	}
	if err := h.articleService.DeleteImage(c.UserContext(), articleID, imageID); err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, nil)
}

func (h *ArticleHandler) DeleteArticle(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	if err := h.articleService.DeleteArticleFull(c.UserContext(), id); err != nil {
		return utils.InternalErrorResponse(c, "Failed to delete article")
	}
	slog.Info("Article deleted (DB + WP)", "article_id", id)
	return utils.SuccessResponse(c, nil)
}

func (h *ArticleHandler) GetImages(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	images, err := h.articleService.GetImages(c.UserContext(), id)
	if err != nil {
		return utils.InternalErrorResponse(c, "Failed to get images")
	}
	return utils.SuccessResponse(c, images)
}

func (h *ArticleHandler) SearchImages(c *fiber.Ctx) error {
	var body struct {
		Keyword string `json:"keyword"`
		Count   int    `json:"count"`
	}
	c.BodyParser(&body)
	if body.Count <= 0 {
		body.Count = 10
	}
	if body.Keyword == "" {
		return utils.BadRequestResponse(c, "keyword is required")
	}
	result, err := h.articleService.SearchImages(c.UserContext(), body.Keyword, body.Count)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, result)
}

func (h *ArticleHandler) UploadSelectedImages(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	var body struct {
		Images []map[string]any `json:"images"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.Images) == 0 {
		return utils.BadRequestResponse(c, "images are required")
	}
	result, err := h.articleService.UploadSelectedImages(c.UserContext(), id, body.Images)
	if err != nil {
		slog.Error("Upload images failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, result)
}

func (h *ArticleHandler) FindImages(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}
	var body struct {
		Count int `json:"count"`
	}
	c.BodyParser(&body)
	if body.Count <= 0 {
		body.Count = 3
	}
	result, err := h.articleService.FindImages(c.UserContext(), id, body.Count)
	if err != nil {
		slog.Error("Find images failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, result)
}

func (h *ArticleHandler) GenerateImages(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}

	var body struct {
		Count int `json:"count"`
	}
	c.BodyParser(&body)
	if body.Count <= 0 {
		body.Count = 2
	}

	result, err := h.articleService.GenerateImages(c.UserContext(), id, body.Count)
	if err != nil {
		slog.Error("Generate images failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, result)
}

func (h *ArticleHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}

	article, err := h.articleService.GetByID(c.UserContext(), id)
	if err != nil {
		return utils.NotFoundResponse(c, "Article not found")
	}

	return utils.SuccessResponse(c, dto.ArticleToResponse(article))
}

func (h *ArticleHandler) GetBySiteID(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	articles, err := h.articleService.GetBySiteID(c.UserContext(), siteID)
	if err != nil {
		return utils.InternalErrorResponse(c, "Failed to get articles")
	}

	return utils.SuccessResponse(c, dto.ArticlesToResponse(articles))
}

func (h *ArticleHandler) FetchMetrics(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}

	metrics, err := h.articleService.FetchMetrics(c.UserContext(), id)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.SuccessResponse(c, metrics)
}

func (h *ArticleHandler) RunOptimizer(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}

	result, err := h.articleService.RunOptimizer(c.UserContext(), id)
	if err != nil {
		slog.Error("Optimizer failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.SuccessResponse(c, result)
}

func (h *ArticleHandler) Publish(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid article ID")
	}

	article, err := h.articleService.Publish(c.UserContext(), id)
	if err != nil {
		slog.Error("Publish failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.SuccessResponse(c, dto.ArticleToResponse(article))
}
