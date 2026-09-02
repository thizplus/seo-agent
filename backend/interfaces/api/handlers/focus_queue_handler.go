package handlers

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/pkg/utils"
)

type FocusQueueHandler struct {
	queueRepo repositories.FocusQueueRepository
	siteRepo  repositories.SiteRepository
}

func NewFocusQueueHandler(queueRepo repositories.FocusQueueRepository, siteRepo repositories.SiteRepository) *FocusQueueHandler {
	return &FocusQueueHandler{queueRepo: queueRepo, siteRepo: siteRepo}
}

func (h *FocusQueueHandler) GetQueue(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	items, err := h.queueRepo.GetBySiteID(c.UserContext(), siteID)
	if err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถดึงข้อมูลคิวได้")
	}
	return utils.SuccessResponse(c, items)
}

func (h *FocusQueueHandler) AddItem(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	var body struct {
		Priority          int    `json:"priority"`
		PillarURL         string `json:"pillarUrl"`
		PrimaryKeyword    string `json:"primaryKeyword"`
		SecondaryKeywords string `json:"secondaryKeywords"`
		CustomPrompt      string `json:"customPrompt"`
	}
	if err := c.BodyParser(&body); err != nil || body.PrimaryKeyword == "" {
		return utils.BadRequestResponse(c, "กรุณาระบุ keyword หลัก")
	}

	item := &models.KeywordFocusQueue{
		SiteID:            siteID,
		Priority:          body.Priority,
		PillarURL:         body.PillarURL,
		PrimaryKeyword:    body.PrimaryKeyword,
		SecondaryKeywords: body.SecondaryKeywords,
		CustomPrompt:      body.CustomPrompt,
		Status:            "pending",
	}
	if err := h.queueRepo.Create(c.UserContext(), item); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "idx_site_primary_kw") {
			return utils.BadRequestResponse(c, "keyword นี้มีอยู่ในคิวแล้ว")
		}
		return utils.InternalErrorResponse(c, "ไม่สามารถเพิ่มได้")
	}

	slog.Info("FocusQueue: item added", "site_id", siteID, "keyword", body.PrimaryKeyword)
	return utils.CreatedResponse(c, item)
}

func (h *FocusQueueHandler) ImportItems(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	var body struct {
		Keywords []struct {
			Priority          int    `json:"priority"`
			PillarURL         string `json:"pillarUrl"`
			PrimaryKeyword    string `json:"primaryKeyword"`
			SecondaryKeywords string `json:"secondaryKeywords"`
			CustomPrompt      string `json:"customPrompt"`
		} `json:"keywords"`
	}
	if err := c.BodyParser(&body); err != nil || len(body.Keywords) == 0 {
		return utils.BadRequestResponse(c, "กรุณาระบุ keywords")
	}

	items := make([]models.KeywordFocusQueue, 0, len(body.Keywords))
	for i, kw := range body.Keywords {
		if kw.PrimaryKeyword == "" {
			continue
		}
		priority := kw.Priority
		if priority == 0 {
			priority = i + 1
		}
		items = append(items, models.KeywordFocusQueue{
			ID:                uuid.New(),
			SiteID:            siteID,
			Priority:          priority,
			PillarURL:         kw.PillarURL,
			PrimaryKeyword:    kw.PrimaryKeyword,
			SecondaryKeywords: kw.SecondaryKeywords,
			CustomPrompt:      kw.CustomPrompt,
			Status:            "pending",
		})
	}

	if len(items) == 0 {
		return utils.BadRequestResponse(c, "ไม่มี keyword ที่ valid")
	}

	if err := h.queueRepo.CreateBatch(c.UserContext(), items); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return utils.BadRequestResponse(c, "มี keyword ซ้ำกับที่อยู่ในคิวแล้ว")
		}
		return utils.InternalErrorResponse(c, "ไม่สามารถ import ได้: "+err.Error())
	}

	slog.Info("FocusQueue: imported", "site_id", siteID, "count", len(items))
	return utils.CreatedResponse(c, fiber.Map{"imported": len(items)})
}

