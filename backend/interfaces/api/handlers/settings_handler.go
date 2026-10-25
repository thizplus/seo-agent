package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"

	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/pkg/utils"
)

type SettingsHandler struct {
	settingRepo repositories.SystemSettingRepository
}

func NewSettingsHandler(settingRepo repositories.SystemSettingRepository) *SettingsHandler {
	return &SettingsHandler{settingRepo: settingRepo}
}

type AutoPublishSettings struct {
	Enabled bool   `json:"enabled"`
	Days    []int  `json:"days"` // 0=Sunday, 1=Monday, ..., 6=Saturday
	Time    string `json:"time"` // "09:00"
}

func (h *SettingsHandler) GetAutoPublish(c *fiber.Ctx) error {
	setting, err := h.settingRepo.Get(c.UserContext(), "auto_publish")
	if err != nil {
		return utils.SuccessResponse(c, AutoPublishSettings{
			Enabled: false,
			Days:    []int{},
			Time:    "09:00",
		})
	}

	var result AutoPublishSettings
	json.Unmarshal([]byte(setting.Value), &result)
	return utils.SuccessResponse(c, result)
}

func (h *SettingsHandler) UpdateAutoPublish(c *fiber.Ctx) error {
	var req AutoPublishSettings
	if err := c.BodyParser(&req); err != nil {
		return utils.BadRequestResponse(c, "Invalid request body")
	}

	if req.Time == "" {
		req.Time = "09:00"
	}

	for _, d := range req.Days {
		if d < 0 || d > 6 {
			return utils.BadRequestResponse(c, "Invalid day value (must be 0-6)")
		}
	}

	value, _ := json.Marshal(req)
	if err := h.settingRepo.Set(c.UserContext(), "auto_publish", string(value)); err != nil {
		return utils.InternalErrorResponse(c, "Failed to save settings")
	}

	return utils.SuccessResponse(c, req)
}
