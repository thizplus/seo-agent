package repositories

import (
	"context"

	"seo-agents-backend/domain/models"
)

type SystemSettingRepository interface {
	Get(ctx context.Context, key string) (*models.SystemSetting, error)
	Set(ctx context.Context, key string, value string) error
}
