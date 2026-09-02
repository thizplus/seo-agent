package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type KeywordFocusQueue struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SiteID            uuid.UUID  `gorm:"type:uuid;not null;index;uniqueIndex:idx_site_primary_kw"`
	Priority          int        `gorm:"not null"`
	PillarURL         string     `gorm:"size:500"`
	PrimaryKeyword    string     `gorm:"size:255;not null;uniqueIndex:idx_site_primary_kw"`
	SecondaryKeywords string     `gorm:"type:text"`
	Status            string     `gorm:"size:50;default:pending;index"`
	ArticleID         *uuid.UUID `gorm:"type:uuid"`
	ErrorMessage      string     `gorm:"type:text"`
	RetryCount        int        `gorm:"default:0"`
	CompletedAt       *time.Time
	CreatedAt         time.Time
}

func (q *KeywordFocusQueue) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
