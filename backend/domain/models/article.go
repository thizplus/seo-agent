package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type Article struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey"`
	SiteID           uuid.UUID      `gorm:"type:uuid;not null;index"`
	KeywordID        *uuid.UUID     `gorm:"type:uuid;index"`
	Title            string         `gorm:"size:500"`
	Slug             string         `gorm:"size:500"`
	Content          string         `gorm:"type:text"`
	ContentVersion   int            `gorm:"default:1"`
	MetaDescription  string         `gorm:"size:300"`
	FeaturedImageURL string         `gorm:"size:1000"`
	SchemaMarkup     datatypes.JSON `gorm:"type:jsonb"`
	InternalLinks    datatypes.JSON `gorm:"type:jsonb"`
	EEATScore        datatypes.JSON `gorm:"type:jsonb"`
	SkillsUsed       datatypes.JSON `gorm:"type:jsonb"`
	Status           string         `gorm:"size:50;default:pending"`
	PublishStatus    string         `gorm:"size:50;default:draft"`
	PublishedURL     string         `gorm:"type:text"`
	CMSPostID        string         `gorm:"size:100"`
	WordCount        int            `gorm:"default:0"`
	CreatedAt        time.Time
	UpdatedAt        time.Time

	Site    Site     `gorm:"foreignKey:SiteID;constraint:OnDelete:CASCADE"`
	Keyword *Keyword `gorm:"foreignKey:KeywordID"`
}

func (a *Article) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type ArticleImage struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	ArticleID uuid.UUID `gorm:"type:uuid;not null;index"`
	URL       string    `gorm:"size:1000"`
	AltText   string    `gorm:"size:500"`
	Role      string    `gorm:"size:20;default:content"` // featured | content
	Format    string    `gorm:"size:20;default:webp"`
	FileSizeKB int      `gorm:"default:0"`
	Position  int       `gorm:"default:0"`
	CreatedAt time.Time
}

func (ai *ArticleImage) BeforeCreate(tx *gorm.DB) error {
	if ai.ID == uuid.Nil {
		ai.ID = uuid.New()
	}
	return nil
}

type ArticleMetrics struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	ArticleID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Impressions int       `gorm:"default:0"`
	Clicks      int       `gorm:"default:0"`
	CTR         float64   `gorm:"default:0"`
	AvgPosition float64
	Indexed     bool `gorm:"default:false"`
	LastChecked time.Time
	CreatedAt   time.Time

	Article Article `gorm:"foreignKey:ArticleID;constraint:OnDelete:CASCADE"`
}

func (am *ArticleMetrics) BeforeCreate(tx *gorm.DB) error {
	if am.ID == uuid.Nil {
		am.ID = uuid.New()
	}
	return nil
}

type OptimizationLog struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	ArticleID uuid.UUID      `gorm:"type:uuid;not null;index"`
	Action    string         `gorm:"size:100"`
	Reason    string         `gorm:"type:text"`
	BeforeData datatypes.JSON `gorm:"type:jsonb"`
	AfterData  datatypes.JSON `gorm:"type:jsonb"`
	Result    string         `gorm:"size:50"`
	CreatedAt time.Time

	Article Article `gorm:"foreignKey:ArticleID;constraint:OnDelete:CASCADE"`
}

func (ol *OptimizationLog) BeforeCreate(tx *gorm.DB) error {
	if ol.ID == uuid.Nil {
		ol.ID = uuid.New()
	}
	return nil
}
