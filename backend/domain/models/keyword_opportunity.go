package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type KeywordOpportunity struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey"`
	SiteID uuid.UUID `gorm:"type:uuid;index"`
	Keyword   string `gorm:"size:500;not null"`
	Source    string `gorm:"size:100"` // gsc | google_suggest | serp_related
	Intent    string `gorm:"size:50"`  // informational | commercial | transactional
	Score     int    `gorm:"default:0"`
	Status    string `gorm:"size:50;default:new"` // new | approved | rejected
	CreatedAt time.Time
}

func (k *KeywordOpportunity) BeforeCreate(tx *gorm.DB) error {
	if k.ID == uuid.Nil {
		k.ID = uuid.New()
	}
	return nil
}
