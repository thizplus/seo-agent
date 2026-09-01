package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type TopicCluster struct {
	ID              uuid.UUID      `gorm:"type:uuid;primaryKey"`
	SiteID          uuid.UUID      `gorm:"type:uuid;index"`
	MainKeyword     string         `gorm:"size:255"`
	PillarArticleID *uuid.UUID     `gorm:"type:uuid"`
	ClusterData     datatypes.JSON `gorm:"type:jsonb"` // full cluster JSON from AI
	CreatedAt       time.Time
}

func (t *TopicCluster) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
