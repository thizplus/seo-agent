package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type keywordRepository struct {
	db *gorm.DB
}

func NewKeywordRepository(db *gorm.DB) *keywordRepository {
	return &keywordRepository{db: db}
}

func (r *keywordRepository) Create(ctx context.Context, keyword *models.Keyword) error {
	return r.db.WithContext(ctx).Create(keyword).Error
}

func (r *keywordRepository) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Keyword, error) {
	var keywords []models.Keyword
	err := r.db.WithContext(ctx).Where("site_id = ?", siteID).Order("created_at DESC").Find(&keywords).Error
	return keywords, err
}

func (r *keywordRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Keyword, error) {
	var keyword models.Keyword
	err := r.db.WithContext(ctx).First(&keyword, id).Error
	return &keyword, err
}

func (r *keywordRepository) Update(ctx context.Context, keyword *models.Keyword) error {
	return r.db.WithContext(ctx).Save(keyword).Error
}
