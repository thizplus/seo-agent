package models

import "time"

type SystemSetting struct {
	Key       string `gorm:"primaryKey;size:100"`
	Value     string `gorm:"type:text"`
	UpdatedAt time.Time
}
