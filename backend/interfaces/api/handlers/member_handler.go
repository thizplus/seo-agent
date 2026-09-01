package handlers

import (
	"log/slog"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/pkg/utils"
)

type MemberHandler struct {
	memberRepo repositories.SiteMemberRepository
	siteRepo   repositories.SiteRepository
	userRepo   repositories.UserRepository
}

func NewMemberHandler(memberRepo repositories.SiteMemberRepository, siteRepo repositories.SiteRepository, userRepo repositories.UserRepository) *MemberHandler {
	return &MemberHandler{memberRepo: memberRepo, siteRepo: siteRepo, userRepo: userRepo}
}

func (h *MemberHandler) GetMembers(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	userID, _ := uuid.Parse(c.Locals("userId").(string))

	site, err := h.siteRepo.GetByID(c.UserContext(), siteID)
	if err != nil {
		return utils.NotFoundResponse(c, "ไม่พบเว็บไซต์")
	}
	if site.UserID != userID {
		return utils.UnauthorizedResponse(c, "เฉพาะเจ้าของเว็บไซต์เท่านั้น")
	}

	owner, _ := h.userRepo.GetByID(c.UserContext(), site.UserID)
	ownerEmail := ""
	if owner != nil {
		ownerEmail = owner.Email
	}

	members, err := h.memberRepo.GetBySiteID(c.UserContext(), siteID)
	if err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถดึงข้อมูลสมาชิกได้")
	}

	result := make([]fiber.Map, 0, len(members)+1)
	result = append(result, fiber.Map{
		"id":     site.UserID,
		"siteId": siteID,
		"email":  ownerEmail,
		"role":   "owner",
		"joined": true,
	})

	for _, m := range members {
		result = append(result, fiber.Map{
			"id":        m.ID,
			"siteId":    m.SiteID,
			"email":     m.Email,
			"role":      m.Role,
			"joined":    m.UserID != nil,
			"createdAt": m.CreatedAt,
		})
	}

	return utils.SuccessResponse(c, result)
}

func (h *MemberHandler) AddMember(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	userID, _ := uuid.Parse(c.Locals("userId").(string))

	site, err := h.siteRepo.GetByID(c.UserContext(), siteID)
	if err != nil {
		return utils.NotFoundResponse(c, "ไม่พบเว็บไซต์")
	}
	if site.UserID != userID {
		return utils.UnauthorizedResponse(c, "เฉพาะเจ้าของเว็บไซต์เท่านั้น")
	}

	var body struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&body); err != nil || body.Email == "" {
		return utils.BadRequestResponse(c, "กรุณาระบุอีเมล")
	}

	owner, _ := h.userRepo.GetByID(c.UserContext(), site.UserID)
	if owner != nil && owner.Email == body.Email {
		return utils.BadRequestResponse(c, "ไม่สามารถเพิ่มตัวเองได้")
	}

	// ถ้า user เคย login แล้ว link user_id ให้เลย
	var linkedUserID *uuid.UUID
	existingUser, err := h.userRepo.GetByEmail(c.UserContext(), body.Email)
	if err == nil && existingUser != nil && existingUser.ID != uuid.Nil {
		linkedUserID = &existingUser.ID
	}

	member := &models.SiteMember{
		SiteID:    siteID,
		Email:     body.Email,
		UserID:    linkedUserID,
		Role:      "editor",
		InvitedBy: userID,
	}

	if err := h.memberRepo.Create(c.UserContext(), member); err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "idx_site_email") {
			return utils.BadRequestResponse(c, "อีเมลนี้ถูกเพิ่มแล้ว")
		}
		return utils.InternalErrorResponse(c, "ไม่สามารถเพิ่มสมาชิกได้")
	}

	slog.Info("Member added", "site_id", siteID, "email", body.Email, "invited_by", userID)

	return utils.CreatedResponse(c, fiber.Map{
		"id":     member.ID,
		"siteId": member.SiteID,
		"email":  member.Email,
		"role":   member.Role,
		"joined": linkedUserID != nil,
	})
}

func (h *MemberHandler) RemoveMember(c *fiber.Ctx) error {
	siteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	memberID, err := uuid.Parse(c.Params("memberId"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid member ID")
	}
	userID, _ := uuid.Parse(c.Locals("userId").(string))

	site, err := h.siteRepo.GetByID(c.UserContext(), siteID)
	if err != nil {
		return utils.NotFoundResponse(c, "ไม่พบเว็บไซต์")
	}
	if site.UserID != userID {
		return utils.UnauthorizedResponse(c, "เฉพาะเจ้าของเว็บไซต์เท่านั้น")
	}

	if err := h.memberRepo.Delete(c.UserContext(), memberID); err != nil {
		return utils.InternalErrorResponse(c, "ไม่สามารถลบสมาชิกได้")
	}

	slog.Info("Member removed", "site_id", siteID, "member_id", memberID)
	return utils.SuccessResponse(c, nil)
}
