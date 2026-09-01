package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type siteRepository struct {
	db *gorm.DB
}

func NewSiteRepository(db *gorm.DB) *siteRepository {
	return &siteRepository{db: db}
}

func (r *siteRepository) Create(ctx context.Context, site *models.Site) error {
	return r.db.WithContext(ctx).Create(site).Error
}

func (r *siteRepository) GetAll(ctx context.Context) ([]models.Site, error) {
	var sites []models.Site
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&sites).Error
	return sites, err
}

func (r *siteRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Site, error) {
	var sites []models.Site
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&sites).Error
	return sites, err
}

func (r *siteRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Site, error) {
	var site models.Site
	err := r.db.WithContext(ctx).First(&site, id).Error
	return &site, err
}

func (r *siteRepository) Update(ctx context.Context, site *models.Site) error {
	return r.db.WithContext(ctx).Save(site).Error
}

func (r *siteRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Site{}, id).Error
}
