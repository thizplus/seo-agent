# SEO Agents — Implementation Checklist

> **สถาปัตยกรรม:** Orchestrate จาก Go backend → Python AI Engine เป็น worker → ทุกอย่างเก็บ DB → Admin UI เห็นหมด
> **Deploy:** `docker-compose up -d` ทีเดียวจบ (5 containers)
> **Credentials:** เก็บ per site ใน DB (LLM key, WP, GSC) ยกเว้น Serper.dev + Google OAuth อยู่ใน .env

---

## Phase 0 — MVP ✅ ALL DONE

### Infrastructure ✅
- [x] `docker-compose.yml` — PostgreSQL + Redis + Backend + AI Engine + Frontend (5 containers)
- [x] Dockerfile ทั้ง 3 services (backend, ai-engine, frontend)
- [x] `.dockerignore` ทั้ง 3 services
- [x] `.env` (DB, Redis, Google OAuth, JWT, Serper API)
- [x] `.gitignore`
- [x] Healthcheck + depends_on ครบทุก container

### Go Fiber Backend ✅
- [x] Clean Architecture (models, dto, repos, services, handlers, middleware, DI)
- [x] Database connection (GORM + PostgreSQL) + Auto migrate (14 tables)
- [x] Middleware: RequestID, Logger, CORS, Auth (JWT)

### API Routes (Backend) ✅
- [x] `GET /health`
- [x] Auth: `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`
- [x] Sites CRUD: `POST/GET/PUT/DELETE /sites`
- [x] Keywords: `POST/GET /sites/:id/keywords`
- [x] Articles: `POST /articles/generate`, `GET /articles/:id`, `POST /articles/:id/publish`
- [x] GSC: `GET /auth/gsc/connect/:id`, `GET /auth/gsc/callback`, properties, select, disconnect
- [x] Optimizer: `POST /articles/:id/optimize`
- [x] Versions: `GET /articles/:id/versions`
- [x] Images: generate, find, search, upload, delete

### Database Tables ✅
- [x] `users` — Google OAuth users
- [x] `sites` — per-site credentials (LLM, WP, GSC) + analysis data + suggested_seeds
- [x] `site_pages` — crawled pages (url, title, h1, meta, page_type, word_count)
- [x] `keywords` — keyword + page_id FK + score + intent + serp_data
- [x] `articles` — content, status, publish_status, eeat_score, schema_markup
- [x] `article_images`, `article_metrics`, `article_versions`, `optimization_logs`
- [x] `page_analyses` — on-page audit results (audit_score, issues, recommendations, serp_snapshots)
- [x] `keyword_serp_history` — daily SERP snapshots per keyword
- [x] `keyword_opportunities`, `topic_clusters`, `competitors`

### Python AI Engine ✅
- [x] FastAPI app (27+ endpoints)
- [x] Skill loader + SkillRouter (40 marketing skills)
- [x] Article writer (EEAT + robust JSON parser for Gemini responses)
- [x] Content formatter (Markdown → Gutenberg blocks)
- [x] CMS publisher (WordPress REST API)
- [x] Ranking optimizer (decide + execute)

### Authentication ✅
- [x] Google OAuth (server-side redirect flow)
- [x] JWT (HS256, 7 days)
- [x] Per-user site isolation

### Frontend (Next.js 16 + shadcn/ui v4) ✅
- [x] Feature-based structure: auth, sites, keywords, articles, pages
- [x] Proper layer separation: Page → Component → Hook → Service → API Client
- [x] 8 site components: SiteInfoCard, PipelineCard, PagesCard, GscConnectionCard, KeywordsCard, TopicClustersCard, CompetitorAnalysisCard, ArticlesCard

---

## Phase 1 — Smart Discovery ✅ ALL DONE

### 1.1 Site Pipeline (Crawl + Pages + Keywords per Page) ✅
- [x] `POST /crawl-pages` (Python) — crawl เว็บ + LLM เลือก keywords ต่อ page (1-3 kw/page)
- [x] `POST /sites/:id/pipeline` (Go) — Run Pipeline ปุ่มเดียว
- [x] Go: เก็บ pages ลง `site_pages` table (upsert)
- [x] Go: เก็บ keywords ผูก `page_id` + score + intent จาก LLM
- [x] Go: เก็บ suggested_seeds ลง site record
- [x] Frontend: `PipelineCard` component — ปุ่ม Run Pipeline + แสดง progress
- [x] Frontend: `PagesCard` component — แสดงทุก page + keywords ต่อ page + audit score
- [x] Pipeline กดซ้ำ = เก็บ page ใหม่ + update page เก่า (ไม่ลบ)
- [x] Pipeline ไม่สร้างบทความ (แยก flow)

