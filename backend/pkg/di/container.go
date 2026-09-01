package di

import (
	"gorm.io/gorm"

	"seo-agents-backend/application/serviceimpl"
	"seo-agents-backend/domain/ports"
	"seo-agents-backend/domain/repositories"
	"seo-agents-backend/domain/services"
	aiengine "seo-agents-backend/infrastructure/ai_engine"
	googleadapter "seo-agents-backend/infrastructure/google"
	"seo-agents-backend/infrastructure/postgres"
	"seo-agents-backend/pkg/config"
)

type Container struct {
	Config         *config.Config
	AuthService    services.AuthService
	SiteService    services.SiteService
	KeywordService services.KeywordService
	ArticleService services.ArticleService
	SiteRepo       repositories.SiteRepository
	ArticleRepo    repositories.ArticleRepository
	SitePageRepo     repositories.SitePageRepository
	KeywordRepo      repositories.KeywordRepository
	PageAnalysisRepo repositories.PageAnalysisRepository
	SerpHistoryRepo  repositories.SerpHistoryRepository
	SiteMemberRepo   repositories.SiteMemberRepository
	UserRepo         repositories.UserRepository
	AIEngine       ports.AIEnginePort
	GoogleOAuth    ports.GoogleOAuthPort
}

func NewContainer(cfg *config.Config, db *gorm.DB) *Container {
	// Infrastructure Adapters (Port implementations)
	aiEngine := aiengine.NewHTTPClient(cfg.AIEngineURL)
	googleOAuth := googleadapter.NewOAuthAdapter(cfg.Google.ClientID, cfg.Google.ClientSecret)

	// Repositories
	userRepo := postgres.NewUserRepository(db)
	siteRepo := postgres.NewSiteRepository(db)
	keywordRepo := postgres.NewKeywordRepository(db)
	articleRepo := postgres.NewArticleRepository(db)
	sitePageRepo := postgres.NewSitePageRepository(db)
	pageAnalysisRepo := postgres.NewPageAnalysisRepository(db)
	serpHistoryRepo := postgres.NewSerpHistoryRepository(db)
	siteMemberRepo := postgres.NewSiteMemberRepository(db)

	// Services (inject ports)
	authService := serviceimpl.NewAuthService(userRepo, siteMemberRepo, cfg.Google.ClientID, cfg.Google.ClientSecret, cfg.Google.RedirectURL)
	siteService := serviceimpl.NewSiteService(siteRepo, sitePageRepo, keywordRepo, siteMemberRepo, aiEngine)
	keywordService := serviceimpl.NewKeywordService(keywordRepo)
	articleService := serviceimpl.NewArticleService(articleRepo, keywordRepo, siteRepo, aiEngine, db)

	return &Container{
		Config:         cfg,
		AuthService:    authService,
		SiteService:    siteService,
		KeywordService: keywordService,
		ArticleService: articleService,
		SiteRepo:       siteRepo,
		ArticleRepo:    articleRepo,
		SitePageRepo:     sitePageRepo,
		KeywordRepo:      keywordRepo,
		PageAnalysisRepo: pageAnalysisRepo,
		SerpHistoryRepo:  serpHistoryRepo,
		SiteMemberRepo:  siteMemberRepo,
		UserRepo:         userRepo,
		AIEngine:       aiEngine,
		GoogleOAuth:    googleOAuth,
	}
}
