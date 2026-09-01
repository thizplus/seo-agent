package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type sitePageRepository struct {
	db *gorm.DB
}

func NewSitePageRepository(db *gorm.DB) *sitePageRepository {
	return &sitePageRepository{db: db}
}

func (r *sitePageRepository) Create(ctx context.Context, page *models.SitePage) error {
	return r.db.WithContext(ctx).Create(page).Error
}

func (r *sitePageRepository) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.SitePage, error) {
	var pages []models.SitePage
	err := r.db.WithContext(ctx).Where("site_id = ?", siteID).Order("page_type, url").Find(&pages).Error
	return pages, err
}

func (r *sitePageRepository) GetByURL(ctx context.Context, siteID uuid.UUID, url string) (*models.SitePage, error) {
	var page models.SitePage
	err := r.db.WithContext(ctx).Where("site_id = ? AND url = ?", siteID, url).First(&page).Error
	return &page, err
}

func (r *sitePageRepository) Update(ctx context.Context, page *models.SitePage) error {
	return r.db.WithContext(ctx).Save(page).Error
}
