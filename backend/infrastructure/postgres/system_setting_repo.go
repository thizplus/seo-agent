package postgres

import (
	"context"

	"gorm.io/gorm"

	"seo-agents-backend/domain/models"
)

type systemSettingRepository struct {
	db *gorm.DB
}

func NewSystemSettingRepository(db *gorm.DB) *systemSettingRepository {
	return &systemSettingRepository{db: db}
}

func (r *systemSettingRepository) Get(ctx context.Context, key string) (*models.SystemSetting, error) {
	var setting models.SystemSetting
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&setting).Error
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func (r *systemSettingRepository) Set(ctx context.Context, key string, value string) error {
	return r.db.WithContext(ctx).Where("key = ?", key).Assign(models.SystemSetting{
		Key:   key,
		Value: value,
	}).FirstOrCreate(&models.SystemSetting{}).Error
}
