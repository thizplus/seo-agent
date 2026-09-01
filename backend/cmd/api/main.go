package main

import (
	"fmt"
	"log"
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"

	"seo-agents-backend/infrastructure/postgres"
	"seo-agents-backend/interfaces/api/middleware"
	"seo-agents-backend/interfaces/api/routes"
	"seo-agents-backend/pkg/config"
	"seo-agents-backend/pkg/auth"
	"seo-agents-backend/pkg/di"
	"seo-agents-backend/pkg/logger"
	"seo-agents-backend/pkg/scheduler"
)

func main() {
	// Load .env จาก root project
	_ = godotenv.Load("../.env")   // รันจาก backend/ (air)
	_ = godotenv.Load("../../.env") // รันจาก backend/cmd/api/
	_ = godotenv.Load(".env")       // รันจาก root

	// Logger
	logger.Init()

	// Config
	cfg := config.Load()

	// Verify Google OAuth config
	if cfg.Google.ClientID == "" {
		slog.Warn("GOOGLE_CLIENT_ID is not set — Google OAuth will not work")
	} else {
		slog.Info("Google OAuth configured", "client_id", cfg.Google.ClientID[:20]+"...")
	}

	// JWT
	auth.InitJWT(cfg.JWTSecret)

	// Database
	db, err := postgres.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// DI Container
	container := di.NewContainer(cfg, db)

	// Fiber App
	app := fiber.New(fiber.Config{
		AppName: "SEO Agents API",
	})

	// Middleware
	middleware.Setup(app, cfg.FrontendURL)

	// Routes
	routes.Setup(app, container)

	// Scheduler
	sched := scheduler.New(
		container.SiteService, container.KeywordService, container.ArticleService,
		container.SiteRepo, container.ArticleRepo,
		container.SitePageRepo, container.KeywordRepo, container.PageAnalysisRepo, container.SerpHistoryRepo,
		container.AIEngine,
	)
	sched.Start()
	defer sched.Stop()

	// Start
	addr := fmt.Sprintf(":%s", cfg.AppPort)
	slog.Info("Server starting", "port", cfg.AppPort)
	log.Fatal(app.Listen(addr))
}
