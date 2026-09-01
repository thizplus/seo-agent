package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type pageAnalysisRepository struct{ db *gorm.DB }

func NewPageAnalysisRepository(db *gorm.DB) *pageAnalysisRepository {
	return &pageAnalysisRepository{db: db}
}

func (r *pageAnalysisRepository) Create(ctx context.Context, a *models.PageAnalysis) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *pageAnalysisRepository) GetLatestByPageID(ctx context.Context, pageID uuid.UUID) (*models.PageAnalysis, error) {
	var a models.PageAnalysis
	err := r.db.WithContext(ctx).Where("page_id = ?", pageID).Order("analyzed_at DESC").First(&a).Error
	return &a, err
}

type serpHistoryRepository struct{ db *gorm.DB }

func NewSerpHistoryRepository(db *gorm.DB) *serpHistoryRepository {
	return &serpHistoryRepository{db: db}
}

func (r *serpHistoryRepository) Create(ctx context.Context, h *models.KeywordSerpHistory) error {
	return r.db.WithContext(ctx).Create(h).Error
}

func (r *serpHistoryRepository) GetLatestByKeywordID(ctx context.Context, keywordID uuid.UUID) (*models.KeywordSerpHistory, error) {
	var h models.KeywordSerpHistory
	err := r.db.WithContext(ctx).Where("keyword_id = ?", keywordID).Order("checked_at DESC").First(&h).Error
	return &h, err
}

func (r *serpHistoryRepository) GetByKeywordIDDateRange(ctx context.Context, keywordID uuid.UUID, days int) ([]models.KeywordSerpHistory, error) {
	var history []models.KeywordSerpHistory
	since := time.Now().AddDate(0, 0, -days)
	err := r.db.WithContext(ctx).Where("keyword_id = ? AND checked_at >= ?", keywordID, since).Order("checked_at ASC").Find(&history).Error
	return history, err
}
