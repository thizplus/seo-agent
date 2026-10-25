package postgres

import (
	"log/slog"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"seo-agents-backend/domain/models"
	"seo-agents-backend/pkg/config"
)

func Connect(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	slog.Info("Database connected")

	if err := db.AutoMigrate(
		&models.User{},
		&models.Site{},
		&models.Keyword{},
		&models.Article{},
		&models.ArticleImage{},
		&models.ArticleMetrics{},
		&models.OptimizationLog{},
		&models.KeywordOpportunity{},
		&models.TopicCluster{},
		&models.Competitor{},
		&models.ArticleVersion{},
		&models.SitePage{},
		&models.PageAnalysis{},
		&models.KeywordSerpHistory{},
		&models.SiteMember{},
		&models.KeywordFocusQueue{},
		&models.ArticleMetricsHistory{},
		&models.SystemSetting{},
	); err != nil {
		return nil, err
	}

	// Seed default auto-publish settings (เสาร์-อาทิตย์ เปิด)
	var count int64
	db.Model(&models.SystemSetting{}).Where("key = ?", "auto_publish").Count(&count)
	if count == 0 {
		db.Create(&models.SystemSetting{
			Key:   "auto_publish",
			Value: `{"enabled":true,"days":[0,6],"time":"09:00"}`,
		})
		slog.Info("Seeded default auto-publish settings (Sat+Sun 09:00)")
	}

	slog.Info("Database migrated")
	return db, nil
}