### 1.2 Site Analysis (AI วิเคราะห์) ✅
- [x] `services/site_analyzer.py` — LLM วิเคราะห์ (business type, brand voice, persona, SEO score)
- [x] `extract_page_keywords()` — LLM เลือก keyword ต่อ page พร้อม score + intent
- [x] `POST /analyze-site` (Python)
- [x] `POST /sites/:id/analyze` (Go) — เก็บผลลง DB
- [x] Frontend: ปุ่ม Analyze + แสดงผล

### 1.3 Keyword Discovery ✅
- [x] `services/keyword_discovery.py` — Google Suggest + GSC + SERP Related
- [x] `services/keyword_scorer.py` — scoring (0-10)
- [x] Auto seed fallback — ใช้ seeds จาก site analysis ถ้า user ไม่ส่ง

### 1.4 Topic Clusters ✅
- [x] `services/topic_cluster.py` — LLM จัดกลุ่ม (pillar + supporting + link map)
- [x] Frontend: `TopicClustersCard` component

### 1.5 Competitor Analysis ✅
- [x] `services/competitor_profiler.py` — crawl + LLM วิเคราะห์
- [x] Frontend: `CompetitorAnalysisCard` component

---

## Phase 2 — Page Analysis + SERP + Images ✅ ALL DONE

### 2.1 Page-Level Analysis (SERP + On-Page Audit) ✅
- [x] `services/page_analyzer.py` (Python) — SERP top 10 + crawl page + audit + LLM recommendations
- [x] `infrastructure/adapters/serper_adapter.py` — Serper.dev (Google SERP API แม่น 100%)
- [x] `POST /analyze-page` (Python)
- [x] `POST /sites/:id/pages/:pageId/analyze` (Go) — analyze + เก็บ DB
- [x] `GET /sites/:id/pages/:pageId/analysis` (Go) — ดึงผลจาก DB
- [x] `POST /sites/:id/keywords/:kwId/analyze-serp` (Go) — SERP per keyword
- [x] DB: `page_analyses` table (audit_score, issues, recommendations, serp_snapshots)
- [x] DB: `keyword_serp_history` table (daily SERP snapshots)
- [x] On-page audit: word count vs avg, H1 keyword check, meta description, H2 count
- [x] Audit Score (0-100) — สีแดง/เหลือง/เขียว
- [x] Frontend: ปุ่ม Analyze ต่อ page → expand แสดง SERP + Issues + Recommendations
- [x] Frontend: toggle expand/collapse + ดึง analysis จาก DB (refresh ไม่หาย)
- [x] Frontend: ปุ่ม ↗ เปิดเว็บจริง + เปิดเว็บคู่แข่ง
- [x] Frontend: URL decode ภาษาไทย (ไม่แสดง %e0%b8...)

### 2.2 Image Generation + SEO ✅
- [x] Image Gen ports/adapters (Gemini Imagen, DALL-E)
- [x] Image Search adapters (Pexels, Unsplash, Pixabay, DuckDuckGo)
- [x] WordPress Media upload + featured image
- [x] WebP conversion + SEO alt text
- [x] Frontend: Find Images + AI Generate + Upload

### 2.3 Content Versioning ✅
- [x] `ArticleVersion` model + save every optimize action
- [x] Frontend: version history display
- [ ] Version diff view — ยังไม่มี

### 2.4 Article Metrics Dashboard ✅
- [x] GSC metrics display (clicks, impressions, CTR, position)
- [x] Optimize button
- [ ] Performance graph (time-series) — ยังไม่มี

---

## Phase 2.5 — Multi-LLM + SERP API ✅ ALL DONE

### LLM Adapters (6 Providers) ✅
- [x] Gemini (gemini-2.5-flash), OpenAI (GPT-4o), Claude (Sonnet), DeepSeek, Groq (Llama 3.3), Mistral

### SERP Adapter ✅
- [x] `infrastructure/adapters/serper_adapter.py` — Serper.dev (Google จริง 100%, ภาษาไทยแม่น)
- [x] Crawl word count ของ top 5 competitors
- [x] `SERPER_API_KEY` ใน .env

### DI Container ✅
- [x] Python: `pkg/di/container.py` — factory methods for all adapters
- [x] Go: `pkg/di/container.go` — wire all repos + services + handlers

---

## Phase 2.6 — Docker + Automation ✅ ALL DONE

### Docker Compose (1 คำสั่งจบ) ✅
- [x] `docker-compose.yml` — 5 containers + healthcheck + depends_on
- [x] Backend Dockerfile (Go multi-stage: builder → alpine + curl)
- [x] AI Engine Dockerfile (Python 3.12-slim + pip)
- [x] Frontend Dockerfile (Node 22-alpine + npm)
- [x] `.dockerignore` ทั้ง 3 services

