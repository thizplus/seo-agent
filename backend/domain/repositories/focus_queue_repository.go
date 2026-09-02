package repositories

import (
	"context"

	"github.com/google/uuid"

	"seo-agents-backend/domain/models"
)

type FocusQueueRepository interface {
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.KeywordFocusQueue, error)
	GetNextPending(ctx context.Context, siteID uuid.UUID) (*models.KeywordFocusQueue, error)
	Create(ctx context.Context, item *models.KeywordFocusQueue) error
	CreateBatch(ctx context.Context, items []models.KeywordFocusQueue) error
	Update(ctx context.Context, item *models.KeywordFocusQueue) error
	Delete(ctx context.Context, id uuid.UUID) error
	ResetAll(ctx context.Context, siteID uuid.UUID) error
	GetStatus(ctx context.Context, siteID uuid.UUID) (total, completed, pending, failed, skipped int, err error)
}
