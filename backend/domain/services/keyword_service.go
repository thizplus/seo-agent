package services

import (
	"context"

	"github.com/google/uuid"
	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
)

type KeywordService interface {
	Create(ctx context.Context, siteID uuid.UUID, req *dto.CreateKeywordRequest) (*models.Keyword, error)
	GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Keyword, error)
}
