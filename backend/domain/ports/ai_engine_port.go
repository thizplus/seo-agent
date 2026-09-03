package ports

import "context"

// AIEnginePort — Port สำหรับ AI Engine (Python service)
// ถ้าอนาคตเปลี่ยนจาก HTTP → gRPC แก้แค่ adapter
type AIEnginePort interface {
	GenerateArticle(ctx context.Context, req map[string]any) (map[string]any, error)
	PublishArticle(ctx context.Context, req map[string]any) (map[string]any, error)
	FetchMetrics(ctx context.Context, req map[string]any) (map[string]any, error)
	DecideOptimization(ctx context.Context, metrics map[string]any) (map[string]any, error)
	OptimizeArticle(ctx context.Context, req map[string]any) (map[string]any, error)
	AnalyzeSite(ctx context.Context, req map[string]any) (map[string]any, error)
	DiscoverKeywords(ctx context.Context, req map[string]any) (map[string]any, error)
	CreateCluster(ctx context.Context, req map[string]any) (map[string]any, error)
	AnalyzeCompetitor(ctx context.Context, req map[string]any) (map[string]any, error)
	GenerateImages(ctx context.Context, req map[string]any) (map[string]any, error)
	FindImages(ctx context.Context, req map[string]any) (map[string]any, error)
	SearchImages(ctx context.Context, req map[string]any) (map[string]any, error)
	UploadSelectedImages(ctx context.Context, req map[string]any) (map[string]any, error)
	DeleteMedia(ctx context.Context, req map[string]any) (map[string]any, error)
	DeleteWPPost(ctx context.Context, req map[string]any) (map[string]any, error)
	RunAutoPipeline(ctx context.Context, req map[string]any) (map[string]any, error)
	AnalyzeSERP(ctx context.Context, keyword string) (map[string]any, error)
	CrawlPages(ctx context.Context, req map[string]any) (map[string]any, error)
	AnalyzePage(ctx context.Context, req map[string]any) (map[string]any, error)
	UploadFile(ctx context.Context, fileData []byte, filename string, altText string) (map[string]any, error)
	ScrapePageImages(ctx context.Context, pageURL string) (map[string]any, error)
	ReviewArticle(ctx context.Context, req map[string]any) (map[string]any, error)
	RewriteArticle(ctx context.Context, req map[string]any) (map[string]any, error)
}
