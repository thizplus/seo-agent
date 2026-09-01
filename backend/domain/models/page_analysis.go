package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type PageAnalysis struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	PageID    uuid.UUID `gorm:"type:uuid;not null;index"`
	AnalyzedAt time.Time

	// Our page data
	OurWordCount    int    `gorm:"default:0"`
	OurH1           string `gorm:"size:500"`
	OurMeta         string `gorm:"type:text"`
	OurH2Count      int    `gorm:"default:0"`

	// Competitor avg
	AvgWordCount     int `gorm:"default:0"`
	CompetitionCount int `gorm:"default:0"`

	// Audit
	AuditScore      int            `gorm:"default:0"`
	Issues          datatypes.JSON `gorm:"type:jsonb"`
	Recommendations datatypes.JSON `gorm:"type:jsonb"`
	SerpSnapshots   datatypes.JSON `gorm:"type:jsonb"`

	CreatedAt time.Time

	SitePage SitePage `gorm:"foreignKey:PageID;constraint:OnDelete:CASCADE"`
}

func (p *PageAnalysis) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type KeywordSerpHistory struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey"`
	KeywordID    uuid.UUID      `gorm:"type:uuid;not null;index"`
	CheckedAt    time.Time      `gorm:"type:date;not null"`
	OurPosition  int            `gorm:"default:0"`
	AvgWordCount int            `gorm:"default:0"`
	Results      datatypes.JSON `gorm:"type:jsonb"`
	Changes      datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt    time.Time

	Keyword Keyword `gorm:"foreignKey:KeywordID;constraint:OnDelete:CASCADE"`
}

func (h *KeywordSerpHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}
