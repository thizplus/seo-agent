package handlers

import (
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/pkg/utils"
)

type GSCHandler struct {
	siteRepo    repositories.SiteRepository
	googleOAuth ports.GoogleOAuthPort
	frontendURL string
	gscRedirect string
}

func NewGSCHandler(siteRepo repositories.SiteRepository, googleOAuth ports.GoogleOAuthPort, frontendURL, gscRedirectURI string) *GSCHandler {
	return &GSCHandler{siteRepo: siteRepo, googleOAuth: googleOAuth, frontendURL: frontendURL, gscRedirect: gscRedirectURI}
}

func (h *GSCHandler) Connect(c *fiber.Ctx) error {
	siteID := c.Params("id")
	if _, err := uuid.Parse(siteID); err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}

	state := utils.GenerateRandomString(32)
	c.Cookie(&fiber.Cookie{Name: "gsc_oauth_state", Value: state, HTTPOnly: true, SameSite: "Lax", MaxAge: 300})
	c.Cookie(&fiber.Cookie{Name: "gsc_site_id", Value: siteID, HTTPOnly: true, SameSite: "Lax", MaxAge: 300})

	oauthURL := h.googleOAuth.GetAuthURL(state, h.gscRedirect, "https://www.googleapis.com/auth/webmasters.readonly")
	return c.Redirect(oauthURL, fiber.StatusTemporaryRedirect)
}

func (h *GSCHandler) Callback(c *fiber.Ctx) error {
	code := c.Query("code")
	state := c.Query("state")
	siteID := c.Cookies("gsc_site_id")
	savedState := c.Cookies("gsc_oauth_state")

	// ลบ cookies
	for _, name := range []string{"gsc_oauth_state", "gsc_site_id"} {
		c.Cookie(&fiber.Cookie{Name: name, Value: "", MaxAge: -1, HTTPOnly: true})
	}

	if code == "" || savedState == "" || savedState != state || siteID == "" {
		return c.Redirect(h.frontendURL+"/dashboard/sites/"+siteID+"?gsc=error", fiber.StatusTemporaryRedirect)
	}

	tokenResp, err := h.googleOAuth.ExchangeCode(code, h.gscRedirect)
	if err != nil || tokenResp.RefreshToken == "" {
		slog.Error("GSC token exchange failed", "error", err)
		return c.Redirect(h.frontendURL+"/dashboard/sites/"+siteID+"?gsc=error", fiber.StatusTemporaryRedirect)
	}

	id, _ := uuid.Parse(siteID)
	site, err := h.siteRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return c.Redirect(h.frontendURL+"/dashboard/sites/"+siteID+"?gsc=error", fiber.StatusTemporaryRedirect)
	}

	site.GSCRefreshToken = tokenResp.RefreshToken
	h.siteRepo.Update(c.UserContext(), site)

	slog.Info("GSC connected", "site_id", siteID)
	return c.Redirect(h.frontendURL+"/dashboard/sites/"+siteID+"?gsc=connected", fiber.StatusTemporaryRedirect)
}

func (h *GSCHandler) Properties(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	site, err := h.siteRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return utils.NotFoundResponse(c, "Site not found")
	}
	if site.GSCRefreshToken == "" {
		return utils.BadRequestResponse(c, "GSC not connected")
	}

	accessToken, err := h.googleOAuth.RefreshAccessToken(site.GSCRefreshToken)
	if err != nil {
		return utils.BadRequestResponse(c, "Failed to refresh GSC token: "+err.Error())
	}

	properties, err := h.googleOAuth.FetchGSCProperties(accessToken)
	if err != nil {
		return utils.BadRequestResponse(c, "Failed to fetch properties: "+err.Error())
	}

	propMaps := make([]map[string]string, 0, len(properties))
	for _, p := range properties {
		propMaps = append(propMaps, map[string]string{"siteUrl": p.SiteURL, "permission": p.Permission})
	}

	return utils.SuccessResponse(c, fiber.Map{"properties": propMaps, "selectedUrl": site.GSCSiteURL})
}

func (h *GSCHandler) SelectProperty(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	var body struct {
		SiteURL string `json:"siteUrl"`
	}
	if err := c.BodyParser(&body); err != nil || body.SiteURL == "" {
		return utils.BadRequestResponse(c, "siteUrl is required")
	}
	site, err := h.siteRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return utils.NotFoundResponse(c, "Site not found")
	}
	site.GSCSiteURL = body.SiteURL
	h.siteRepo.Update(c.UserContext(), site)
	return utils.SuccessResponse(c, fiber.Map{"gscSiteUrl": body.SiteURL})
}

func (h *GSCHandler) Disconnect(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.BadRequestResponse(c, "Invalid site ID")
	}
	site, err := h.siteRepo.GetByID(c.UserContext(), id)
	if err != nil {
		return utils.NotFoundResponse(c, "Site not found")
	}
	site.GSCRefreshToken = ""
	site.GSCSiteURL = ""
	h.siteRepo.Update(c.UserContext(), site)
	return utils.SuccessResponse(c, nil)
}
