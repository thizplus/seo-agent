# SEO Agents - System Status Report

**วันที่สรุป:** 1 กันยายน 2026
**สถานะ:** ระบบทำงานได้แล้ว (Functional)

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [Architecture](#2-architecture)
3. [Docker & Infrastructure](#3-docker--infrastructure)
4. [Backend (Go)](#4-backend-go)
5. [AI Engine (Python)](#5-ai-engine-python)
6. [Frontend (React/Next.js)](#6-frontend-reactnextjs)
7. [4-Step SEO Pipeline](#7-4-step-seo-pipeline)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints-ทั้งหมด)
10. [Credentials & Config](#10-credentials--config)
11. [Known Issues & Fixes](#11-known-issues--fixes)
12. [File Map](#12-file-map-สำคัญ)

---

## 1. ภาพรวมระบบ

SEO Agents เป็นระบบ AI-powered SEO automation ที่ช่วย:
- วิเคราะห์เว็บไซต์และ SERP อัตโนมัติ
- ค้นหา keyword ที่มีโอกาสจาก Google Suggest + GSC + SERP
- สร้างบทความ EEAT (Experience, Expertise, Authority, Trust)
- Publish ไปยัง WordPress อัตโนมัติ
- ติดตาม ranking + optimize บทความจาก GSC metrics

### เว็บไซต์ที่ใช้งาน
| Site | Domain | ธุรกิจ |
|------|--------|--------|
| adliteandfavbric.com | adliteandfavbric.com | บูธผ้า, อุปกรณ์ออกบูธ |
| flexframeth.com | flexframeth.com | - |
| displayplusth.com | displayplusth.com | - |
| ideahead.co.th | ideahead.co.th | POSM, ดิสเพลย์, สติ๊กเกอร์ |

WP username ทุกเว็บ: `webmaster`

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ Frontend  │───→│ Backend  │───→│   AI Engine      │   │
│  │ Next.js   │    │ Go Fiber │    │   FastAPI         │   │
│  │ :3000     │    │ :3001    │    │   :8000           │   │
│  └──────────┘    └────┬─────┘    └────────┬──────────┘   │
│                       │                    │              │
│                  ┌────┴─────┐         ┌────┴──────┐      │
│                  │PostgreSQL│         │ External   │      │
│                  │  :5432   │         │ APIs       │      │
│                  └──────────┘         │- Serper    │      │
│                  ┌──────────┐         │- Gemini    │      │
│                  │  Redis   │         │- OpenAI    │      │
│                  │  :6379   │         │- WordPress │      │
│                  └──────────┘         │- GSC       │      │
│                                       └───────────┘      │
└─────────────────────────────────────────────────────────┘
```

### หลักการสำคัญ
- **Orchestrate จาก Go backend เท่านั้น** — Python AI Engine เป็นแค่ worker
- **Articles generate เป็น draft** → คนตรวจก่อน → Publish เอง
- **Per-site credentials** — แต่ละ site มี LLM key, WP creds, GSC token แยกกัน (เก็บใน DB)
- **Clean Architecture** ทั้ง Backend + AI Engine (Port/Adapter pattern)

---

## 3. Docker & Infrastructure

### Services (5 containers)

| Service | Container | Port | Image/Build | Healthcheck |
|---------|-----------|------|-------------|-------------|
| PostgreSQL | seo_agents_db | 5432 | postgres:16-alpine | pg_isready |
| Redis | seo_agents_redis | 6379 | redis:7-alpine | redis-cli ping |
| AI Engine | seo_agents_ai | 8000 | ./ai-engine (Python 3.12) | HTTP /health |
| Backend | seo_agents_backend | 3001 | ./backend (Go 1.24) | HTTP /api/v1/health |
| Frontend | seo_agents_frontend | 3000 | ./frontend (Node 22) | depends_on backend |

### Start Commands
```bash
docker-compose up -d              # เปิดทุกอย่าง
docker-compose logs -f            # ดู log real-time
docker-compose down               # หยุดทุกอย่าง
docker-compose up --build -d      # rebuild ทั้งหมด
docker-compose build --no-cache [service]  # rebuild ไม่ cache
```

### Dependency Chain
```
postgres + redis → ai-engine → backend → frontend
```

### Volumes
- `postgres_data` — PostgreSQL persistent data
- `redis_data` — Redis persistent data

### CRITICAL: Docker Only
- ห้ามรัน services ข้างนอก Docker บน Windows
- จะเกิด zombie port ถ้ารันข้างนอกแล้ว kill → ต้อง restart เครื่อง

---

## 4. Backend (Go)

### Tech Stack
| Component | Technology |
|-----------|-----------|
| Language | Go 1.24.3 |
| Web Framework | Fiber v2.52 |
| ORM | GORM (PostgreSQL) |
| Auth | JWT (HS256, 7-day expiry) |
| Scheduler | robfig/cron/v3 |
| Architecture | Clean Architecture (DDD) |

### Project Structure (60 Go files)
```
backend/
├── cmd/api/main.go                          # Entry point
├── application/serviceimpl/                 # Service implementations (4)
│   ├── auth_service_impl.go                 #   Google OAuth login/register
│   ├── site_service_impl.go                 #   Site CRUD + AI orchestration
│   ├── keyword_service_impl.go              #   Keyword management
│   └── article_service_impl.go              #   Article gen/publish/optimize
├── domain/
│   ├── models/                              # Entity structs (14 tables)
│   │   ├── user.go, site.go, keyword.go
│   │   ├── article.go, article_version.go
│   │   ├── site_page.go, page_analysis.go
│   │   ├── competitor.go, keyword_opportunity.go
│   │   └── topic_cluster.go
│   ├── dto/                                 # Request/Response DTOs (6)
│   │   ├── site_dto.go, auth_dto.go, article_dto.go
│   │   ├── keyword_dto.go, page_analysis_dto.go
│   │   ├── site_page_dto.go, helpers.go
│   ├── services/                            # Service interfaces (4)
│   ├── repositories/                        # Repository interfaces (6)
│   └── ports/                               # External service ports (2)
│       ├── ai_engine_port.go                #   27 methods → Python AI Engine
│       └── google_oauth_port.go             #   Google OAuth + GSC
├── infrastructure/
│   ├── postgres/                            # DB connection + 6 repos
│   │   ├── db.go                            #   Connect + AutoMigrate (14 tables)
│   │   ├── user_repo.go, site_repo.go
│   │   ├── keyword_repo.go, article_repo.go
│   │   ├── site_page_repo.go, page_analysis_repo.go
│   ├── ai_engine/client.go                  # HTTP client → AI Engine
│   └── google/oauth_adapter.go              # Google OAuth adapter
├── interfaces/api/
│   ├── handlers/                            # HTTP handlers (6)
│   │   ├── auth_handler.go                  #   Login, Callback, Me
│   │   ├── site_handler.go                  #   CRUD + Analyze + Pipeline
│   │   ├── keyword_handler.go               #   CRUD + SERP
│   │   ├── article_handler.go               #   Generate + Publish + Images
│   │   ├── page_handler.go                  #   Pages + Analysis
│   │   └── gsc_handler.go                   #   GSC OAuth + Properties
│   ├── middleware/middleware.go              # RequestID, Logger, CORS, Auth
│   └── routes/routes.go                     # All route definitions
├── pkg/
│   ├── config/config.go                     # Config struct
│   ├── di/container.go                      # Dependency injection
│   ├── auth/jwt.go                          # JWT gen/validate
│   ├── logger/logger.go                     # slog structured logging
│   ├── utils/response.go                    # Response helpers
│   ├── utils/random.go                      # Random string
│   └── scheduler/scheduler.go               # Cron jobs (3 tasks)
└── Dockerfile                               # Multi-stage Alpine build
```

### Initialization Flow (main.go)
```
1. Load .env (../../.env → ../.env → .env)
2. Init slog logger
3. Load config
4. Init JWT
5. Connect PostgreSQL + AutoMigrate 14 tables
6. Create DI Container (repos → services → ports)
7. Setup Fiber + middleware (RequestID → Logger → CORS → Auth)
8. Setup routes
9. Start scheduler (3 cron jobs)
10. Listen :3001
```

### Middleware Chain (ลำดับสำคัญ)
1. **RequestID** — Generate unique request_id
2. **Logger** — Log request method, path, status, duration
3. **CORS** — Allow frontend URL only
4. **AuthMiddleware** — JWT validation (protected routes only)

### Scheduler / Cron Jobs
| Job | Schedule | ทำอะไร |
|-----|----------|--------|
| Page Analysis | 03:00 daily | SERP top 10 + on-page audit ทุก page/keyword |
| Content Gen | 06:00 daily | Generate max 3 articles/site/day |
| Ranking Track | */12 hours | GSC metrics + auto optimize published articles |

### Response Pattern
```json
{
  "success": true,
  "data": { ... },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": null
  }
}
```

---

## 5. AI Engine (Python)

### Tech Stack
| Component | Technology |
|-----------|-----------|
| Language | Python 3.12 |
| Web Framework | FastAPI 0.115 |
| ASGI Server | Uvicorn |
| HTTP Client | httpx (async) |
| Web Scraping | BeautifulSoup4 |
| Image Processing | Pillow |

### Project Structure (60+ Python files)
```
ai-engine/
├── main.py                                  # FastAPI app (37 endpoints)
├── models/schemas.py                        # Pydantic DTOs (17 classes)
├── domain/ports/                            # Abstract interfaces (8 ports)
│   ├── llm_port.py                          #   LLM abstraction
│   ├── serp_port.py                         #   SERP abstraction
│   ├── scraper_port.py                      #   Web scraper
│   ├── cms_port.py                          #   CMS (WordPress)
│   ├── search_console_port.py               #   GSC
│   ├── image_gen_port.py                    #   Image generation
│   ├── image_search_port.py                 #   Image search
│   └── image_storage_port.py                #   Image storage
├── infrastructure/adapters/                 # Implementations (30 adapters)
│   ├── gemini_adapter.py                    #   Gemini 2.5 Flash (default)
│   ├── openai_adapter.py                    #   GPT-4o
│   ├── claude_adapter.py                    #   Claude Sonnet 4
│   ├── deepseek_adapter.py                  #   DeepSeek
│   ├── groq_adapter.py                      #   Groq
│   ├── mistral_adapter.py                   #   Mistral
│   ├── serper_adapter.py                    #   Serper.dev (SERP หลัก)
│   ├── bs4_crawler_adapter.py               #   BS4 web crawler
│   ├── wordpress_adapter.py                 #   WP REST API + Gutenberg
│   ├── wp_media_adapter.py                  #   WP Media Library
│   ├── gsc_adapter.py                       #   GSC OAuth adapter
│   ├── google_image_search_adapter.py       #   Google image search
│   ├── pexels_adapter.py                    #   Pexels API
│   ├── unsplash_adapter.py                  #   Unsplash API
│   ├── pixabay_adapter.py                   #   Pixabay API
│   ├── multi_image_search_adapter.py        #   Multi-source aggregator
│   ├── gemini_image_adapter.py              #   Gemini Imagen
│   ├── dalle_adapter.py                     #   DALL-E 3
│   └── ...                                 #   + อื่นๆ
├── services/                                # Core business logic (15)
│   ├── article_writer.py                    #   Generate EEAT articles
│   ├── page_analyzer.py                     #   SERP + on-page audit
│   ├── site_analyzer.py                     #   Full site analysis
│   ├── crawler.py                           #   Web crawler (sitemap + BFS)
│   ├── keyword_discovery.py                 #   Google Suggest + GSC + SERP
│   ├── keyword_scorer.py                    #   Score 0-10 prioritization
│   ├── auto_pipeline.py                     #   Full automation workflow
│   ├── ranking_optimizer.py                 #   Metrics → optimization decisions
│   ├── competitor_profiler.py               #   Competitor analysis
│   ├── topic_cluster.py                     #   Pillar + supporting clusters
│   ├── image_finder.py                      #   Find + WebP + upload images
│   ├── image_generator.py                   #   AI image generation
│   ├── content_formatter.py                 #   Markdown → Gutenberg blocks
│   ├── cms_publisher.py                     #   WordPress publisher
│   └── skill_loader.py                      #   Marketing knowledge base
├── skills/                                  # Marketing knowledge (Markdown)
├── pkg/di/container.py                      # Dependency injection
├── utils/                                   # Gemini + GSC client wrappers
├── requirements.txt                         # Dependencies
└── Dockerfile                               # Python 3.12-slim
```

### LLM Providers (6 ตัว)
| Provider | Model | Adapter |
|----------|-------|---------|
| Gemini | gemini-2.5-flash (default) | GeminiAdapter |
| OpenAI | gpt-4o | OpenAIAdapter |
| Claude | claude-sonnet-4 | ClaudeAdapter |
| DeepSeek | deepseek-chat | DeepSeekAdapter |
| Groq | groq models | GroqAdapter |
| Mistral | mistral models | MistralAdapter |

### SERP: Serper.dev
- ใช้ Serper.dev เป็นหลัก (Google SERP 100% แม่น)
- Region: Thailand (gl=th, hl=th)
- Crawl top 5 results เพื่อนับ word count
- Key: `SERPER_API_KEY` ใน .env

### Core Services Summary

| Service | หน้าที่หลัก |
|---------|-----------|
| ArticleWriter | Generate EEAT articles จาก SERP data + LLM |
| PageAnalyzer | SERP top 10 + on-page audit + recommendations |
| SiteAnalyzer | Full site analysis (business type, brand voice, persona) |
| Crawler | Crawl website via sitemap + BFS (max 50 pages) |
| KeywordDiscovery | Google Suggest (Thai + A-Z) + GSC + SERP related |
| KeywordScorer | Score 0-10 (intent + source + money keyword + long-tail) |
| AutoPipeline | Analyze → Discover → Score → Generate → Publish |
| RankingOptimizer | GSC metrics → decide action (rewrite/expand/fix_index) |
| CompetitorProfiler | Analyze competitor strengths/weaknesses/content gaps |
| TopicCluster | Create pillar + supporting article structure |
| ImageFinder | Search → Download → WebP → Upload WP → Set featured |
| ContentFormatter | Markdown → WordPress Gutenberg blocks |

### Keyword Scoring Logic
| Signal | Bonus |
|--------|-------|
| Transactional intent | +3 |
| Commercial intent | +2 |
| Informational intent | +1 |
| GSC source (with position/impressions) | +2 |
| Money keyword (ราคา, รีวิว, ซื้อ) | +2 |
| Long-tail (3-6 words) | +1 |

### Ranking Optimizer Decision Logic
| Condition | Action |
|-----------|--------|
| impressions < 50 | null (ข้อมูลไม่พอ) |
| not indexed | fix_index |
| CTR < 2% | rewrite_title |
| position 5-15 | expand_content |
| position > 15 | add_internal_links |

---

## 6. Frontend (React/Next.js)

### Tech Stack
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16.2.4 (App Router) |
| UI Library | React 19.2.4 |
| TypeScript | 5.x |
| CSS | Tailwind CSS 4 + shadcn/ui (base-nova) |
| State | React Query (TanStack) 5.x + localStorage |
| HTTP Client | Axios |
| Icons | lucide-react |

### Project Structure
```
frontend/src/
├── app/                                     # Next.js App Router
│   ├── layout.tsx                           # Root layout + providers
│   ├── page.tsx                             # Redirect → /dashboard
│   ├── globals.css                          # Tailwind + theme tokens
│   ├── login/page.tsx                       # Google login
│   ├── auth/google/callback/page.tsx        # OAuth callback
│   └── dashboard/
│       ├── layout.tsx                       # Protected (sidebar + content)
│       ├── page.tsx                         # Dashboard home
│       ├── sites/
│       │   ├── page.tsx                     # Sites table
│       │   ├── new/page.tsx                 # Create site form
│       │   └── [id]/page.tsx                # Site detail (all cards)
│       └── articles/
│           └── [id]/page.tsx                # Article detail editor
├── components/
│   ├── ui/                                  # 17 shadcn/ui components
│   ├── app-sidebar.tsx                      # Collapsible sidebar
│   ├── nav-main.tsx, nav-user.tsx           # Navigation
│   ├── login-form.tsx                       # Google OAuth button
│   ├── auth-guard.tsx                       # Route protection
│   └── page-header.tsx                      # Breadcrumb header
├── features/                                # Feature modules (5)
│   ├── auth/         (types, service, store, index)
│   ├── sites/        (types, service, hooks, 8 components, index)
│   ├── pages/        (types, service, hooks, index)
│   ├── keywords/     (types, service, hooks, index)
│   └── articles/     (types, service, hooks, index)
├── constants/
│   ├── api-routes.ts                        # 30+ centralized endpoints
│   ├── nav.ts                               # Navigation routes
│   └── llm-providers.ts                     # 6 LLM options
├── hooks/use-mobile.ts                      # useIsMobile (768px)
└── lib/
    ├── api-client.ts                        # Axios + JWT interceptors
    ├── providers.tsx                         # QueryClient + Tooltip
    └── utils.ts                             # cn() utility
```

### Routes (8 pages)
| Path | หน้าที่ |
|------|--------|
| `/` | Redirect → /dashboard |
| `/login` | Google OAuth login |
| `/auth/google/callback` | Store JWT, fetch user, redirect |
| `/dashboard` | Stats cards + site list grid |
| `/dashboard/sites` | Sites table |
| `/dashboard/sites/new` | Create site form (info + AI + WP config) |
| `/dashboard/sites/[id]` | Site detail (8 feature cards) |
| `/dashboard/articles/[id]` | Article editor + images + metrics |

### Feature Cards (Site Detail Page)
| Card | หน้าที่ |
|------|--------|
| SiteInfoCard | Edit site info, analyze button, status badges |
| PipelineCard | Run pipeline (analyze → discover → generate) |
| PagesCard | Crawled pages list, SERP analysis per page |
| KeywordsCard | Add/discover keywords, generate articles |
| GscConnectionCard | Connect/disconnect GSC, select property |
| TopicClustersCard | Create pillar + supporting articles |
| CompetitorAnalysisCard | Analyze competitor URL |
| ArticlesCard | List articles per site with status |

### Data Flow
```
Component → useHook() → React Query → service.method() → apiClient → Backend API
```

### Auth Flow
1. User clicks "Login with Google" → redirect to Google OAuth
2. Google callback → Backend exchanges code → returns JWT + user
3. Frontend stores in localStorage (`seo_agents_token`, `seo_agents_user`)
4. Axios interceptor attaches JWT to all requests
5. AuthGuard checks localStorage on protected routes

### React Query Hooks (20+)
- Sites: `useSiteList`, `useSiteDetail`, `useCreateSite`, `useUpdateSite`, `useDeleteSite`, `useAnalyzeSite`, `useDiscoverKeywords`, `useCreateCluster`, `useRunPipeline`, `useAnalyzeCompetitor`, `useGscProperties`, `useSelectGscProperty`, `useDisconnectGsc`
- Pages: `usePageList`, `useAnalyzePage`
- Keywords: `useKeywordList`, `useCreateKeyword`, `useAnalyzeSERP`
- Articles: `useArticleList`, `useArticleDetail`, `useGenerateArticle`, `usePublishArticle`

---

## 7. 4-Step SEO Pipeline

### Overview
```
Step 1: Pipeline    →  Step 2: Page Analysis  →  Step 3: Content Gen  →  Step 4: Ranking Track
(Manual trigger)       (Daily 03:00)              (Daily 06:00)           (Every 12 hours)
```

### Step 1: Pipeline (Manual)
**Trigger:** กดปุ่ม "Run Pipeline" ใน UI
**ทำอะไร:**
1. Crawl pages จากเว็บไซต์ (sitemap + BFS, max 50 pages)
2. LLM วิเคราะห์ business type, industry, brand voice, target persona
3. Extract keywords ต่อ page (LLM เลือก + score + intent)
4. บันทึก site_pages + keywords ลง DB

### Step 2: Page Analysis (Daily 03:00)
**Trigger:** Cron job หรือกดปุ่ม
**ทำอะไร:**
1. ดึงทุก site ที่มี LLM API key
2. ทุก page + ทุก keyword → Serper.dev ดึง SERP top 10
3. On-page audit: word count, H1, meta, H2 count
4. เทียบกับ competitor → audit score (0-100)
5. LLM สร้าง recommendations
6. บันทึก page_analyses + keyword_serp_history

### Step 3: Content Generation (Daily 06:00)
**Trigger:** Cron job หรือกดปุ่ม
**ทำอะไร:**
1. ดึงทุก site ที่มี LLM key + WordPress URL
2. เช็ค keyword ที่ยังไม่มี article
3. Generate EEAT article (ใช้ SERP data + marketing skills)
4. Max 3 articles/site/day (ป้องกัน rate limit)
5. บันทึก articles + article_versions

### Step 4: Ranking Track (Every 12 Hours)
**Trigger:** Cron job
**ทำอะไร:**
1. ดึงทุก site ที่มี GSC refresh token
2. ทุก published article → fetch GSC metrics (clicks, impressions, CTR, position)
3. LLM ตัดสินใจ optimization: rewrite title, expand content, add internal links, fix index
4. Apply changes + log ใน optimization_logs

### Article Generation Flow (Detail)
```
Keyword
  ↓
Serper.dev → SERP top 10 + word count analysis
  ↓
SkillLoader → Marketing knowledge (copywriting, SEO)
  ↓
LLM (Gemini/OpenAI/Claude) → Generate EEAT article
  ↓
JSON parse (strip backticks) → title, slug, content (Markdown), meta, EEAT score
  ↓
Save to DB (status: generated, publishStatus: draft)
  ↓
[Manual] Publish → ContentFormatter (Markdown → Gutenberg) → WordPress REST API
```

---

## 8. Database Schema

### Tables (14 total, GORM AutoMigrate)

| Table | หน้าที่ | Key Fields |
|-------|--------|------------|
| **users** | Google OAuth users | id, google_id, email, name, avatar_url |
| **sites** | เว็บไซต์ของ user | id, user_id, url, name, llm_provider, llm_api_key, wp_url/username/password, gsc_refresh_token |
| **site_pages** | หน้าเว็บที่ crawl | id, site_id, url, title, h1, page_type, word_count |
| **keywords** | Keywords per site/page | id, site_id, page_id, keyword, search_volume, difficulty, intent, score, serp_data |
| **articles** | บทความที่ generate | id, site_id, keyword_id, title, slug, content, status, publish_status, eeat_score, word_count |
| **article_images** | รูปภาพในบทความ | id, article_id, url, alt_text, role (featured/content) |
| **article_metrics** | GSC metrics | id, article_id, impressions, clicks, ctr, avg_position, indexed |
| **article_versions** | Version history | id, article_id, version, title, content, action |
| **optimization_logs** | Optimization actions | id, article_id, action, reason, before_data, after_data |
| **page_analyses** | On-page audit results | id, page_id, audit_score, issues, recommendations, serp_snapshots |
| **keyword_serp_history** | SERP tracking daily | id, keyword_id, checked_at, our_position, results, changes |
| **keyword_opportunities** | Discovered keywords | id, site_id, keyword, source, intent, score, status |
| **topic_clusters** | Topic clusters | id, site_id, main_keyword, pillar_article_id, cluster_data |
| **competitors** | Competitor data | id, site_id, url, analysis_data |

### Entity Relationships
```
User 1──N Site
Site 1──N SitePage
Site 1──N Keyword
Site 1──N Article
Site 1──N KeywordOpportunity
Site 1──N TopicCluster
Site 1──N Competitor
SitePage 1──N Keyword (optional)
SitePage 1──N PageAnalysis
Keyword 1──N Article (optional)
Keyword 1──N KeywordSerpHistory
Article 1──N ArticleImage
Article 1──N ArticleMetrics
Article 1──N ArticleVersion
Article 1──N OptimizationLog
TopicCluster 1──1 Article (pillar, optional)
```

---

## 9. API Endpoints ทั้งหมด

### Backend API (Go, :3001)

#### Public
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/auth/google` | Google OAuth redirect |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |
| GET | `/api/v1/auth/gsc/connect/:id` | GSC OAuth start |
| GET | `/api/v1/auth/gsc/callback` | GSC OAuth callback |

#### Protected (JWT Required)
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/auth/me` | Current user |
| **Sites** |
| POST | `/api/v1/sites/` | Create site |
| GET | `/api/v1/sites/` | List user's sites |
| GET | `/api/v1/sites/:id` | Get site detail |
| PUT | `/api/v1/sites/:id` | Update site |
| DELETE | `/api/v1/sites/:id` | Delete site |
| POST | `/api/v1/sites/:id/analyze` | Analyze site (Step 1) |
| POST | `/api/v1/sites/:id/discover-keywords` | Discover keywords |
| POST | `/api/v1/sites/:id/clusters` | Create topic cluster |
| POST | `/api/v1/sites/:id/competitors` | Analyze competitor |
| POST | `/api/v1/sites/:id/pipeline` | Run 4-step pipeline |
| GET | `/api/v1/sites/:id/gsc/properties` | Fetch GSC properties |
| POST | `/api/v1/sites/:id/gsc/select` | Select GSC property |
| DELETE | `/api/v1/sites/:id/gsc` | Disconnect GSC |
| **Pages** |
| GET | `/api/v1/sites/:id/pages` | List pages |
| POST | `/api/v1/sites/:id/pages/:pageId/analyze` | Analyze page |
| GET | `/api/v1/sites/:id/pages/:pageId/analysis` | Get analysis |
| **Keywords** |
| POST | `/api/v1/sites/:id/keywords` | Create keyword |
| GET | `/api/v1/sites/:id/keywords` | List keywords |
| POST | `/api/v1/sites/:id/keywords/:kwId/analyze-serp` | SERP analysis |
| **Articles** |
| POST | `/api/v1/articles/generate` | Generate article |
| GET | `/api/v1/articles/:id` | Get article |
| GET | `/api/v1/sites/:id/articles` | List site articles |
| POST | `/api/v1/articles/:id/publish` | Publish to WordPress |
| POST | `/api/v1/articles/:id/optimize` | Run optimizer |
| GET | `/api/v1/articles/:id/metrics` | Get GSC metrics |
| GET | `/api/v1/articles/:id/versions` | Get versions |
| GET | `/api/v1/articles/:id/images` | Get images |
| DELETE | `/api/v1/articles/:id` | Delete article |
| DELETE | `/api/v1/articles/:id/images/:imageId` | Delete image |
| POST | `/api/v1/articles/search-images` | Search images |
| POST | `/api/v1/articles/:id/upload-images` | Upload images |
| POST | `/api/v1/articles/:id/find-images` | Find images |
| POST | `/api/v1/articles/:id/generate-images` | Generate images |

### AI Engine API (Python, :8000)
| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/health` | Health check |
| GET | `/skills` | List marketing skills |
| POST | `/generate-article` | Generate EEAT article |
| POST | `/rewrite-title` | Optimize title for CTR |
| POST | `/expand-article` | Expand article content |
| POST | `/publish-article` | Publish to WordPress |
| POST | `/analyze-page` | SERP + on-page audit |
| POST | `/analyze-site` | Full site analysis |
| POST | `/crawl-pages` | Crawl website pages |
| POST | `/discover-keywords` | Find keywords |
| GET | `/analyze-serp` | SERP analysis |
| POST | `/fetch-metrics` | GSC metrics |
| POST | `/decide-optimization` | LLM decide optimization |
| POST | `/optimize-article` | Execute optimization |
| POST | `/search-images` | Search free images |
| POST | `/upload-selected-images` | Upload → WebP → WP |
| POST | `/delete-media` | Delete WP media |
| POST | `/generate-images` | AI image generation |
| POST | `/create-cluster` | Create topic cluster |
| POST | `/analyze-competitor` | Competitor profiling |
| POST | `/auto-pipeline` | Full automation |
| POST | `/delete-wp-post` | Delete WP post |

---

## 10. Credentials & Config

### .env (Root level, shared)
| Key | Value | หน้าที่ |
|-----|-------|--------|
| DB_HOST | 127.0.0.1 (Docker: postgres) | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_USER | seo_agents | DB username |
| DB_PASSWORD | seo_agents_secret | DB password |
| DB_NAME | seo_agents | DB name |
| REDIS_URL | redis://localhost:6379 | Redis (currently unused) |
| AI_ENGINE_URL | http://localhost:8000 (Docker: http://ai-engine:8000) | AI Engine URL |
| APP_PORT | 3001 | Backend port |
| FRONTEND_URL | http://localhost:3000 | Frontend URL (CORS) |
| GOOGLE_CLIENT_ID | 459653386... | Google OAuth |
| GOOGLE_CLIENT_SECRET | GOCSPX-... | Google OAuth |
| GOOGLE_REDIRECT_URL | http://localhost:3001/api/v1/auth/google/callback | OAuth callback |
| JWT_SECRET | seo-agents-jwt-secret-2026... | JWT signing |
| SERPER_API_KEY | d4e8e7f0e55... | Serper.dev SERP API |

### Per-Site Credentials (เก็บใน DB, ผ่าน UI)
| Field | หน้าที่ |
|-------|--------|
| llm_provider | LLM ที่ใช้ (gemini/openai/claude/deepseek/groq/mistral) |
| llm_api_key | API key ของ LLM |
| wp_url | WordPress URL |
| wp_username | WordPress username |
| wp_app_password | WordPress app password |
| gsc_refresh_token | Google Search Console OAuth token |
| gsc_site_url | GSC property URL |

---

## 11. Known Issues & Fixes

### Bugs ที่แก้แล้ว
| Bug | วิธีแก้ | สถานะ |
|-----|---------|--------|
| Gemini returns JSON wrapped in \`\`\`json | Parser strip backticks ก่อน json.loads | Fixed |
| Generate fail → article record ค้าง | ลบ article record ถ้า generate fail | Fixed |
| Google SERP scraping ถูก block จาก Docker | ใช้ Serper.dev API แทน | Fixed |
| DuckDuckGo ไม่แม่นกับ keyword ไทย | ใช้ Serper.dev (Google 100%) | Fixed |

### สิ่งที่ต้องระวัง
- **Docker Only** — ห้ามรัน services ข้างนอก Docker บน Windows (zombie port issue)
- **Gemini model** — ใช้ `gemini-2.5-flash` (2.0 deprecated แล้ว)
- **Rate limiting** — Max 3 articles/site/day ใน scheduler
- **SERP delay** — 30s delay ระหว่าง pages, 60s ระหว่าง sites ใน scheduler

---

## 12. File Map สำคัญ

### Config & Infrastructure
| File | หน้าที่ |
|------|--------|
| `docker-compose.yml` | ทุก service + healthcheck + volumes |
| `.env` | Global config (DB, OAuth, JWT, Serper) |
| `backend/Dockerfile` | Go multi-stage Alpine build |
| `ai-engine/Dockerfile` | Python 3.12-slim build |
| `frontend/Dockerfile` | Node 22-alpine dev build |

### Backend Key Files
| File | หน้าที่ |
|------|--------|
| `backend/cmd/api/main.go` | Entry point, init everything |
| `backend/pkg/di/container.go` | Dependency injection |
| `backend/pkg/scheduler/scheduler.go` | 3 cron jobs |
| `backend/pkg/config/config.go` | Config struct |
| `backend/infrastructure/postgres/db.go` | DB connect + AutoMigrate |
| `backend/infrastructure/ai_engine/client.go` | HTTP client → AI Engine |
| `backend/interfaces/api/routes/routes.go` | All route definitions |
| `backend/domain/ports/ai_engine_port.go` | 27-method AI Engine interface |

### AI Engine Key Files
| File | หน้าที่ |
|------|--------|
| `ai-engine/main.py` | FastAPI app, 37 endpoints |
| `ai-engine/pkg/di/container.py` | DI container + factories |
| `ai-engine/services/article_writer.py` | EEAT article generation |
| `ai-engine/services/page_analyzer.py` | SERP + on-page audit |
| `ai-engine/services/auto_pipeline.py` | Full automation workflow |
| `ai-engine/services/ranking_optimizer.py` | GSC metrics → optimization |
| `ai-engine/infrastructure/adapters/serper_adapter.py` | Serper.dev SERP |
| `ai-engine/infrastructure/adapters/gemini_adapter.py` | Gemini LLM |
| `ai-engine/services/content_formatter.py` | Markdown → Gutenberg |

### Frontend Key Files
| File | หน้าที่ |
|------|--------|
| `frontend/src/app/layout.tsx` | Root layout + providers |
| `frontend/src/lib/api-client.ts` | Axios + JWT interceptors |
| `frontend/src/constants/api-routes.ts` | 30+ centralized endpoints |
| `frontend/src/features/auth/store.ts` | localStorage auth |
| `frontend/src/features/sites/hooks.ts` | 14 React Query hooks |
| `frontend/src/features/sites/components/` | 8 feature cards |
| `frontend/src/app/dashboard/sites/[id]/page.tsx` | Site detail page |

### Documentation
| File | หน้าที่ |
|------|--------|
| `PIPELINE_FLOW.md` | 4-step automation flow |
| `PIPELINE_IMPLEMENTATION.md` | Implementation plan (phases) |
| `PAGE_ANALYSIS.md` | Page-level analysis detail |
| `KEYWORD_FLOW.md` | Keyword extraction flow |
| `DOCKER.md` | Docker commands + debug |
| `SYSTEM_STATUS.md` | **This file** — ภาพรวมระบบทั้งหมด |

---

## สรุปสถานะ

| Component | สถานะ | หมายเหตุ |
|-----------|--------|----------|
| Docker Infrastructure | Working | 5 containers, healthchecks |
| Google OAuth Login | Working | Login + GSC OAuth |
| Site CRUD | Working | Create, Read, Update, Delete |
| Pipeline (Crawl + Keywords) | Working | Crawl pages + extract keywords |
| Page Analysis (SERP) | Working | Serper.dev + on-page audit |
| Content Generation | Working | EEAT articles via LLM |
| WordPress Publishing | Working | Gutenberg blocks format |
| Image Management | Working | Search, upload, WebP, featured |
| GSC Integration | Working | Metrics, optimization decisions |
| Competitor Analysis | Working | LLM-powered profiling |
| Topic Clusters | Working | Pillar + supporting structure |
| Scheduler (3 cron jobs) | Working | 03:00, 06:00, */12h |
| Frontend UI | Working | 8 pages, 8 feature cards, 20+ hooks |

**ระบบพร้อมใช้งานเต็มรูปแบบ**
