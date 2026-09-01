# Refactor Checklist — Port/Adapter + Clean Architecture ✅ ALL DONE

> **เป้าหมาย**: ทุก external dependency ถอด/เสียบ/เปลี่ยนได้ง่าย
> **หลักการ**: Service depend on Port (interface) → Infrastructure implement Port
> **สถานะ**: ✅ Refactor เสร็จสมบูรณ์ — ทั้ง Python + Go

---

## สรุปปัญหาปัจจุบัน

| ถ้าต้องเปลี่ยน | ตอนนี้ต้องแก้ | หลัง refactor |
|----------------|-------------|---------------|
| Gemini → OpenAI/Claude | 5+ files (Python) | 1 file (สร้าง adapter ใหม่) |
| WordPress → Ghost/Shopify | 2 files | 1 file |
| Google Scraping → SerpAPI | 2 files | 1 file |
| GSC → Bing Webmaster | 2 files | 1 file |
| BS4 Crawler → Playwright | 3 files | 1 file |
| AI Engine HTTP → gRPC | 5+ files (Go) | 1 file |

---

## Part 1: Python AI Engine — Port/Adapter

### 1.1 สร้าง Port interfaces (domain/ports/)

- [ ] `domain/ports/__init__.py`
- [ ] `domain/ports/llm_port.py` — LLM abstraction
  ```python
  class LLMPort(ABC):
      async def generate(self, prompt, system_prompt, temperature) -> str
      async def generate_json(self, prompt, system_prompt) -> str
  ```
- [ ] `domain/ports/scraper_port.py` — Web crawler abstraction
  ```python
  class ScraperPort(ABC):
      async def crawl(self, url, max_pages) -> dict
  ```
- [ ] `domain/ports/serp_port.py` — SERP analysis abstraction
  ```python
  class SERPPort(ABC):
      async def analyze(self, keyword) -> dict
  ```
- [ ] `domain/ports/cms_port.py` — CMS publish abstraction
  ```python
  class CMSPort(ABC):
      async def publish(self, title, content, slug, meta_desc, **config) -> dict
      async def update(self, post_id, title, content, slug, meta_desc, **config) -> dict
  ```
- [ ] `domain/ports/search_console_port.py` — Search console abstraction
  ```python
  class SearchConsolePort(ABC):
      def get_page_metrics(self, page_url, days) -> dict
  ```

### 1.2 สร้าง Adapter implementations (infrastructure/adapters/)

- [ ] `infrastructure/__init__.py`
- [ ] `infrastructure/adapters/__init__.py`
- [ ] `infrastructure/adapters/gemini_adapter.py` — implements LLMPort
- [ ] `infrastructure/adapters/openai_adapter.py` — implements LLMPort (stub สำหรับอนาคต)
- [ ] `infrastructure/adapters/bs4_crawler_adapter.py` — implements ScraperPort
- [ ] `infrastructure/adapters/google_serp_adapter.py` — implements SERPPort
- [ ] `infrastructure/adapters/wordpress_adapter.py` — implements CMSPort
- [ ] `infrastructure/adapters/gsc_adapter.py` — implements SearchConsolePort

### 1.3 Refactor Services ให้ depend on Ports

- [ ] `services/article_writer.py` — เปลี่ยน `GeminiClient` → `LLMPort`
- [ ] `services/site_analyzer.py` — เปลี่ยน `GeminiClient` → `LLMPort`, `Crawler` → `ScraperPort`
- [ ] `services/competitor_profiler.py` — เปลี่ยน `GeminiClient` → `LLMPort`, `Crawler` → `ScraperPort`
- [ ] `services/topic_cluster.py` — เปลี่ยน `GeminiClient` → `LLMPort`
- [ ] `services/ranking_optimizer.py` — เปลี่ยนไม่สร้าง ArticleWriter ตรงใน method
- [ ] `services/keyword_discovery.py` — เปลี่ยน `GSCClient` → `SearchConsolePort`
- [ ] `services/serp_analyzer.py` — ย้ายไป adapter (implements SERPPort)
- [ ] `services/cms_publisher.py` — ย้ายไป adapter (implements CMSPort)
- [ ] `services/crawler.py` — ย้ายไป adapter (implements ScraperPort)

### 1.4 สร้าง DI Container (Python)

- [ ] `pkg/di/container.py` — สร้าง + wire adapters ทั้งหมด
- [ ] `main.py` — ใช้ container แทนการสร้าง objects ตรงใน endpoint

### 1.5 ทดสอบ

- [ ] `python -c "from main import app"` โหลดได้
- [ ] ทดสอบ generate article ทำงานเหมือนเดิม
- [ ] ทดสอบ publish ทำงานเหมือนเดิม

---

## Part 2: Go Backend — Port/Adapter

### 2.1 สร้าง Port interfaces (domain/ports/)

- [ ] `domain/ports/ai_engine_port.go` — AI Engine abstraction
  ```go
  type AIEnginePort interface {
      GenerateArticle(ctx, req) (*GenerateResult, error)
      PublishArticle(ctx, req) (*PublishResult, error)
      RewriteTitle(ctx, title, keyword, apiKey) (string, error)
      ExpandArticle(ctx, content, keyword, apiKey) (string, error)
      FetchMetrics(ctx, req) (*MetricsResult, error)
      OptimizeArticle(ctx, req) (*OptimizeResult, error)
      DecideOptimization(ctx, metrics) (string, error)
      AnalyzeSite(ctx, req) (map[string]any, error)
      DiscoverKeywords(ctx, req) ([]map[string]any, error)
      CreateCluster(ctx, req) (map[string]any, error)
      AnalyzeCompetitor(ctx, req) (map[string]any, error)
  }
  ```
