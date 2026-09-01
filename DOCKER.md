# SEO Agents — Docker & Services

## Quick Start

```bash
# เปิดทุกอย่างทีเดียว
docker-compose up -d

# ดู log real-time (ทุก service)
docker-compose logs -f

# ดู log เฉพาะ service
docker-compose logs -f backend
docker-compose logs -f ai-engine
docker-compose logs -f frontend

# หยุดทุกอย่าง
docker-compose down

# หยุด + ลบ data ทั้งหมด (reset DB)
docker-compose down -v

# rebuild หลังแก้ code
docker-compose up --build -d
```

---

## Services

| Container | Tech | Port | หน้าที่ |
|-----------|------|------|---------|
| `seo_agents_db` | PostgreSQL 16 | 5432 | Database หลัก |
| `seo_agents_redis` | Redis 7 | 6379 | Cache / Queue |
| `seo_agents_ai` | Python FastAPI | 8000 | AI Engine (LLM, Crawl, SERP, Image) |
| `seo_agents_backend` | Go Fiber | 3001 | REST API (CRUD, Auth, Scheduler) |
| `seo_agents_frontend` | Next.js 16 | 3000 | Dashboard UI |

### Startup Order (auto via healthcheck)

```
postgres + redis + ai-engine  (พร้อมก่อน)
         │
         ▼
      backend               (รอ 3 ตัวข้างบน healthy)
         │
         ▼
      frontend              (รอ backend healthy)
```

---

## URLs

| Service | URL |
|---------|-----|
| Frontend (Dashboard) | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1/health |
| AI Engine API | http://localhost:8000/health |

---

## Environment Variables

ไฟล์ `.env` ที่ root project (ใช้ร่วมกันทุก service):

```env
# Database (ต้องตรงกับ docker-compose)
DB_HOST=127.0.0.1        # backend ใน Docker จะ override เป็น "postgres"
DB_PORT=5432
DB_USER=seo_agents
DB_PASSWORD=seo_agents_secret
DB_NAME=seo_agents

# Redis
REDIS_URL=redis://localhost:6379   # override เป็น redis://redis:6379

# AI Engine
AI_ENGINE_URL=http://localhost:8000  # override เป็น http://ai-engine:8000

# App
APP_PORT=3001
FRONTEND_URL=http://localhost:3000

# Google OAuth (สำหรับ Login)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3001/api/v1/auth/google/callback

# JWT
JWT_SECRET=your-jwt-secret
```

> **Note:** `DB_HOST`, `REDIS_URL`, `AI_ENGINE_URL` ถูก override ใน docker-compose
> เพื่อให้ containers คุยกันผ่าน Docker network (ใช้ชื่อ service แทน localhost)

### Per-Site Credentials (เก็บใน DB ไม่ใช่ .env)

```
sites table
├── llm_provider       (gemini / openai / claude / deepseek / groq / mistral)
├── llm_api_key        (API key ของ LLM ที่เลือก)
├── wp_url             (WordPress URL)
├── wp_username        (WordPress username)
├── wp_app_password    (WordPress Application Password)
├── gsc_refresh_token  (Google Search Console OAuth token)
└── gsc_site_url       (GSC property URL)
```

---

## Docker Files

```
_SEO_AGENTS/
├── docker-compose.yml          # ทุก service + healthcheck + depends_on
├── .env                        # environment variables
├── backend/
│   ├── Dockerfile              # Go multi-stage build (builder → alpine)
│   └── .dockerignore
├── ai-engine/
│   ├── Dockerfile              # Python 3.12-slim + pip install
│   └── .dockerignore
└── frontend/
    ├── Dockerfile              # Node 22-alpine + npm install
    └── .dockerignore
```

---

## Common Commands

### ดู status

```bash
# ดู containers ทั้งหมด
docker-compose ps

# ดู health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Debug

```bash
# เข้า shell ใน container
docker exec -it seo_agents_backend sh
docker exec -it seo_agents_ai bash
docker exec -it seo_agents_frontend sh

