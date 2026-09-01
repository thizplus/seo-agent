package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Keyword struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey"`
	SiteID          uuid.UUID      `gorm:"type:uuid;not null;index"`
	PageID          *uuid.UUID     `gorm:"type:uuid;index"`
	Keyword         string         `gorm:"size:500;not null"`
	SearchVolume    int            `gorm:"default:0"`
	Difficulty      int            `gorm:"default:0"`
	Intent          string         `gorm:"size:50"`
	Score           int            `gorm:"default:0"`
	Source          string         `gorm:"size:50"`
	SERPData        datatypes.JSON `gorm:"type:jsonb"`
	SuggestedTopics datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt       time.Time

	Site Site `gorm:"foreignKey:SiteID;constraint:OnDelete:CASCADE"`
}

func (k *Keyword) BeforeCreate(tx *gorm.DB) error {
	if k.ID == uuid.Nil {
		k.ID = uuid.New()
	}
	return nil
}
