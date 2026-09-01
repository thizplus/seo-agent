# SEO Agents — Project Status

> อัพเดทล่าสุด: 2026-04-28

---

## สิ่งที่ทำเสร็จแล้ว

### Phase 0 — MVP
- [x] Go Fiber Backend (Clean Architecture + Port/Adapter)
- [x] Python AI Engine (FastAPI + Port/Adapter)
- [x] Frontend Admin UI (Next.js 16 + shadcn/ui v4)
- [x] Google OAuth Login (server-side redirect flow)
- [x] Multi-user (sites filtered by user)
- [x] Add Site + Edit Site + Delete Site
- [x] Add Keyword + Delete
- [x] Generate Article (EEAT + SERP + Marketing Skills)
- [x] Publish to WordPress (auto Gutenberg blocks)
- [x] Re-publish (update existing WP post)
- [x] GSC OAuth Connect per-site (คนละ Google account ได้)
- [x] Fetch Metrics จาก GSC
- [x] Ranking Optimizer (auto decide + execute)
- [x] Scheduler (Go cron ทุก 12 ชม.)

### Phase 1 — Smart Discovery
- [x] Site Analyzer (Crawl + AI analysis → Brand Voice, Persona, SEO Score)
- [x] Keyword Discovery (DuckDuckGo + GSC + SERP related)
- [x] Keyword Scorer (intent + source + money keyword boost)
- [x] Topic Clusters API (Pillar + Supporting + Link Map)
- [x] Competitor Analysis API (Crawl + strengths/weaknesses/gaps)

### Architecture Refactor
- [x] Port/Adapter Pattern ทั้ง Python + Go
- [x] Python Ports: LLMPort, ScraperPort, SERPPort, CMSPort, SearchConsolePort, ImageGenPort, ImageStoragePort, ImageSearchPort
- [x] Python Adapters: Gemini, OpenAI, Claude, DeepSeek, Groq, Mistral, BS4 Crawler, WordPress, GSC OAuth, DuckDuckGo Image Search
- [x] Go Ports: AIEnginePort, GoogleOAuthPort
- [x] Go Adapters: HTTP Client, Google OAuth
- [x] Python DI Container (pkg/di/container.py)
- [x] Multi-LLM Support (6 providers เลือกได้ per site)

### Phase 2 — Image + Versioning + Metrics
- [x] Image Search (DuckDuckGo — ไม่ต้อง API key)
- [x] Image Picker UI (preview → เลือก → set featured → upload)
- [x] Image Upload to WordPress Media + auto WebP convert
- [x] Auto set Featured Image + inject images in content
- [x] Image persist ใน DB (article_images table)
- [x] Delete Image (DB + WordPress Media)
- [x] Delete Article (DB + WordPress post + รูปทั้งหมด)
- [x] Content Versioning (ArticleVersion table + save on optimize)
- [x] Gutenberg Formatter (Markdown → WP blocks: heading, paragraph, list, quote, table, code, image)
- [x] H1 skip (ป้องกัน H1 ซ้ำกับ WP theme)
- [x] Metrics Dashboard (Fetch Metrics + Optimize button)
- [x] Re-publish button

---

## สิ่งที่ต้องทำต่อ (เรียงตาม Priority)

### Priority 1 — Bug Fixes / UX ปรับปรุง

- [ ] **Image search ไม่ตรง keyword** — DuckDuckGo อาจ return รูปไม่เกี่ยว ควรให้ user พิมพ์ search query เองได้
- [ ] **Alt text editable** — ให้ user แก้ alt text ได้ก่อน upload (ตอนนี้ AI gen ให้)
- [ ] **Delete keyword** — ยังไม่มีปุ่มลบ keyword
- [ ] **Keyword ภาษาไทย + Discover** — บาง keyword ไทยอาจไม่ได้ผลจาก DuckDuckGo Suggest

### Priority 2 — Phase 3: AI Brain

> ควรเริ่มตอนมี 50+ articles + GSC มี data (2-3 วันหลังจากนี้)

- [ ] DB table: `decisions`
- [ ] `services/seo_brain.py` — Rule-based + AI hybrid decisions
- [ ] Confidence scoring
- [ ] Budget control (max 5 articles/day)
- [ ] Kill switch (10 fails → stop)
- [ ] Decision logging + outcome tracking
- [ ] Scheduler: Brain ทุก 6 ชม.
- [ ] Frontend: หน้า Brain Decisions Log

### Priority 3 — Scale

- [ ] Programmatic SEO (Template + Variables = 1000+ pages)
- [ ] Backlink Agent (Guest post, Resource pages, Broken links)
- [ ] Outreach Agent (Personalized email)
- [ ] Advanced Queue (Priority, Retry, Dead-letter)

### Priority 4 — Polish

- [ ] WordPress Plugin (custom blocks, schema inject, SEO meta)
- [ ] Frontend: Topic Clusters UI (visual graph)
- [ ] Frontend: Competitor Analysis UI
- [ ] Frontend: Bulk actions (generate/publish หลายบทความพร้อมกัน)
- [ ] Mobile responsive ปรับปรุง
- [ ] Dark mode

---

## วิธีรัน

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start Backend (Go)
cd backend && air

# 3. Start AI Engine (Python)
cd ai-engine && uvicorn main:app --reload --port 8000

# 4. Start Frontend
cd frontend && npm run dev
```

## Env ที่ต้องมี

### .env (root project)
```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=seo_agents
DB_PASSWORD=seo_agents_secret
DB_NAME=seo_agents
REDIS_URL=redis://localhost:6379
AI_ENGINE_URL=http://localhost:8000
APP_PORT=3001
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URL=http://localhost:3001/api/v1/auth/google/callback
JWT_SECRET=your-secret
```

### frontend/.env.local
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Ports

| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| Redis | 6379 |
| Go Backend | 3001 |
| Python AI Engine | 8000 |
| Next.js Frontend | 3000 |

## Google Cloud Console ต้องตั้ง

### OAuth Redirect URIs
```
http://localhost:3001/api/v1/auth/google/callback
http://localhost:3001/api/v1/auth/gsc/callback
```

### APIs ที่ต้อง Enable
- Google Search Console API
- (Optional) Imagen API — สำหรับ AI image generation
