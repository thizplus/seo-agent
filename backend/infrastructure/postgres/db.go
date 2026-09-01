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
	); err != nil {
		return nil, err
	}

	slog.Info("Database migrated")
	return db, nil
}
