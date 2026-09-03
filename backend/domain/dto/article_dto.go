package dto

import (
	"time"

	"seo-agents-backend/domain/models"
)

// --- Request ---

type GenerateArticleRequest struct {
	SiteID            string   `json:"siteId" validate:"required,uuid"`
	KeywordID         string   `json:"keywordId" validate:"required,uuid"`
	SecondaryKeywords []string `json:"secondaryKeywords,omitempty"`
	PillarURL         string   `json:"pillarUrl,omitempty"`
	CustomTitle       string   `json:"customTitle,omitempty"`
	ContentGuide      string   `json:"contentGuide,omitempty"`
	WritingTone       string   `json:"writingTone,omitempty"`
}

type UpdateContentRequest struct {
	Title           string `json:"title"`
	Slug            string `json:"slug"`
	Content         string `json:"content"`
	MetaDescription string `json:"metaDescription"`
}

type PublishArticleRequest struct {
	ScheduleAt *time.Time `json:"scheduleAt,omitempty"`
}

// --- Response ---

type ArticleResponse struct {
	ID              string    `json:"id"`
	SiteID          string    `json:"siteId"`
	KeywordID       string    `json:"keywordId,omitempty"`
	Title           string    `json:"title"`
	Slug            string    `json:"slug"`
	Content         string    `json:"content"`
	ContentVersion  int       `json:"contentVersion"`
	MetaDescription string    `json:"metaDescription"`
	SchemaMarkup    any       `json:"schemaMarkup"`
	EEATScore       any       `json:"eeatScore"`
	Status          string    `json:"status"`
	PublishStatus   string    `json:"publishStatus"`
	PublishedURL     string    `json:"publishedUrl"`
	FeaturedImageURL string   `json:"featuredImageUrl"`
	WordCount        int      `json:"wordCount"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type ArticleMetricsResponse struct {
	Impressions int     `json:"impressions"`
	Clicks      int     `json:"clicks"`
	CTR         float64 `json:"ctr"`
	AvgPosition float64 `json:"avgPosition"`
	Indexed     bool    `json:"indexed"`
	LastChecked string  `json:"lastChecked"`
}

// --- Mapper ---

func ArticleToResponse(a *models.Article) *ArticleResponse {
	r := &ArticleResponse{
		ID:              a.ID.String(),
		SiteID:          a.SiteID.String(),
		Title:           a.Title,
		Slug:            a.Slug,
		Content:         a.Content,
		ContentVersion:  a.ContentVersion,
		MetaDescription: a.MetaDescription,
		SchemaMarkup:    jsonOrNil(a.SchemaMarkup),
		EEATScore:       jsonOrNil(a.EEATScore),
		Status:          a.Status,
		PublishStatus:   a.PublishStatus,
		PublishedURL:     a.PublishedURL,
		FeaturedImageURL: a.FeaturedImageURL,
		WordCount:        a.WordCount,
		CreatedAt:       a.CreatedAt,
		UpdatedAt:       a.UpdatedAt,
	}
	if a.KeywordID != nil {
		r.KeywordID = a.KeywordID.String()
	}
	return r
}

func ArticlesToResponse(articles []models.Article) []*ArticleResponse {
	result := make([]*ArticleResponse, len(articles))
	for i := range articles {
		result[i] = ArticleToResponse(&articles[i])
	}
	return result
}
