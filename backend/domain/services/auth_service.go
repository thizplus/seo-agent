package services

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
)

type AuthService interface {
	GetGoogleOAuthURL(state string) string
	LoginOrRegisterWithGoogle(ctx context.Context, googleUser *dto.GoogleUserInfo) (string, *models.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}
