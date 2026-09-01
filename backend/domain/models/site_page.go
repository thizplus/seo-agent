package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SitePage struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	SiteID          uuid.UUID `gorm:"type:uuid;not null;index"`
	URL             string    `gorm:"size:1000;not null"`
	Title           string    `gorm:"size:500"`
	H1              string    `gorm:"size:500"`
	MetaDescription string    `gorm:"type:text"`
	PageType        string    `gorm:"size:50"`
	WordCount       int       `gorm:"default:0"`
	LastCrawledAt   time.Time
	CreatedAt       time.Time

	Site Site `gorm:"foreignKey:SiteID;constraint:OnDelete:CASCADE"`
}

func (p *SitePage) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
