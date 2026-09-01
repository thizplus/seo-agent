package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type siteMemberRepository struct {
	db *gorm.DB
}

func NewSiteMemberRepository(db *gorm.DB) *siteMemberRepository {
	return &siteMemberRepository{db: db}
}

func (r *siteMemberRepository) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.SiteMember, error) {
	var members []models.SiteMember
	err := r.db.WithContext(ctx).Where("site_id = ?", siteID).Order("created_at ASC").Find(&members).Error
	return members, err
}

func (r *siteMemberRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.SiteMember, error) {
	var members []models.SiteMember
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&members).Error
	return members, err
}

func (r *siteMemberRepository) Create(ctx context.Context, member *models.SiteMember) error {
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *siteMemberRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.SiteMember{}, id).Error
}

func (r *siteMemberRepository) LinkUser(ctx context.Context, email string, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.SiteMember{}).
		Where("email = ? AND (user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000')", email).
		Update("user_id", userID).Error
}

func (r *siteMemberRepository) GetSharedSiteIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	var siteIDs []uuid.UUID
	err := r.db.WithContext(ctx).Model(&models.SiteMember{}).
		Where("user_id = ?", userID).
		Pluck("site_id", &siteIDs).Error
	return siteIDs, err
}
