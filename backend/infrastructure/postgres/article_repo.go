package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type articleRepository struct {
	db *gorm.DB
}

func NewArticleRepository(db *gorm.DB) *articleRepository {
	return &articleRepository{db: db}
}

func (r *articleRepository) Create(ctx context.Context, article *models.Article) error {
	return r.db.WithContext(ctx).Create(article).Error
}

func (r *articleRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Article, error) {
	var article models.Article
	err := r.db.WithContext(ctx).First(&article, id).Error
	return &article, err
}

func (r *articleRepository) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Article, error) {
	var articles []models.Article
	err := r.db.WithContext(ctx).Where("site_id = ?", siteID).Order("created_at DESC").Find(&articles).Error
	return articles, err
}

func (r *articleRepository) Update(ctx context.Context, article *models.Article) error {
	return r.db.WithContext(ctx).Save(article).Error
}

func (r *articleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Article{}, id).Error
}
