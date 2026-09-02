package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Site struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey"`
	UserID         uuid.UUID      `gorm:"type:uuid;index"`
	Name           string         `gorm:"size:255;not null"`
	URL            string         `gorm:"size:500;not null;uniqueIndex"`
	Description    string         `gorm:"type:text"`
	BusinessType   string         `gorm:"size:100"`
	Industry       string         `gorm:"size:255"`
	BrandVoice     string         `gorm:"type:text"`
	TargetPersona  datatypes.JSON `gorm:"type:jsonb"`
	AnalysisStatus string         `gorm:"size:50;default:pending"`
	AnalysisData   datatypes.JSON `gorm:"type:jsonb"`

	// LLM Provider (per site — เลือกได้: gemini, openai, claude, deepseek)
	LLMProvider string `gorm:"size:50;default:gemini"`
	LLMApiKey   string `gorm:"size:500"`

	// WordPress credentials (per site)
	WPUrl         string `gorm:"size:500"`
	WPUsername    string `gorm:"size:255"`
	WPAppPassword string `gorm:"size:255"`

	// AI Writing Settings (per site — ใช้ทุกบทความ)
	WritingTone  string `gorm:"size:255"`
	ContentGuide string `gorm:"type:text"`

	// Auto-extracted seed keywords จาก site analysis
	SuggestedSeeds datatypes.JSON `gorm:"type:jsonb"`

	// Google Search Console (per site — OAuth per-site connect)
	GSCRefreshToken string `gorm:"type:text"`  // OAuth refresh token (คนละ account กับ login ได้)
	GSCSiteURL      string `gorm:"size:500"`   // GSC property URL ที่เลือก

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (s *Site) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
