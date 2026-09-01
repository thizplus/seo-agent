package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SiteMember struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey"`
	SiteID    uuid.UUID  `gorm:"type:uuid;not null;index;uniqueIndex:idx_site_email"`
	Email     string     `gorm:"size:255;not null;uniqueIndex:idx_site_email"`
	UserID    *uuid.UUID `gorm:"type:uuid;index"`
	Role      string     `gorm:"size:50;default:editor"`
	InvitedBy uuid.UUID  `gorm:"type:uuid;not null"`
	CreatedAt time.Time
}

func (m *SiteMember) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
