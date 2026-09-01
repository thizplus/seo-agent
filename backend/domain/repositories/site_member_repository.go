package repositories

import (
	"context"

	"github.com/google/uuid"

	"seo-agents-backend/domain/models"
)

type SiteMemberRepository interface {
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.SiteMember, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.SiteMember, error)
	Create(ctx context.Context, member *models.SiteMember) error
	Delete(ctx context.Context, id uuid.UUID) error
	LinkUser(ctx context.Context, email string, userID uuid.UUID) error
	GetSharedSiteIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
}