# ดู DB โดยตรง
docker exec -it seo_agents_db psql -U seo_agents -d seo_agents

# ดู tables
docker exec -it seo_agents_db psql -U seo_agents -d seo_agents -c "\dt"

# ดู articles
docker exec -it seo_agents_db psql -U seo_agents -d seo_agents -c "SELECT id, title, status FROM articles;"
```

### Rebuild เฉพาะ service

```bash
# rebuild backend อย่างเดียว (หลังแก้ Go code)
docker-compose up --build -d backend

# rebuild ai-engine อย่างเดียว (หลังแก้ Python code)
docker-compose up --build -d ai-engine

# rebuild frontend อย่างเดียว (หลังแก้ Next.js code)
docker-compose up --build -d frontend
```

### Reset ทั้งหมด

```bash
# ลบ containers + volumes + images ที่ build
docker-compose down -v --rmi local
docker-compose up --build -d
```

---

## Usage Flow

```
1. docker-compose up -d
2. เปิด http://localhost:3000
3. Sign in with Google
4. Add Site (ใส่ LLM API Key + WordPress credentials)
5. Add Keyword
6. Generate Article (EEAT + SERP analysis)
7. Publish to WordPress
```

---

## AI Engine Endpoints (port 8000)

| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/skills` | List 40 marketing skills |
| POST | `/generate-article` | สร้างบทความ EEAT |
| POST | `/rewrite-title` | Rewrite title (CTR optimization) |
| POST | `/expand-article` | Expand content |
| POST | `/publish-article` | Publish to WordPress |
| POST | `/optimize-article` | Execute optimization action |
| POST | `/decide-optimization` | Decide what to optimize |
| GET | `/analyze-serp` | SERP top 10 analysis |
| POST | `/analyze-site` | Crawl + analyze website |
| POST | `/discover-keywords` | Auto keyword discovery |
| POST | `/analyze-competitor` | Competitor analysis |
| POST | `/create-cluster` | Create topic cluster |
| POST | `/generate-images` | AI generate images |
| POST | `/search-images` | Search stock photos |
| POST | `/upload-selected-images` | Upload to WordPress |
| POST | `/fetch-metrics` | Fetch GSC metrics |

## Backend API Endpoints (port 3001)

| Method | Path | หน้าที่ |
|--------|------|---------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/auth/google` | Google OAuth login |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/sites` | Add site |
| GET | `/api/v1/sites` | List sites |
| GET | `/api/v1/sites/:id` | Site detail |
| PUT | `/api/v1/sites/:id` | Update site |
| DELETE | `/api/v1/sites/:id` | Delete site |
| POST | `/api/v1/sites/:id/analyze` | Analyze site |
| POST | `/api/v1/sites/:id/discover-keywords` | Discover keywords |
| POST | `/api/v1/sites/:id/clusters` | Create topic cluster |
| POST | `/api/v1/sites/:id/competitors` | Analyze competitor |
| POST | `/api/v1/sites/:id/keywords` | Add keyword |
| GET | `/api/v1/sites/:id/keywords` | List keywords |
| GET | `/api/v1/sites/:id/articles` | List articles |
| POST | `/api/v1/articles/generate` | Generate article |
| GET | `/api/v1/articles/:id` | Article detail |
| POST | `/api/v1/articles/:id/publish` | Publish to WordPress |
| GET | `/api/v1/articles/:id/metrics` | Fetch GSC metrics |
| POST | `/api/v1/articles/:id/optimize` | Run optimizer |
| GET | `/api/v1/articles/:id/versions` | Version history |
| GET | `/api/v1/articles/:id/images` | List images |
| POST | `/api/v1/articles/:id/generate-images` | AI generate images |
| POST | `/api/v1/articles/:id/find-images` | Find stock images |
| POST | `/api/v1/articles/:id/upload-images` | Upload images |
| DELETE | `/api/v1/articles/:id` | Delete article |
