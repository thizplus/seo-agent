package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Competitor struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey"`
	SiteID       uuid.UUID      `gorm:"type:uuid;index"`
	URL          string         `gorm:"size:500;not null"`
	AnalysisData datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt    time.Time
}

func (c *Competitor) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