func (h *FocusQueueHandler) UpdateItem(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	queueID, err := uuid.Parse(c.Params("queueId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid queue ID")
	}

	items, err := h.queueRepo.GetBySiteID(c.UserContext(), siteID)
	if err != nil {
		return utils.NotFoundResponse(c, "ไม่พบคิว")
	}

	var target *models.KeywordFocusQueue
	for i := range items {
		if items[i].ID == queueID {
			target = &items[i]
			break
		}
	}
	if target == nil {
		return utils.NotFoundResponse(c, "ไม่พบ item")
	}

	var body struct {
		Priority          *int    `json:"priority"`
		PillarURL         *string `json:"pillarUrl"`
		PrimaryKeyword    *string `json:"primaryKeyword"`
		SecondaryKeywords *string `json:"secondaryKeywords"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequestResponse(c, "Invalid request")
	}

	if body.Priority != nil {
		target.Priority = *body.Priority
	}
	if body.PillarURL != nil {
		target.PillarURL = *body.PillarURL
	}
	if body.PrimaryKeyword != nil && *body.PrimaryKeyword != "" {
		target.PrimaryKeyword = *body.PrimaryKeyword
	}
	if body.SecondaryKeywords != nil {
		target.SecondaryKeywords = *body.SecondaryKeywords
	}

	if err := h.queueRepo.Update(c.UserContext(), target); err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถอัปเดตได้")
	}
	return utils.SuccessResponse(c, target)
}

func (h *FocusQueueHandler) DeleteItem(c *fiber.Ctx) error {
	queueID, err := uuid.Parse(c.Params("queueId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid queue ID")
	}
	if err := h.queueRepo.Delete(c.UserContext(), queueID); err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถลบได้")
	}
	return utils.SuccessResponse(c, nil)
}

func (h *FocusQueueHandler) SkipItem(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	queueID, err := uuid.Parse(c.Params("queueId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid queue ID")
	}

	items, _ := h.queueRepo.GetBySiteID(c.UserContext(), siteID)
	for i := range items {
		if items[i].ID == queueID {
			items[i].Status = "skipped"
			h.queueRepo.Update(c.UserContext(), &items[i])
			return utils.SuccessResponse(c, items[i])
		}
	}
	return utils.NotFoundResponse(c, "ไม่พบ item")
}

func (h *FocusQueueHandler) RetryItem(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	queueID, err := uuid.Parse(c.Params("queueId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid queue ID")
	}

	items, _ := h.queueRepo.GetBySiteID(c.UserContext(), siteID)
	for i := range items {
		if items[i].ID == queueID {
			items[i].Status = "pending"
			items[i].RetryCount = 0
			items[i].ErrorMessage = ""
			h.queueRepo.Update(c.UserContext(), &items[i])
			return utils.SuccessResponse(c, items[i])
		}
	}
	return utils.NotFoundResponse(c, "ไม่พบ item")
}

func (h *FocusQueueHandler) ResetQueue(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	if err := h.queueRepo.ResetAll(c.UserContext(), siteID); err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถ reset ได้")
	}
	slog.Info("FocusQueue: reset", "site_id", siteID)
	return utils.SuccessResponse(c, fiber.Map{"message": "Reset สำเร็จ"})
}

func (h *FocusQueueHandler) GetStatus(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	total, completed, pending, failed, skipped, err := h.queueRepo.GetStatus(c.UserContext(), siteID)
	if err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถดึงสถานะได้")
	}

	progress := "0%"
	if total > 0 {
		progress = fmt.Sprintf("%d%%", completed*100/total)
	}

	result := fiber.Map{
		"total":             total,
		"completed":         completed,
		"pending":           pending,
		"failed":            failed,
		"skipped":           skipped,
		"progress":          progress,
		"estimatedDaysLeft": pending + failed,
	}

	// หา keyword ถัดไป
	nextItem, err := h.queueRepo.GetNextPending(c.UserContext(), siteID)
	if err == nil && nextItem != nil {
		result["nextKeyword"] = fiber.Map{
			"priority":          nextItem.Priority,
			"primaryKeyword":    nextItem.PrimaryKeyword,
			"secondaryKeywords": nextItem.SecondaryKeywords,
		}
	}

	return utils.SuccessResponse(c, result)
}
