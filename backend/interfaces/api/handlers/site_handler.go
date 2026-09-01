package handlers

import (
	"context"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/services"
	"seo-agents-backend/pkg/utils"
)

type SiteHandler struct {
	siteService    services.SiteService
	keywordService services.KeywordService
	articleService services.ArticleService
}

func NewSiteHandler(siteService services.SiteService, keywordService services.KeywordService, articleService services.ArticleService) *SiteHandler {
	return &SiteHandler{siteService: siteService, keywordService: keywordService, articleService: articleService}
}

func (h *SiteHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateSiteRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequestResponse(c, "Invalid request body")
	}
	if req.Name == "" || req.URL == "" {
		return utils.BadRequestResponse(c, "name and url are required")
	}
	userID, err := uuid.Parse(c.Locals("userId").(string))
	if err != nil {
		return utils.UnauthorizedResponse(c, "Invalid user")
	}

	site, err := h.siteService.Create(c.UserContext(), userID, &req)
	if err != nil {
		slog.Error("Create site failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.CreatedResponse(c, dto.SiteToResponse(site))
}

func (h *SiteHandler) GetAll(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userId").(string))
	if err != nil {
		return utils.UnauthorizedResponse(c, "Invalid user")
	}
	sites, err := h.siteService.GetByUserID(c.UserContext(), userID)
	if err != nil {
		return utils.InternalErrorResponse(c, "Failed to get sites")
	}
	return utils.SuccessResponse(c, dto.SitesToResponse(sites))
}

func (h *SiteHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	site, err := h.siteService.GetByID(c.UserContext(), id)
	if err != nil {
		return utils.NotFoundResponse(c, "Site not found")
	}
	return utils.SuccessResponse(c, dto.SiteToResponse(site))
}

func (h *SiteHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	var req dto.UpdateSiteRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequestResponse(c, "Invalid request body")
	}
	site, err := h.siteService.Update(c.UserContext(), id, &req)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, dto.SiteToResponse(site))
}

func (h *SiteHandler) Analyze(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	data, err := h.siteService.AnalyzeSite(c.UserContext(), id)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, data)
}

func (h *SiteHandler) DiscoverKeywords(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	var body struct {
		SeedKeywords []string `json:"seedKeywords"`
	}
	c.BodyParser(&body)

	data, err := h.siteService.DiscoverKeywords(c.UserContext(), id, body.SeedKeywords)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, data)
}

func (h *SiteHandler) CreateCluster(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	var body struct {
		Keywords []string `json:"keywords"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.Keywords) == 0 {
		return utils.BadRequestResponse(c, "keywords are required")
	}
	data, err := h.siteService.CreateCluster(c.UserContext(), id, body.Keywords)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, data)
}

func (h *SiteHandler) AnalyzeCompetitor(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	var body struct {
		CompetitorURL string `json:"competitorUrl"`
	}
	if err := c.BodyParser(&body); err != nil || body.CompetitorURL == "" {
		return utils.BadRequestResponse(c, "competitorUrl is required")
	}
	data, err := h.siteService.AnalyzeCompetitor(c.UserContext(), id, body.CompetitorURL)
	if err != nil {
		return utils.BadRequestResponse(c, err.Error())
	}
	return utils.SuccessResponse(c, data)
}

func (h *SiteHandler) RunPipeline(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	// ตอบ 202 ทันที แล้วทำงานใน background
	go func() {
		ctx := context.Background()
		slog.Info("Pipeline started (background)", "site_id", id)
		_, err := h.siteService.RunPipeline(ctx, id)
		if err != nil {
			slog.Error("Pipeline failed", "site_id", id, "error", err)
		} else {
			slog.Info("Pipeline completed", "site_id", id)
		}
	}()

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"success": true,
		"data":    fiber.Map{"message": "Pipeline กำลังทำงาน กรุณารอสักครู่แล้ว refresh หน้า"},
	})
}

func (h *SiteHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	if err := h.siteService.Delete(c.UserContext(), id); err != nil {
		return utils.InternalErrorResponse(c, "Failed to delete site")
	}
	return utils.SuccessResponse(c, nil)
}
