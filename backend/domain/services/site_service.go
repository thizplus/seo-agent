package services

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
)

type SiteService interface {
	Create(ctx context.Context, userID uuid.UUID, req *dto.CreateSiteRequest) (*models.Site, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Site, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Site, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateSiteRequest) (*models.Site, error)
	Delete(ctx context.Context, id uuid.UUID) error

	// AI Engine operations (delegate to port)
	AnalyzeSite(ctx context.Context, id uuid.UUID) (map[string]any, error)
	DiscoverKeywords(ctx context.Context, id uuid.UUID, seedKeywords []string) (any, error)
	CreateCluster(ctx context.Context, id uuid.UUID, keywords []string) (map[string]any, error)
	AnalyzeCompetitor(ctx context.Context, id uuid.UUID, competitorURL string) (map[string]any, error)
	RunPipeline(ctx context.Context, id uuid.UUID) (map[string]any, error)
}
