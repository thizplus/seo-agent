package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type KeywordFocusQueue struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	SiteID            uuid.UUID  `gorm:"type:uuid;not null;index;uniqueIndex:idx_site_primary_kw" json:"siteId"`
	Priority          int        `gorm:"not null" json:"priority"`
	PillarURL         string     `gorm:"size:500" json:"pillarUrl"`
	PrimaryKeyword    string     `gorm:"size:255;not null;uniqueIndex:idx_site_primary_kw" json:"primaryKeyword"`
	SecondaryKeywords string     `gorm:"type:text" json:"secondaryKeywords"`
	CustomTitle       string     `gorm:"type:text" json:"customTitle"`
	ContentGuide      string     `gorm:"type:text" json:"contentGuide"`
	WritingTone       string     `gorm:"size:255" json:"writingTone"`
	Status            string     `gorm:"size:50;default:pending;index" json:"status"`
	ArticleID         *uuid.UUID `gorm:"type:uuid" json:"articleId"`
	ErrorMessage      string     `gorm:"type:text" json:"errorMessage"`
	RetryCount        int        `gorm:"default:0" json:"retryCount"`
	CompletedAt       *time.Time `json:"completedAt"`
	CreatedAt         time.Time  `json:"createdAt"`
}

func (q *KeywordFocusQueue) BeforeCreate(tx *gorm.DB) error {
	if q.ID == uuid.Nil {
		q.ID = uuid.New()
	}
	return nil
}