- [ ] `domain/ports/google_oauth_port.go` — Google OAuth abstraction
  ```go
  type GoogleOAuthPort interface {
      GetAuthURL(state string) string
      ExchangeCode(code string) (*TokenResponse, error)
      GetUserInfo(accessToken string) (*GoogleUserInfo, error)
      RefreshAccessToken(refreshToken string) (string, error)
  }
  ```
- [ ] `domain/ports/gsc_port.go` — GSC abstraction
  ```go
  type GSCPort interface {
      FetchProperties(accessToken string) ([]Property, error)
  }
  ```

### 2.2 สร้าง Adapter implementations (infrastructure/)

- [ ] `infrastructure/ai_engine/client.go` — implements AIEnginePort (HTTP client)
- [ ] `infrastructure/google/oauth_adapter.go` — implements GoogleOAuthPort
- [ ] `infrastructure/google/gsc_adapter.go` — implements GSCPort

### 2.3 Refactor Services

- [ ] `application/serviceimpl/article_service_impl.go`
  - [ ] ลบ `callAIEngine()` helper
  - [ ] Inject `AIEnginePort` ผ่าน constructor
  - [ ] ใช้ `s.aiEngine.GenerateArticle(ctx, req)` แทน HTTP call
- [ ] `application/serviceimpl/auth_service_impl.go`
  - [ ] Inject `GoogleOAuthPort` ผ่าน constructor (ถ้ามี Google API call)

### 2.4 Refactor Handlers

- [ ] `interfaces/api/handlers/site_handler.go`
  - [ ] ลบ HTTP calls ทั้งหมด (Analyze, Discover, Cluster, Competitor)
  - [ ] ย้ายไป service layer ที่ใช้ AIEnginePort
  - [ ] Handler ทำแค่ parse request + call service + return response
- [ ] `interfaces/api/handlers/auth_handler.go`
  - [ ] ลบ `exchangeCodeForToken()`, `getGoogleUserInfo()`
  - [ ] ใช้ `GoogleOAuthPort` แทน
- [ ] `interfaces/api/handlers/gsc_handler.go`
  - [ ] ลบ `exchangeCode()`, `refreshAccessToken()`, `fetchProperties()`
  - [ ] ใช้ `GoogleOAuthPort` + `GSCPort` แทน

### 2.5 อัพเดท DI Container

- [ ] `pkg/di/container.go`
  - [ ] สร้าง AI Engine adapter
  - [ ] สร้าง Google OAuth adapter
  - [ ] สร้าง GSC adapter
  - [ ] Inject adapters เข้า services + handlers

### 2.6 ทดสอบ

- [ ] `go build ./cmd/api/` ผ่าน
- [ ] ทดสอบ login ทำงานเหมือนเดิม
- [ ] ทดสอบ generate + publish ทำงานเหมือนเดิม
- [ ] ทดสอบ GSC connect ทำงานเหมือนเดิม

---

## Part 3: Verify + Cleanup

- [ ] ลบไฟล์เก่าที่ไม่ใช้ (ถ้ามี)
- [ ] อัพเดท CHECKLIST.md
- [ ] ทดสอบ end-to-end ทั้งหมด
- [ ] Go build + Python load ผ่าน
- [ ] Frontend build ผ่าน

---

## ลำดับการทำ (แนะนำ)

```
1. Python Part 1.1 (สร้าง Ports)           — 5 files ใหม่
2. Python Part 1.2 (สร้าง Adapters)        — 6 files ใหม่
3. Python Part 1.3 (Refactor Services)      — 9 files แก้
4. Python Part 1.4 (DI Container)           — 2 files
5. Python Part 1.5 (ทดสอบ)                 — verify
6. Go Part 2.1 (สร้าง Ports)               — 3 files ใหม่
7. Go Part 2.2 (สร้าง Adapters)            — 3 files ใหม่
8. Go Part 2.3-2.4 (Refactor)              — 5 files แก้
9. Go Part 2.5 (DI Container)              — 1 file แก้
10. Go Part 2.6 (ทดสอบ)                    — verify
11. Part 3 (Cleanup + E2E test)
```

---

## หลัง Refactor เสร็จ — สิ่งที่จะเปลี่ยนได้ง่ายๆ

| ต้องการ | ทำยังไง |
|---------|---------|
| เปลี่ยน LLM เป็น OpenAI | สร้าง `openai_adapter.py` + เปลี่ยนใน DI container |
| เปลี่ยน CMS เป็น Ghost | สร้าง `ghost_adapter.py` + เปลี่ยนใน DI container |
| เปลี่ยน Crawler เป็น Playwright | สร้าง `playwright_adapter.py` + เปลี่ยนใน DI container |
| เปลี่ยน SERP เป็น SerpAPI | สร้าง `serpapi_adapter.py` + เปลี่ยนใน DI container |
| เปลี่ยน AI Engine เป็น gRPC | สร้าง `grpc_adapter.go` + เปลี่ยนใน DI container |
| เพิ่ม LLM provider ใหม่ | สร้าง adapter ใหม่ ไม่ต้องแก้ service เลย |
