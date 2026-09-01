package routes

import (
	"github.com/gofiber/fiber/v2"

	"seo-agents-backend/interfaces/api/handlers"
	"seo-agents-backend/interfaces/api/middleware"
	"seo-agents-backend/pkg/di"
)

func Setup(app *fiber.App, c *di.Container) {
	googleRedirectURI := c.Config.Google.RedirectURL
	gscRedirectURI := googleRedirectURI[:len(googleRedirectURI)-len("/api/v1/auth/google/callback")] + "/api/v1/auth/gsc/callback"

	authHandler := handlers.NewAuthHandler(c.AuthService, c.GoogleOAuth, c.Config.FrontendURL, googleRedirectURI)
	gscHandler := handlers.NewGSCHandler(c.SiteRepo, c.GoogleOAuth, c.Config.FrontendURL, gscRedirectURI)
	siteHandler := handlers.NewSiteHandler(c.SiteService, c.KeywordService, c.ArticleService)
	keywordHandler := handlers.NewKeywordHandler(c.KeywordService, c.KeywordRepo, c.SiteRepo, c.AIEngine)
	articleHandler := handlers.NewArticleHandler(c.ArticleService)
	pageHandler := handlers.NewPageHandler(c.SitePageRepo, c.KeywordRepo, c.SiteRepo, c.PageAnalysisRepo, c.SerpHistoryRepo, c.AIEngine)

	api := app.Group("/api/v1")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Auth (public)
	auth := api.Group("/auth")
	auth.Get("/google", authHandler.GoogleLogin)
	auth.Get("/google/callback", authHandler.GoogleCallback)
	auth.Get("/gsc/connect/:id", gscHandler.Connect)
	auth.Get("/gsc/callback", gscHandler.Callback)

	// Protected
	protected := api.Group("", middleware.AuthMiddleware())
	protected.Get("/auth/me", authHandler.Me)

	sites := protected.Group("/sites")
	sites.Post("/", siteHandler.Create)
	sites.Get("/", siteHandler.GetAll)
	sites.Get("/:id", siteHandler.GetByID)
	sites.Put("/:id", siteHandler.Update)
	sites.Post("/:id/analyze", siteHandler.Analyze)
	sites.Post("/:id/discover-keywords", siteHandler.DiscoverKeywords)
	sites.Post("/:id/clusters", siteHandler.CreateCluster)
	sites.Post("/:id/competitors", siteHandler.AnalyzeCompetitor)
	sites.Post("/:id/pipeline", siteHandler.RunPipeline)
	sites.Get("/:id/pages", pageHandler.GetPages)
	sites.Post("/:id/pages/:pageId/analyze", pageHandler.AnalyzePage)
	sites.Get("/:id/pages/:pageId/analysis", pageHandler.GetAnalysis)
	sites.Post("/:id/keywords/:kwId/analyze-serp", keywordHandler.AnalyzeSERP)
	sites.Delete("/:id", siteHandler.Delete)
	sites.Get("/:id/gsc/properties", gscHandler.Properties)
	sites.Post("/:id/gsc/select", gscHandler.SelectProperty)
	sites.Delete("/:id/gsc", gscHandler.Disconnect)
	sites.Post("/:id/keywords", keywordHandler.Create)
	sites.Get("/:id/keywords", keywordHandler.GetBySiteID)
	sites.Get("/:id/articles", articleHandler.GetBySiteID)

	articles := protected.Group("/articles")
	articles.Post("/generate", articleHandler.Generate)
	articles.Get("/:id", articleHandler.GetByID)
	articles.Get("/:id/metrics", articleHandler.FetchMetrics)
	articles.Get("/:id/versions", articleHandler.GetVersions)
	articles.Get("/:id/images", articleHandler.GetImages)
	articles.Post("/:id/optimize", articleHandler.RunOptimizer)
	articles.Post("/search-images", articleHandler.SearchImages)
	articles.Post("/:id/upload-images", articleHandler.UploadSelectedImages)
	articles.Post("/:id/find-images", articleHandler.FindImages)
	articles.Post("/:id/generate-images", articleHandler.GenerateImages)
	articles.Post("/:id/publish", articleHandler.Publish)
	articles.Delete("/:id", articleHandler.DeleteArticle)
	articles.Delete("/:id/images/:imageId", articleHandler.DeleteImage)
}
