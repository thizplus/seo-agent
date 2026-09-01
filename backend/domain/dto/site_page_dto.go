package dto

import (
	"time"

	"seo-agents-backend/domain/models"
)

type SitePageResponse struct {
	ID              string            `json:"id"`
	SiteID          string            `json:"siteId"`
	URL             string            `json:"url"`
	Title           string            `json:"title"`
	H1              string            `json:"h1"`
	MetaDescription string            `json:"metaDescription"`
	PageType        string            `json:"pageType"`
	WordCount       int               `json:"wordCount"`
	Keywords        []*KeywordResponse `json:"keywords"`
	LastCrawledAt   time.Time         `json:"lastCrawledAt"`
	CreatedAt       time.Time         `json:"createdAt"`
}

func SitePageToResponse(p *models.SitePage, keywords []models.Keyword) *SitePageResponse {
	kwResponses := make([]*KeywordResponse, 0)
	for i := range keywords {
		if keywords[i].PageID != nil && *keywords[i].PageID == p.ID {
			kwResponses = append(kwResponses, KeywordToResponse(&keywords[i]))
		}
	}
	return &SitePageResponse{
		ID:              p.ID.String(),
		SiteID:          p.SiteID.String(),
		URL:             p.URL,
		Title:           p.Title,
		H1:              p.H1,
		MetaDescription: p.MetaDescription,
		PageType:        p.PageType,
		WordCount:       p.WordCount,
		Keywords:        kwResponses,
		LastCrawledAt:   p.LastCrawledAt,
		CreatedAt:       p.CreatedAt,
	}
}

func SitePagesToResponse(pages []models.SitePage, keywords []models.Keyword) []*SitePageResponse {
	result := make([]*SitePageResponse, len(pages))
	for i := range pages {
		result[i] = SitePageToResponse(&pages[i], keywords)
	}
	return result
}
