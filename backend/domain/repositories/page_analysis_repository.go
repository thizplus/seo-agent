package repositories

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/models"
)

type PageAnalysisRepository interface {
	Create(ctx context.Context, analysis *models.PageAnalysis) error
	GetLatestByPageID(ctx context.Context, pageID uuid.UUID) (*models.PageAnalysis, error)
}

type SerpHistoryRepository interface {
	Create(ctx context.Context, history *models.KeywordSerpHistory) error
	GetLatestByKeywordID(ctx context.Context, keywordID uuid.UUID) (*models.KeywordSerpHistory, error)
	GetByKeywordIDDateRange(ctx context.Context, keywordID uuid.UUID, days int) ([]models.KeywordSerpHistory, error)
}
