package dto

import (
	"encoding/json"
	"time"

	"seo-agents-backend/domain/models"
)

// --- Request ---

type CreateSiteRequest struct {
	Name          string `json:"name" validate:"required"`
	URL           string `json:"url" validate:"required,url"`
	LLMProvider   string `json:"llmProvider,omitempty"`  // gemini | openai | claude | deepseek
	LLMApiKey     string `json:"llmApiKey,omitempty"`
	WPUrl         string `json:"wpUrl,omitempty"`
	WPUsername    string `json:"wpUsername,omitempty"`
	WPAppPassword string `json:"wpAppPassword,omitempty"`
}

type UpdateSiteRequest struct {
	Name          *string `json:"name,omitempty"`
	URL           *string `json:"url,omitempty"`
	Description   *string `json:"description,omitempty"`
	Industry      *string `json:"industry,omitempty"`
	LLMProvider   *string `json:"llmProvider,omitempty"`
	LLMApiKey     *string `json:"llmApiKey,omitempty"`
	WPUrl         *string `json:"wpUrl,omitempty"`
	WPUsername    *string `json:"wpUsername,omitempty"`
	WPAppPassword *string `json:"wpAppPassword,omitempty"`
}

// --- Response ---

type SiteResponse struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	URL            string    `json:"url"`
	Description    string    `json:"description"`
	BusinessType   string    `json:"businessType"`
	Industry       string    `json:"industry"`
	BrandVoice     string    `json:"brandVoice"`
	TargetPersona  any       `json:"targetPersona"`
	AnalysisStatus string    `json:"analysisStatus"`
	AnalysisData   any       `json:"analysisData"`
	LLMProvider    string    `json:"llmProvider"`
	HasLLMKey      bool      `json:"hasLlmKey"`
	HasWordPress   bool      `json:"hasWordPress"`
	SuggestedSeeds []string  `json:"suggestedSeeds"`
	HasGSC         bool      `json:"hasGsc"`
	GSCSiteURL     string    `json:"gscSiteUrl"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// --- Mapper ---

func SiteToResponse(s *models.Site) *SiteResponse {
	return &SiteResponse{
		ID:             s.ID.String(),
		Name:           s.Name,
		URL:            s.URL,
		Description:    s.Description,
		BusinessType:   s.BusinessType,
		Industry:       s.Industry,
		BrandVoice:     s.BrandVoice,
		TargetPersona:  jsonOrNil(s.TargetPersona),
		AnalysisStatus: s.AnalysisStatus,
		AnalysisData:   jsonOrNil(s.AnalysisData),
		LLMProvider:    s.LLMProvider,
		SuggestedSeeds: parseSeedsJSON(s.SuggestedSeeds),
		HasLLMKey:      s.LLMApiKey != "",
		HasWordPress:   s.WPUrl != "",
		HasGSC:         s.GSCRefreshToken != "",
		GSCSiteURL:     s.GSCSiteURL,
		CreatedAt:      s.CreatedAt,
		UpdatedAt:      s.UpdatedAt,
	}
}

func parseSeedsJSON(data []byte) []string {
	if len(data) == 0 {
		return []string{}
	}
	var seeds []string
	if err := json.Unmarshal(data, &seeds); err != nil {
		return []string{}
	}
	return seeds
}

func SitesToResponse(sites []models.Site) []*SiteResponse {
	result := make([]*SiteResponse, len(sites))
	for i := range sites {
		result[i] = SiteToResponse(&sites[i])
	}
	return result
}
