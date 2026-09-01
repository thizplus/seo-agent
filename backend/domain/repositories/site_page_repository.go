package repositories

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/models"
)

type SitePageRepository interface {
	Create(ctx context.Context, page *models.SitePage) error
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.SitePage, error)
	GetByURL(ctx context.Context, siteID uuid.UUID, url string) (*models.SitePage, error)
	Update(ctx context.Context, page *models.SitePage) error
}
