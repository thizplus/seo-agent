package serviceimpl

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"seo-agents-backend/domain/dto"
	"seo-agents-backend/domain/models"
	"seo-agents-backend/domain/repositories"
)

type keywordServiceImpl struct {
	keywordRepo repositories.KeywordRepository
}

func NewKeywordService(keywordRepo repositories.KeywordRepository) *keywordServiceImpl {
	return &keywordServiceImpl{keywordRepo: keywordRepo}
}

func (s *keywordServiceImpl) Create(ctx context.Context, siteID uuid.UUID, req *dto.CreateKeywordRequest) (*models.Keyword, error) {
	keyword := &models.Keyword{
		SiteID:  siteID,
		Keyword: req.Keyword,
	}

	if err := s.keywordRepo.Create(ctx, keyword); err != nil {
		slog.Error("Failed to create keyword", "error", err)
		return nil, err
	}

	slog.Info("Keyword created", "keyword_id", keyword.ID, "keyword", keyword.Keyword)
	return keyword, nil
}

func (s *keywordServiceImpl) GetBySiteID(ctx context.Context, siteID uuid.UUID) ([]models.Keyword, error) {
	return s.keywordRepo.GetBySiteID(ctx, siteID)
}
