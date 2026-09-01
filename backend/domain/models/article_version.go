package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ArticleVersion struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	ArticleID uuid.UUID `gorm:"type:uuid;index"`
	Version   int       `gorm:"not null"`
	Title     string    `gorm:"size:500"`
	Content   string    `gorm:"type:text"`
	WordCount int
	Action    string `gorm:"size:100"` // initial | rewrite_title | expand_content
	CreatedAt time.Time
}

func (v *ArticleVersion) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}
