package services

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
)

type ArticleService interface {
	Generate(ctx context.Context, req *dto.GenerateArticleRequest) (*models.Article, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Article, error)
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Article, error)
	Publish(ctx context.Context, id uuid.UUID) (*models.Article, error)
	FetchMetrics(ctx context.Context, id uuid.UUID) (map[string]any, error)
	RunOptimizer(ctx context.Context, id uuid.UUID) (map[string]any, error)
	GenerateImages(ctx context.Context, id uuid.UUID, count int) (any, error)
	FindImages(ctx context.Context, id uuid.UUID, count int) (any, error)
	SearchImages(ctx context.Context, keyword string, count int) (any, error)
	UploadSelectedImages(ctx context.Context, id uuid.UUID, images []map[string]any) (any, error)
	GetImages(ctx context.Context, id uuid.UUID) ([]models.ArticleImage, error)
	DeleteImage(ctx context.Context, articleID uuid.UUID, imageID uuid.UUID) error
	UpdateContent(ctx context.Context, id uuid.UUID, req *dto.UpdateContentRequest) (*models.Article, error)
	DeleteArticleFull(ctx context.Context, id uuid.UUID) error
	GetVersions(ctx context.Context, id uuid.UUID) ([]models.ArticleVersion, error)
}
