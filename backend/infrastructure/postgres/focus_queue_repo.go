package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type focusQueueRepository struct {
	db *gorm.DB
}

func NewFocusQueueRepository(db *gorm.DB) *focusQueueRepository {
	return &focusQueueRepository{db: db}
}

func (r *focusQueueRepository) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.KeywordFocusQueue, error) {
	var items []models.KeywordFocusQueue
	err := r.db.WithContext(ctx).Where("site_id = ?", siteID).Order("priority ASC").Find(&items).Error
	return items, err
}

func (r *focusQueueRepository) GetNextPending(ctx context.Context, siteID uuid.UUID) (*models.KeywordFocusQueue, error) {
	var item models.KeywordFocusQueue
	err := r.db.WithContext(ctx).
		Where("site_id = ? AND (status = 'pending' OR (status = 'failed' AND retry_count < 3))", siteID).
		Order("priority ASC").
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *focusQueueRepository) Create(ctx context.Context, item *models.KeywordFocusQueue) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *focusQueueRepository) CreateBatch(ctx context.Context, items []models.KeywordFocusQueue) error {
	return r.db.WithContext(ctx).Create(&items).Error
}

func (r *focusQueueRepository) Update(ctx context.Context, item *models.KeywordFocusQueue) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *focusQueueRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.KeywordFocusQueue{}, id).Error
}

func (r *focusQueueRepository) ResetAll(ctx context.Context, siteID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.KeywordFocusQueue{}).
		Where("site_id = ? AND status IN ('completed', 'skipped', 'failed')", siteID).
		Updates(map[string]any{"status": "pending", "retry_count": 0, "error_message": ""}).Error
}

func (r *focusQueueRepository) GetStatus(ctx context.Context, siteID uuid.UUID) (total, completed, pending, failed, skipped int, err error) {
	type result struct {
		Status string
		Count  int
	}
	var results []result
	err = r.db.WithContext(ctx).Model(&models.KeywordFocusQueue{}).
		Select("status, count(*) as count").
		Where("site_id = ?", siteID).
		Group("status").
		Scan(&results).Error
	if err != nil {
		return
	}
	for _, r := range results {
		switch r.Status {
		case "completed":
			completed = r.Count
		case "pending":
			pending = r.Count
		case "failed":
			failed = r.Count
		case "skipped":
			skipped = r.Count
		}
		total += r.Count
	}
	return
}
