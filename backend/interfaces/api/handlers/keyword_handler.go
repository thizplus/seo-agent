package handlers

import (
	"encoding/json"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/domain/services"
	"seo-agents-backend/pkg/utils"
)

type KeywordHandler struct {
	keywordService services.KeywordService
	keywordRepo    repositories.KeywordRepository
	siteRepo       repositories.SiteRepository
	aiEngine       ports.AIEnginePort
}

func NewKeywordHandler(
	keywordService services.KeywordService,
	keywordRepo repositories.KeywordRepository,
	siteRepo repositories.SiteRepository,
	aiEngine ports.AIEnginePort,
) *KeywordHandler {
	return &KeywordHandler{
		keywordService: keywordService,
		keywordRepo:    keywordRepo,
		siteRepo:       siteRepo,
		aiEngine:       aiEngine,
	}
}

func (h *KeywordHandler) Create(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	var req dto.CreateKeywordRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequestResponse(c, "Invalid request body")
	}
	if req.Keyword == "" {
		return utils.BadRequestResponse(c, "keyword is required")
	}

	keyword, err := h.keywordService.Create(c.UserContext(), siteID, &req)
	if err != nil {
		slog.Error("Create keyword failed", "error", err)
		return utils.BadRequestResponse(c, err.Error())
	}

	return utils.CreatedResponse(c, dto.KeywordToResponse(keyword))
}

func (h *KeywordHandler) GetBySiteID(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	keywords, err := h.keywordService.GetBySiteID(c.UserContext(), siteID)
	if err != nil {
		return utils.InternalErrorResponse(c, "Failed to get keywords")
	}

	return utils.SuccessResponse(c, dto.KeywordsToResponse(keywords))
}

func (h *KeywordHandler) AnalyzeSERP(c *fiber.Ctx) error {
	kwID, err := uuid.Parse(c.Params("kwId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid keyword ID")
	}

	keyword, err := h.keywordRepo.GetByID(c.UserContext(), kwID)
	if err != nil {
		return utils.NotFoundResponse(c, "Keyword not found")
	}

	site, err := h.siteRepo.GetByID(c.UserContext(), keyword.SiteID)
	if err != nil {
		return utils.NotFoundResponse(c, "Site not found")
	}

	// Fetch SERP data
	serpData, err := h.aiEngine.AnalyzeSERP(c.UserContext(), keyword.Keyword)
	if err != nil {
		return utils.BadRequestResponse(c, "SERP analysis failed: "+err.Error())
	}

	// Save to keyword
	if b, err := json.Marshal(serpData); err == nil {
		keyword.SERPData = b
		h.keywordRepo.Update(c.UserContext(), keyword)
	}

	_ = site
	slog.Info("SERP analyzed", "keyword", keyword.Keyword)
	return utils.SuccessResponse(c, serpData)
}
