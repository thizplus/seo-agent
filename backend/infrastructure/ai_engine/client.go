package aiengine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// HTTPClient — HTTP implementation ของ AIEnginePort
type HTTPClient struct {
	baseURL string
}

func NewHTTPClient(baseURL string) *HTTPClient {
	return &HTTPClient{baseURL: baseURL}
}

func (c *HTTPClient) call(ctx context.Context, path string, body any) (map[string]any, error) {
	jsonBody, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+path, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI engine returned status %d", resp.StatusCode)
	}

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

func (c *HTTPClient) GenerateArticle(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/generate-article", req)
}

func (c *HTTPClient) PublishArticle(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/publish-article", req)
}

func (c *HTTPClient) FetchMetrics(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/fetch-metrics", req)
}

func (c *HTTPClient) DecideOptimization(ctx context.Context, metrics map[string]any) (map[string]any, error) {
	return c.call(ctx, "/decide-optimization", metrics)
}

func (c *HTTPClient) OptimizeArticle(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/optimize-article", req)
}

func (c *HTTPClient) AnalyzeSite(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/analyze-site", req)
}

func (c *HTTPClient) DiscoverKeywords(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/discover-keywords", req)
}

func (c *HTTPClient) CreateCluster(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/create-cluster", req)
}

func (c *HTTPClient) AnalyzeCompetitor(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/analyze-competitor", req)
}

func (c *HTTPClient) GenerateImages(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/generate-images", req)
}

func (c *HTTPClient) FindImages(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/find-images", req)
}

func (c *HTTPClient) SearchImages(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/search-images", req)
}

func (c *HTTPClient) UploadSelectedImages(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/upload-selected-images", req)
}

func (c *HTTPClient) DeleteMedia(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/delete-media", req)
}

func (c *HTTPClient) DeleteWPPost(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/delete-wp-post", req)
}

func (c *HTTPClient) RunAutoPipeline(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/auto-pipeline", req)
}

func (c *HTTPClient) CrawlPages(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/crawl-pages", req)
}

func (c *HTTPClient) AnalyzePage(ctx context.Context, req map[string]any) (map[string]any, error) {
	return c.call(ctx, "/analyze-page", req)
}

func (c *HTTPClient) AnalyzeSERP(ctx context.Context, keyword string) (map[string]any, error) {
	jsonBody, _ := json.Marshal(map[string]string{"keyword": keyword})
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/analyze-serp?keyword="+keyword, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}
