package repositories

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/models"
)

type SiteRepository interface {
	Create(ctx context.Context, site *models.Site) error
	GetAll(ctx context.Context) ([]models.Site, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Site, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Site, error)
	Update(ctx context.Context, site *models.Site) error
	Delete(ctx context.Context, id uuid.UUID) error
}
