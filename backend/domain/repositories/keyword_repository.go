package repositories

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/models"
)

type KeywordRepository interface {
	Create(ctx context.Context, keyword *models.Keyword) error
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Keyword, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Keyword, error)
	Update(ctx context.Context, keyword *models.Keyword) error
}
