package dto

import (
	"time"

	"seo-agents-backend/domain/models"
)

type PageAnalysisResponse struct {
	PageID          string    `json:"pageId"`
	AnalyzedAt      time.Time `json:"analyzedAt"`
	OurWordCount    int       `json:"ourWordCount"`
	OurH1           string    `json:"ourH1"`
	OurMeta         string    `json:"ourMeta"`
	OurH2Count      int       `json:"ourH2Count"`
	AvgWordCount    int       `json:"avgWordCount"`
	CompetitionCount int      `json:"competitionCount"`
	AuditScore      int       `json:"auditScore"`
	Issues          any       `json:"issues"`
	Recommendations any       `json:"recommendations"`
	SerpSnapshots   any       `json:"serpSnapshots"`
}

func PageAnalysisToResponse(a *models.PageAnalysis) *PageAnalysisResponse {
	return &PageAnalysisResponse{
		PageID:           a.PageID.String(),
		AnalyzedAt:       a.AnalyzedAt,
		OurWordCount:     a.OurWordCount,
		OurH1:            a.OurH1,
		OurMeta:          a.OurMeta,
		OurH2Count:       a.OurH2Count,
		AvgWordCount:     a.AvgWordCount,
		CompetitionCount: a.CompetitionCount,
		AuditScore:       a.AuditScore,
		Issues:           jsonOrNil(a.Issues),
		Recommendations:  jsonOrNil(a.Recommendations),
		SerpSnapshots:    jsonOrNil(a.SerpSnapshots),
	}
}
