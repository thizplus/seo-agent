package repositories

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/models"
)

type ArticleRepository interface {
	Create(ctx context.Context, article *models.Article) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Article, error)
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Article, error)
	Update(ctx context.Context, article *models.Article) error
	Delete(ctx context.Context, id uuid.UUID) error
}
