package dto

import (
	"time"

	"seo-agents-backend/domain/models"
)

// --- Request ---

type CreateKeywordRequest struct {
	Keyword string `json:"keyword" validate:"required"`
}

// --- Response ---

type KeywordResponse struct {
	ID              string    `json:"id"`
	SiteID          string    `json:"siteId"`
	PageID          string    `json:"pageId,omitempty"`
	Keyword         string    `json:"keyword"`
	SearchVolume    int       `json:"searchVolume"`
	Difficulty      int       `json:"difficulty"`
	Intent          string    `json:"intent"`
	Score           int       `json:"score"`
	Source          string    `json:"source"`
	SERPData        any       `json:"serpData"`
	SuggestedTopics any       `json:"suggestedTopics"`
	CreatedAt       time.Time `json:"createdAt"`
}

// --- Mapper ---

func KeywordToResponse(k *models.Keyword) *KeywordResponse {
	pageID := ""
	if k.PageID != nil {
		pageID = k.PageID.String()
	}
	return &KeywordResponse{
		ID:              k.ID.String(),
		SiteID:          k.SiteID.String(),
		PageID:          pageID,
		Keyword:         k.Keyword,
		SearchVolume:    k.SearchVolume,
		Difficulty:      k.Difficulty,
		Intent:          k.Intent,
		Score:           k.Score,
		Source:          k.Source,
		SERPData:        jsonOrNil(k.SERPData),
		SuggestedTopics: jsonOrNil(k.SuggestedTopics),
		CreatedAt:       k.CreatedAt,
	}
}

func KeywordsToResponse(keywords []models.Keyword) []*KeywordResponse {
	result := make([]*KeywordResponse, len(keywords))
	for i := range keywords {
		result[i] = KeywordToResponse(&keywords[i])
	}
	return result
}