### Scheduler (Auto ทุกวัน) ✅
- [x] Step 2: ทุกวัน 03:00 → Page Analysis (SERP + audit ทุก page ทุก site, delay 30s/page)
- [x] Step 3: ทุกวัน 06:00 → Content Generation (max 3 articles/site, delay 60s/article)
- [x] Step 4: ทุก 12 ชม. → Ranking Tracker (GSC metrics + auto optimize)

### Frontend Refactor ✅
- [x] Proper layer: Page → Component → Hook → Service → API Client
- [x] 8 site components แยก file
- [x] Pages feature module (types, service, hooks)
- [x] Hooks: useRunPipeline, useAnalyzePage, useAnalyzeSERP, + 7 existing hooks

### Bug Fixes ✅
- [x] Gemini JSON response parser (strip ```json wrapper, fallback regex extraction)
- [x] Generate fail → ลบ article record (ไม่เหลือ "failed" ค้าง)
- [x] Google SERP scraping blocked → Serper.dev adapter
- [x] DuckDuckGo keyword ไทยไม่แม่น → Serper.dev
- [x] Zombie port Windows → ห้ามรัน services ข้างนอก Docker

---

## Phase 3 — AI Brain (หลังมี data 50+ articles)

### AI Brain (Decision Layer)
- [ ] DB table: `decisions`
- [ ] `services/seo_brain.py` — rule-based + AI hybrid decisions
- [ ] Confidence scoring + budget control + kill switch
- [ ] Decision logging + outcome tracking
- [ ] Scheduler: Brain ทุก 6 ชม.
- [ ] Frontend: หน้า Brain Decisions Log

---

## Phase 4 — Scale (หลังมี 500+ articles + authority)

### Programmatic SEO
- [ ] DB: `site_templates`, `programmatic_pages`
- [ ] `services/programmatic_generator.py` — Template × Variables = 1000+ pages
- [ ] Frontend: Programmatic SEO management

### Backlink Agent
- [ ] DB: `backlink_opportunities`, `backlinks`
- [ ] `services/backlink_finder.py`, `outreach_agent.py`, `link_tracker.py`
- [ ] Frontend: Backlinks management

### Advanced Scheduler
- [ ] Priority queue + retry policy + dead-letter queue

---

## Phase 5 — Self-Learning (หลังมี 1000+ articles)

- [ ] Learning Loop — track decision → outcome → adjust rules
- [ ] A/B test decisions
- [ ] Reinforcement Learning (optional)

---

## Nice-to-have (ทำเมื่อไหร่ก็ได้)

- [ ] Version diff view (เปรียบเทียบ 2 versions)
- [ ] Performance graph (ranking trend chart, recharts)
- [ ] Analyze All Pages button (ทำทุก page ทีเดียว)
- [ ] Re-analyze scheduler (re-crawl เว็บทุก 30 วัน)
- [ ] Content refresh (refresh บทความเก่า > 90 วัน)

---

## Quick Reference

### Start / Stop
```bash
docker-compose up -d          # เปิดทุกอย่าง
docker-compose logs -f         # ดู log
docker-compose down            # หยุด
docker-compose up --build -d   # rebuild ทั้งหมด
docker-compose build --no-cache ai-engine && docker-compose up -d ai-engine  # rebuild เฉพาะ
```

### Services
| Container | Tech | Port |
|-----------|------|------|
| seo_agents_db | PostgreSQL 16 | 5432 |
| seo_agents_redis | Redis 7 | 6379 |
| seo_agents_ai | Python FastAPI | 8000 |
| seo_agents_backend | Go Fiber | 3001 |
| seo_agents_frontend | Next.js 16 | 3000 |

### URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api/v1/health
- AI Engine: http://localhost:8000/health

### Credentials (.env)
```
DB_HOST/PORT/USER/PASSWORD/NAME    — PostgreSQL
GOOGLE_CLIENT_ID/SECRET            — Google OAuth (login + GSC)
GOOGLE_REDIRECT_URL                — OAuth callback
JWT_SECRET                         — JWT signing
SERPER_API_KEY                     — Serper.dev (Google SERP API)
```

### Per-Site Credentials (in DB)
```
llm_provider + llm_api_key         — AI model (gemini/openai/claude/deepseek/groq/mistral)
wp_url + wp_username + wp_app_password — WordPress
gsc_refresh_token + gsc_site_url   — Google Search Console
```

### Key Documentation
| File | เนื้อหา |
|------|--------|
| `DOCKER.md` | Docker commands + debug + DB access |
| `PIPELINE_FLOW.md` | 4-step automation flow detail |
| `PIPELINE_IMPLEMENTATION.md` | Implementation plan (phases + files) |
| `PAGE_ANALYSIS.md` | Page-level analysis detail + scheduler timing |
| `KEYWORD_FLOW.md` | Keyword extraction flow |
| `PRESENTATION.md` | Slide content for client presentation |
| `SEO_AGENTS_PLAN.md` | Original full architecture plan |
