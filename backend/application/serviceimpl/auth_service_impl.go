package serviceimpl

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/pkg/auth"
)

type authServiceImpl struct {
	userRepo          repositories.UserRepository
	googleClientID    string
	googleClientSecret string
	googleRedirectURL string
}

func NewAuthService(
	userRepo repositories.UserRepository,
	googleClientID string,
	googleClientSecret string,
	googleRedirectURL string,
) *authServiceImpl {
	return &authServiceImpl{
		userRepo:          userRepo,
		googleClientID:    googleClientID,
		googleClientSecret: googleClientSecret,
		googleRedirectURL: googleRedirectURL,
	}
}

func (s *authServiceImpl) GetGoogleOAuthURL(state string) string {
	params := url.Values{}
	params.Add("client_id", s.googleClientID)
	params.Add("redirect_uri", s.googleRedirectURL)
	params.Add("response_type", "code")
	params.Add("scope", "openid email profile")
	params.Add("access_type", "offline")
	params.Add("state", state)

	return fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?%s", params.Encode())
}

func (s *authServiceImpl) LoginOrRegisterWithGoogle(ctx context.Context, googleUser *dto.GoogleUserInfo) (string, *models.User, error) {
	// 1. ค้นหาจาก Google ID
	user, err := s.userRepo.GetByGoogleID(ctx, googleUser.ID)
	if err == nil && user != nil {
		// อัพเดทข้อมูลจาก Google ทุกครั้ง (ชื่อ/รูป/email อาจเปลี่ยน)
		user.Email = googleUser.Email
		user.Name = googleUser.Name
		user.AvatarURL = googleUser.Picture
		_ = s.userRepo.Update(ctx, user)

		token, err := auth.GenerateToken(user.ID, user.Email)
		if err != nil {
			return "", nil, err
		}
		slog.InfoContext(ctx, "Google login successful", "user_id", user.ID)
		return token, user, nil
	}

	// 2. ค้นหาจาก email — link Google account
	existingUser, _ := s.userRepo.GetByEmail(ctx, googleUser.Email)
	if existingUser != nil {
		existingUser.GoogleID = googleUser.ID
		if existingUser.AvatarURL == "" && googleUser.Picture != "" {
			existingUser.AvatarURL = googleUser.Picture
		}
		if err := s.userRepo.Update(ctx, existingUser); err != nil {
			return "", nil, err
		}

		token, err := auth.GenerateToken(existingUser.ID, existingUser.Email)
		if err != nil {
			return "", nil, err
		}
		slog.InfoContext(ctx, "Google account linked", "user_id", existingUser.ID)
		return token, existingUser, nil
	}

	// 3. สร้าง user ใหม่
	username := strings.Split(googleUser.Email, "@")[0]
	user = &models.User{
		GoogleID:  googleUser.ID,
		Email:     googleUser.Email,
		Name:      googleUser.Name,
		AvatarURL: googleUser.Picture,
		Provider:  "google",
	}
	if user.Name == "" {
		user.Name = username
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		slog.ErrorContext(ctx, "Failed to create user", "error", err)
		return "", nil, err
	}

	token, err := auth.GenerateToken(user.ID, user.Email)
	if err != nil {
		return "", nil, err
	}

	slog.InfoContext(ctx, "New user registered via Google", "user_id", user.ID, "email", user.Email)
	return token, user, nil
}

func (s *authServiceImpl) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}
