package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	GoogleID  string    `gorm:"size:255;uniqueIndex"`
	Email     string    `gorm:"size:255;not null;uniqueIndex"`
	Name      string    `gorm:"size:255"`
	AvatarURL string    `gorm:"size:500"`
	Provider  string    `gorm:"size:50;default:google"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
