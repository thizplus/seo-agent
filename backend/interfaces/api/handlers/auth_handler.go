package handlers

import (
	"log/slog"
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/services"
	"seo-agents-backend/pkg/utils"
)

type AuthHandler struct {
	authService  services.AuthService
	googleOAuth  ports.GoogleOAuthPort
	frontendURL  string
	redirectURI  string
	cookieDomain string
}

func NewAuthHandler(authService services.AuthService, googleOAuth ports.GoogleOAuthPort, frontendURL, redirectURI, cookieDomain string) *AuthHandler {
	return &AuthHandler{
		authService: authService, googleOAuth: googleOAuth,
		frontendURL: frontendURL, redirectURI: redirectURI,
		cookieDomain: cookieDomain,
	}
}

func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	state := utils.GenerateRandomString(32)
	c.Cookie(&fiber.Cookie{
		Name: "oauth_state", Value: state, HTTPOnly: true,
		SameSite: "None", Secure: true, Domain: h.cookieDomain, MaxAge: 300,
	})

	oauthURL := h.googleOAuth.GetAuthURL(state, h.redirectURI, "openid email profile")
	return c.Redirect(oauthURL, fiber.StatusTemporaryRedirect)
}

func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	if errorParam != "" || code == "" {
		return c.Redirect(h.frontendURL+"/login?error="+url.QueryEscape(errorParam), fiber.StatusTemporaryRedirect)
	}

	savedState := c.Cookies("oauth_state")
	if savedState == "" || savedState != state {
		return c.Redirect(h.frontendURL+"/login?error=invalid_state", fiber.StatusTemporaryRedirect)
	}
	c.Cookie(&fiber.Cookie{Name: "oauth_state", Value: "", MaxAge: -1, HTTPOnly: true, SameSite: "None", Secure: true, Domain: h.cookieDomain})

	tokenResp, err := h.googleOAuth.ExchangeCode(code, h.redirectURI)
	if err != nil {
		slog.Error("Token exchange failed", "error", err)
		return c.Redirect(h.frontendURL+"/login?error=token_exchange_failed", fiber.StatusTemporaryRedirect)
	}

	googleUser, err := h.googleOAuth.GetUserInfo(tokenResp.AccessToken)
	if err != nil {
		return c.Redirect(h.frontendURL+"/login?error=user_info_failed", fiber.StatusTemporaryRedirect)
	}

	gUser := &dto.GoogleUserInfo{ID: googleUser.ID, Email: googleUser.Email, Name: googleUser.Name, Picture: googleUser.Picture}
	token, user, err := h.authService.LoginOrRegisterWithGoogle(c.UserContext(), gUser)
	if err != nil {
		return c.Redirect(h.frontendURL+"/login?error="+url.QueryEscape(err.Error()), fiber.StatusTemporaryRedirect)
	}

	slog.Info("Google auth successful", "user_id", user.ID)
	return c.Redirect(h.frontendURL+"/auth/google/callback?token="+url.QueryEscape(token)+"&user_id="+user.ID.String(), fiber.StatusTemporaryRedirect)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userIDStr := c.Locals("userId").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return utils.UnauthorizedResponse(c, "Invalid user")
	}
	user, err := h.authService.GetUserByID(c.UserContext(), userID)
	if err != nil {
		return utils.NotFoundResponse(c, "User not found")
	}
	return utils.SuccessResponse(c, dto.UserToResponse(user))
}
