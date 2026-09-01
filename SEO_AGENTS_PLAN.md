# SEO Agents - Autonomous SEO Machine

## Overview

ระบบ **Autonomous SEO Machine** ที่ทำงานครบวงจร ตั้งแต่หา keyword → สร้าง content → publish → ดันอันดับ → เรียนรู้ → วนลูปเอง 24 ชม.

ใช้ **[marketingskills](https://github.com/coreyhaines31/marketingskills)** (38+ skills) เป็น "สมองด้านกลยุทธ์" inject เข้า Gemini Prompt

### 6 Engines ที่ทำงานร่วมกัน

```
┌─────────────────────────────────────────────┐
│            🧠 AI SEO Brain                   │
│     (Decision-Making Layer - สั่งทุกอย่าง)    │
└──────┬──────┬──────┬──────┬──────┬──────────┘
       │      │      │      │      │
   ┌───▼──┐┌──▼───┐┌─▼──┐┌─▼───┐┌─▼────┐
   │Keyword││Content││Rank││Back ││Prog. │
   │Engine ││Engine ││Opt.││link ││SEO   │
   └──────┘└──────┘└────┘└─────┘└──────┘
```

| Engine | หน้าที่ |
|--------|--------|
| **Keyword Engine** | หา keyword ใหม่เอง (GSC, Autocomplete, SERP, Competitor) |
| **Content Engine** | สร้างบทความ EEAT + รูป + Schema + Internal Links |
| **Ranking Optimizer** | Track ranking → rewrite title / expand content / add links |
| **Backlink Agent** | หาโอกาส backlink → outreach → track |
| **Programmatic SEO** | Template + Data = 1000+ pages (Location SEO) |
| **AI SEO Brain** | ตัดสินใจว่าจะทำอะไรต่อ (rule-based + AI hybrid) |

---

## Tech Stack

| Layer | Technology | หน้าที่ |
|-------|-----------|--------|
| **Frontend** | Next.js 15 (App Router) + shadcn/ui + Tailwind | Dashboard จัดการทุกอย่าง |
| **Backend API** | Go Fiber + **Air** (hot reload) | REST API, CRUD, Queue, Scheduler |
| **AI Engine** | Python (FastAPI) | Crawl, AI analysis, Content gen, All agents |
| **AI Skills** | marketingskills (.md files) | Prompt library — SEO, Copywriting, CRO |
| **Skill Router** | Python (embedding/rule-based) | เลือก skill ที่เหมาะกับ task อัตโนมัติ |
| **AI Model** | Google Gemini API | วิเคราะห์, เขียนบทความ, ตัดสินใจ |
| **Image Gen** | Gemini Imagen / Stable Diffusion | สร้างรูป + optimize SEO |
| **Database** | PostgreSQL | เก็บทุกอย่าง |
| **Queue** | Redis + priority queue | Job management + retry + dead-letter |
| **Scheduler** | Go cron / Celery beat | ยิง Brain ทุก 6 ชม., Keyword ทุกวัน |
| **CMS** | WordPress REST API | Auto publish / update / schedule |
| **Data Source** | Google Search Console API | Ranking data, impressions, CTR |
| **Scraping** | Python (Playwright + BeautifulSoup) | Crawl เว็บ, SERP scraper |

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                       │
│   Dashboard / Sites / Articles / Keywords / Analytics       │
└────────────────────────────┬───────────────────────────────┘
                             │ REST API
┌────────────────────────────▼───────────────────────────────┐
│                 Go Fiber Backend (Air hot reload)            │
│   CRUD / Queue Manager / Scheduler (cron) / CMS Publisher   │
└───────┬────────────────────────────────────┬───────────────┘
        │ DB                                 │ HTTP (internal)
┌───────▼───────┐              ┌─────────────▼───────────────────┐
│  PostgreSQL    │              │        Python AI Engine          │
│  + Redis       │              │        (FastAPI)                 │
└───────────────┘              │                                  │
                               │  ┌────────────────────────────┐  │
                               │  │  🧠 AI SEO Brain            │  │
                               │  │  (Decision-Making Layer)    │  │
                               │  └─────────────┬──────────────┘  │
                               │                │ orchestrate      │
                               │  ┌─────────────▼──────────────┐  │
                               │  │  Skill Router               │  │
                               │  │  (เลือก .md skill อัตโนมัติ)  │  │
                               │  └─────────────┬──────────────┘  │
                               │                │ inject           │
                               │  ┌─────────────▼──────────────┐  │
                               │  │  Services                   │  │
                               │  │  - Keyword Discovery        │  │
                               │  │  - SERP Analyzer            │  │
                               │  │  - Site Analyzer            │  │
                               │  │  - SEO Advisor              │  │
                               │  │  - Competitor Profiler      │  │
                               │  │  - Article Writer           │  │
                               │  │  - Ranking Optimizer        │  │
                               │  │  - Backlink Agent           │  │
                               │  │  - Programmatic Generator   │  │
                               │  │  - Image Generator + SEO    │  │
                               │  │  - Internal Linker (graph)  │  │
                               │  │  - Schema Generator         │  │
                               │  └─────────────┬──────────────┘  │
                               └────────────────┼────────────────┘
                                                │
                          ┌─────────────────────┼──────────────────┐
                          │                     │                  │
                ┌─────────▼──────┐  ┌───────────▼────┐  ┌─────────▼────┐
                │  Gemini API     │  │  Google Search  │  │  WordPress   │
                │  + Imagen API   │  │  Console API    │  │  REST API    │
                └────────────────┘  └────────────────┘  └──────────────┘
```

---

## Marketing Skills Integration

### Skill Router (Dynamic — ไม่ static)

```python
# ai-engine/services/skill_router.py

class SkillRouter:
    """เลือก skill อัตโนมัติตาม task type — ป้องกัน token บวม"""

    SKILL_MAP = {
        "site_analysis": ["product-marketing-context"],
        "seo_audit": ["seo-audit", "schema-markup"],
        "competitor_analysis": ["competitor-profiling"],
        "topic_suggestion": ["programmatic-seo", "competitor-profiling"],
        "article_writing": ["copywriting", "seo-audit"],
        "cro_analysis": ["page-cro", "signup-flow"],
        "internal_linking": ["site-architecture"],
    }

    def __init__(self, skill_loader: SkillLoader):
        self.loader = skill_loader

    def get_context(self, task_type: str) -> str:
        """โหลดเฉพาะ skills ที่จำเป็น — ลด token usage"""
        skill_names = self.SKILL_MAP.get(task_type, [])
        return self.loader.load_many(skill_names)

    # Advanced: ใช้ embedding + similarity search (RAG) ในอนาคต
```

### Skill Loader

```python
# ai-engine/services/skill_loader.py

class SkillLoader:
    def __init__(self, skills_dir: str = "skills/"):
        self.skills_dir = skills_dir
        self._cache: dict[str, str] = {}

    def load(self, skill_name: str) -> str:
        if skill_name not in self._cache:
            path = f"{self.skills_dir}/{skill_name}.md"
            with open(path, "r", encoding="utf-8") as f:
                self._cache[skill_name] = f.read()
        return self._cache[skill_name]

    def load_many(self, skill_names: list[str]) -> str:
        return "\n\n---\n\n".join(
            f"## Skill: {name}\n{self.load(name)}" for name in skill_names
        )
```

### Skill → Feature Mapping

| Feature | Skills ที่ใช้ | วิธีใช้ |
|---------|-------------|--------|
| Site Analysis | `product-marketing-context` | เข้าใจ context ธุรกิจ, persona, จุดขาย |
| SEO Audit | `seo-audit`, `schema-markup` | Checklist ตรวจ SEO + generate JSON-LD |
| Topic Suggestion | `programmatic-seo`, `competitor-profiling` | วิเคราะห์คู่แข่งก่อนแนะนำหัวข้อ |
| Article Writing | `copywriting`, marketing-psychology | เขียนบทความที่โน้มน้าวคนได้จริง |
| CRO | `page-cro`, `signup-flow` | แนะนำปรับปรุง conversion |
| Internal Linking | `site-architecture` | วาง link structure ถูกหลัก SEO |

---

## Database Schema (PostgreSQL)

### Core Tables

#### sites
```sql
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL UNIQUE,
    description TEXT,
    business_type VARCHAR(100),       -- ecommerce | service | blog | corporate
    industry VARCHAR(255),
    brand_voice TEXT,                  -- Tone & Voice ของแบรนด์
    target_persona JSONB,             -- { age, gender, pain_points, goals }
    analysis_status VARCHAR(50) DEFAULT 'pending',
    analysis_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### site_urls
```sql
CREATE TABLE site_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL,
    title VARCHAR(500),
    meta_description TEXT,
    page_type VARCHAR(100),           -- home | product | service | blog | contact
    status_code INT,
    crawled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### seo_recommendations
```sql
CREATE TABLE seo_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    category VARCHAR(100),            -- technical | content | onpage | offpage | cro
    priority VARCHAR(20),             -- high | medium | low
    title VARCHAR(500),
    description TEXT,
    current_status TEXT,
    suggestion TEXT,
    skill_source VARCHAR(100),        -- skill ที่ใช้วิเคราะห์
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Keyword & Topic Tables

#### keywords
```sql
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    keyword VARCHAR(500) NOT NULL,
    search_volume INT,
    difficulty INT,
    competitor_data JSONB,
    suggested_topics JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### keyword_opportunities (Auto Discovery)
```sql
CREATE TABLE keyword_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    keyword VARCHAR(500) NOT NULL,
    source VARCHAR(100),              -- gsc | suggest | serp | competitor
    search_volume INT,
    difficulty INT,
    intent VARCHAR(50),               -- informational | commercial | transactional
    score FLOAT,                      -- final decision score
    status VARCHAR(50) DEFAULT 'new', -- new | approved | rejected | used
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### keyword_clusters
```sql
CREATE TABLE keyword_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    main_keyword VARCHAR(255),
    keywords JSONB,                   -- ["kw1", "kw2", ...]
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### topic_clusters (Topical Authority)
```sql
CREATE TABLE topic_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    main_keyword VARCHAR(255),
    pillar_article_id UUID REFERENCES articles(id),
    supporting_article_ids JSONB,     -- [uuid, uuid, ...]
    link_graph JSONB,                 -- graph-based linking structure
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Content Tables

#### articles
```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id),
    cluster_id UUID REFERENCES topic_clusters(id),
    title VARCHAR(500),
    slug VARCHAR(500),
    content TEXT,                      -- HTML/Markdown
    content_version INT DEFAULT 1,    -- versioning (v1, v2, v3)
    meta_description VARCHAR(300),
    featured_image_url VARCHAR(1000),
    schema_markup JSONB,              -- JSON-LD (Article, FAQ)
    internal_links JSONB,             -- auto-generated
    eeat_score JSONB,                 -- { experience, expertise, authority, trust }
    skills_used JSONB,
    status VARCHAR(50) DEFAULT 'pending',    -- pending | generating | completed | failed
    publish_status VARCHAR(50) DEFAULT 'draft', -- draft | scheduled | published | updated
    published_url TEXT,               -- URL บนเว็บจริง
    cms_post_id VARCHAR(100),         -- WordPress post ID
    word_count INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### article_images
```sql
CREATE TABLE article_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    url VARCHAR(1000),
    alt_text VARCHAR(500),            -- keyword-optimized
    prompt TEXT,
    format VARCHAR(20) DEFAULT 'webp', -- webp | png | jpg
    file_size_kb INT,                 -- for SEO optimization
    position INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance & Optimization Tables

#### article_metrics (Feedback Loop)
```sql
CREATE TABLE article_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    ctr FLOAT DEFAULT 0,
    avg_position FLOAT,
    indexed BOOLEAN DEFAULT false,
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### optimization_logs
```sql
CREATE TABLE optimization_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    action VARCHAR(100),              -- rewrite_title | expand_content | add_links | add_backlink
    reason TEXT,
    before_data JSONB,                -- snapshot ก่อนแก้
    after_data JSONB,                 -- snapshot หลังแก้
    result VARCHAR(50),               -- rank_up | no_change | rank_down
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Backlink Tables

#### backlink_opportunities
```sql
CREATE TABLE backlink_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    target_url TEXT,
    domain VARCHAR(255),
    opportunity_type VARCHAR(50),     -- guest_post | resource_page | broken_link
    authority_score INT,
    relevance_score INT,
    contact_email TEXT,
    status VARCHAR(50) DEFAULT 'new', -- new | contacted | won | lost | follow_up
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### backlinks
```sql
CREATE TABLE backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    source_url TEXT,
    target_url TEXT,
    anchor_text TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active | lost
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Programmatic SEO Tables

#### site_templates
```sql
CREATE TABLE site_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255),
    niche VARCHAR(255),
    title_template TEXT,              -- "ร้านอาหาร {city} แนะนำ 2026"
    slug_template TEXT,               -- "/restaurant-{city}"
    content_template TEXT,            -- markdown + placeholders
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### programmatic_pages
```sql
CREATE TABLE programmatic_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    template_id UUID REFERENCES site_templates(id),
    keyword VARCHAR(255),
    slug VARCHAR(500),
    variables JSONB,                  -- { city: "สระบุรี", type: "ร้านอาหาร" }
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    published_url TEXT,
    cms_post_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### AI Brain Tables

#### decisions
```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    entity_type VARCHAR(50),          -- keyword | article | backlink
    entity_id UUID,
    decision VARCHAR(100),            -- generate | optimize | backlink | ignore | expand
    reason TEXT,
    confidence FLOAT,                 -- 0.0 - 1.0
    outcome VARCHAR(50),              -- pending | rank_up | no_change | rank_down
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Features & Flow

### Feature 1: Add Site & Auto-Analyze

**Skills:** `product-marketing-context`

**Flow:**
1. User ใส่ URL เว็บไซต์
2. Go Fiber บันทึกลง DB + ส่ง job ไป Python AI Engine
3. Python Engine:
   - Crawl หน้าแรก + sitemap.xml + robots.txt
   - ดึง URL ทั้งหมด (recursive crawl ไม่เกิน 100 หน้า)
   - โหลด skill: `product-marketing-context`
   - Gemini วิเคราะห์ → สรุปเว็บเกี่ยวกับอะไร
   - ระบุ business type + สร้าง Brand Voice + Target Persona
4. บันทึกผลกลับ DB
5. Frontend แสดงผลวิเคราะห์

### Feature 2: SEO Recommendations (Skill-Enhanced)

**Skills:** `seo-audit`, `schema-markup`, `page-cro`

**วิเคราะห์:**
- **Technical SEO**: Title, Meta, H1/H2, Alt tags, SSL, Sitemap, Canonical, Hreflang
- **Schema Markup**: ตรวจ structured data + generate JSON-LD ตัวอย่าง
- **CRO**: CTA, Above-the-fold, Trust signals, Form optimization
- **Content**: Internal/External links, Orphan pages, Content gaps

### Feature 3: SERP Reality Check (NEW)

**ปัญหา:** Gemini "ไม่รู้ ranking จริง" — ต้อง feed ข้อมูล SERP จริงให้

**Flow:**
1. Scrape Google top 10 สำหรับ keyword
2. วิเคราะห์: word count, heading structure, keyword density, intent
3. Feed เข้า prompt ก่อนสร้าง content

```python
# ai-engine/services/serp_analyzer.py

class SERPAnalyzer:
    async def analyze(self, keyword: str) -> dict:
        results = await self.scrape_google(keyword)
        return {
            "avg_word_count": self.avg_words(results),
            "common_headings": self.extract_headings(results),
            "keyword_density": self.calc_density(results),
            "intent": self.detect_intent(results),
            "competition_level": len(results),
        }
```

**Inject เข้า prompt:**
```
Top 10 competitors structure:
- avg word count: 2100
- common headings: ...
- search intent: informational

→ generate content ที่เหนือกว่า
```

### Feature 4: Keyword → Topic Suggestions (Competitor-Aware)

**Skills:** `programmatic-seo`, `competitor-profiling`

**Flow:**
1. User ใส่ keyword
2. SERP Analyzer วิเคราะห์ top 10 ก่อน
3. Competitor Profiler วิเคราะห์คู่แข่ง
4. Gemini แนะนำหัวข้อที่ "เหนือกว่า" + จัดเป็น Topic Cluster

### Feature 5: Article Generation (EEAT + Marketing Skills)

**Skills:** `copywriting`, `product-marketing-context`, `seo-audit`, `schema-markup`, `site-architecture`

**Flow:**
1. User เลือกหัวข้อ → กด "สร้างบทความ"
2. Go Fiber สร้าง job (priority queue)
3. Python Engine:
   - Skill Router เลือก skills
   - SERP Analyzer ดูคู่แข่ง top 10
   - สร้าง outline (copywriting skill)
   - เขียนทีละ section (ป้องกัน token limit)
   - EEAT signals: Experience, Expertise, Authority, Trust
   - **Auto Internal Linking** (graph-based จาก topic cluster)
   - **Auto Schema Markup** (JSON-LD: Article, FAQ)
   - Generate รูป (2-4 รูป) + optimize SEO
   - สร้าง meta description, alt text
4. บันทึก + version tracking (v1, v2, v3)

### Feature 6: Image Generation + SEO Optimization (Upgraded)

**เดิม:** generate image + alt text
**เพิ่ม:** image SEO optimizer

```python
# ai-engine/services/image_seo_optimizer.py

class ImageSEOOptimizer:
    async def optimize(self, image_path: str, keyword: str) -> dict:
        compressed = await self.compress(image_path)
        webp = await self.convert_to_webp(compressed)
        alt_text = await self.generate_alt(keyword)
        return {
            "url": webp,
            "alt_text": alt_text,
            "format": "webp",
            "lazy_loading": True,
            "file_size_kb": self.get_size(webp),
        }
```

**เพิ่ม:**
- Image compression
- WebP conversion
- Lazy loading hints
- Image sitemap generation

### Feature 7: Auto Publishing (CMS Integration)

**ปัญหา:** generate แล้วเก็บ DB = ไม่มี SEO

**CMS Publisher:**
```python
# ai-engine/services/cms_publisher.py

class CMSPublisher:
    """Publish ไป WordPress ผ่าน REST API"""

    async def publish(self, article: dict) -> str:
        response = await self.wp_client.post("/wp-json/wp/v2/posts", {
            "title": article["title"],
            "content": article["content"],
            "slug": article["slug"],
            "status": "publish",  # or "draft", "future" (scheduled)
            "meta": {
                "description": article["meta_description"],
            }
        })
        return response["link"]  # published URL

    async def update(self, cms_post_id: str, article: dict) -> str:
        """Update post เดิม (เมื่อ optimizer ปรับปรุง content)"""
        ...

    async def schedule(self, article: dict, publish_date: datetime) -> str:
        """Schedule post"""
        ...
```

**Features:**
- Auto publish ทันที
- Schedule post ตามเวลา
- Update post เดิม (เมื่อ optimizer แก้ content)

### Feature 8: Topical Authority Engine (Topic Clusters)

**ปัญหา:** generate เป็นบทความแยกๆ → Google ไม่เห็น authority

**Concept:** Google ชอบ "topic cluster + authority graph"

**Structure:**
```
Pillar: "ร้านอาหารในไทย" (comprehensive guide)
  ├── Child: "ร้านอาหาร สระบุรี"
  ├── Child: "ร้านอาหาร เชียงใหม่"
  ├── Child: "ร้านอาหาร กรุงเทพ เปิดดึก"
  └── Child: "ร้านอาหารไทย ราคาไม่แพง"
```

**Agent ต้อง:**
1. สร้าง pillar page ก่อน
2. สร้าง supporting articles
3. Link กันเป็น graph (ไม่ใช่ random linking)
4. Internal linker ใช้ graph-based approach

### Feature 9: Competitor Analysis

**Skills:** `competitor-profiling`

**Flow:**
1. User ใส่ URL คู่แข่ง (หรือระบบหาเองจาก SERP)
2. Crawl เว็บคู่แข่ง
3. Gemini วิเคราะห์: จุดแข็ง/อ่อน, Content gaps, Keywords
4. ใช้ข้อมูลปรับปรุง Topic Suggestions & Article Quality

### Feature 10: Auto Keyword Discovery Engine

**Sources 4 แหล่ง:**

| Source | วิธีการ | คุณค่า |
|--------|--------|--------|
| **Google Search Console** | keyword ที่ติดอยู่แล้ว (rank 8-20 = gold mine) | สูงมาก |
| **Google Suggest** | autocomplete "keyword a-z" | long-tail ดี |
| **Competitor Scraping** | scrape title/H1 ของคู่แข่ง | หา gaps |
| **SERP Related** | related searches ล่างสุด | expand ideas |

```python
# ai-engine/services/keyword_discovery.py

class KeywordDiscovery:
    def __init__(self, gsc_client, serp_analyzer, db):
        self.gsc = gsc_client
        self.serp = serp_analyzer
        self.db = db

    async def run(self, site_id: str):
        keywords = []
        keywords += await self.from_gsc(site_id)        # ทองคำ
        keywords += await self.from_suggest(site_id)     # long-tail
        keywords += await self.from_competitors(site_id) # gaps
        scored = [self.score(kw) for kw in keywords]
        self.db.save_opportunities(scored)
```

**Keyword Scoring:**
```python
# ai-engine/services/keyword_scorer.py

def score(keyword: dict) -> float:
    s = 0
    if keyword["search_volume"] > 100: s += 2
    if keyword["difficulty"] < 30: s += 2
    if keyword["intent"] == "commercial": s += 3
    if keyword["intent"] == "transactional": s += 3
    if keyword.get("gsc_impressions", 0) > 50: s += 3
    # Money keyword boost
    if any(w in keyword["keyword"] for w in ["ราคา", "รีวิว", "ดีไหม"]): s += 2
    return s
```

**Auto Selection:** score >= 6 → generate article อัตโนมัติ

### Feature 11: SEO Feedback Loop (Ranking Optimizer)

**หัวใจของ "SEO Agent จริง"** — ไม่ใช่แค่ generate แล้วหวังผล

**Loop:**
```
Generate → Publish → Wait (3-14 วัน) → Check Ranking → Decide → Improve → Repeat
```

```python
# ai-engine/services/ranking_optimizer.py

class RankingOptimizer:
    def __init__(self, gsc_client, db, article_writer):
        self.gsc = gsc_client
        self.db = db
        self.writer = article_writer

    async def run(self):
        articles = self.db.get_published_articles()
        for article in articles:
            metrics = await self.fetch_metrics(article)
            self.db.save_metrics(article.id, metrics)
            decision = self.decide(metrics)
            if decision:
                await self.execute(article, decision, metrics)

    def decide(self, m: dict) -> str | None:
        if m["impressions"] < 50:
            return None                     # ยังไม่มี data พอ
        if not m["indexed"]:
            return "fix_index"              # resubmit + fix technical
        if m["ctr"] < 0.02:
            return "rewrite_title"          # CTR ต่ำ → แก้ title/meta
        if 5 < m["position"] <= 15:
            return "expand_content"         # ใกล้หน้า 1 → เพิ่ม content
        if m["position"] > 15:
            return "add_internal_links"     # ไกล → เพิ่ม links
        return None

    async def execute(self, article, action, metrics):
        if action == "rewrite_title":
            new_title = await self.writer.rewrite_title(article)
            self.db.update_title(article.id, new_title)
            await self.cms.update(article.cms_post_id, {"title": new_title})

        elif action == "expand_content":
            updated = await self.writer.expand_article(article)
            self.db.update_content(article.id, updated)
            await self.cms.update(article.cms_post_id, {"content": updated})

        elif action == "add_internal_links":
            await self.internal_linker.inject(article)

        elif action == "fix_index":
            await self.indexer.submit(article.published_url)

        self.db.log_optimization(article.id, action, str(metrics))
```

**Tricks:**
1. **Delay Optimization** — รอ Google index ก่อน (อย่า optimize ทันที)
2. **Prioritize Money Keywords** — intent ซื้อ → optimize ก่อน
3. **Versioning** — เก็บ content v1, v2, v3 → compare ได้

### Feature 12: Backlink Agent

**Loop:**
```
Find Opportunities → Qualify → Generate Asset → Outreach → Get Link → Track → Repeat
```

**3 วิธีที่ปลอดภัย:**
1. **Guest Post Targets** — หา blog ที่มี "write for us"
2. **Resource Pages** — หาหน้ารวม resources ใน niche
3. **Broken Link Building** — หา link เสีย → เสนอ content แทน

```python
# ai-engine/services/backlink_finder.py

class BacklinkFinder:
    async def find(self, keyword: str, niche: str) -> list:
        results = []
        results += await self.search_guest_posts(keyword)
        results += await self.search_resource_pages(niche)
        results += await self.find_broken_links(keyword)
        return [r for r in results if self.qualify(r)]

    def qualify(self, site: dict) -> bool:
        return site["authority_score"] >= 20 and site["relevance_score"] >= 0.5
```

```python
# ai-engine/services/outreach_agent.py

class OutreachAgent:
    async def send(self, opportunity: dict, asset: dict):
        """Personalized outreach — ไม่ spam"""
        message = await self.gemini.generate(f"""
Write a personalized outreach email:
- Their page: {opportunity['target_url']}
- Our asset: {asset['title']}
- Tone: professional, friendly, brief
""")
        await self.mailer.send(opportunity["contact_email"], message)
```

**Guardrails:**
- Max 20 outreach/day (quality > quantity)
- Anchor text strategy: 50% brand, 30% generic, 20% keyword

### Feature 13: Programmatic SEO

**Concept:** Template + Data + Variations = 1000+ Pages

**ตัวอย่าง:**
```
"ร้านอาหาร {จังหวัด}" × 77 จังหวัด = 77 pages
"คลินิก {เขต}" × 50 เขต = 50 pages
+ modifiers ("รีวิว", "ราคา", "ใกล้ฉัน") = หลายร้อยหน้า
```

```python
# ai-engine/services/programmatic_generator.py

class ProgrammaticGenerator:
    async def generate_pages(self, template_id: str, variables_list: list):
        template = self.db.get_template(template_id)
        for vars in variables_list:
            title = self.fill(template.title_template, vars)
            slug = self.fill(template.slug_template, vars)
            content = await self.writer.generate_programmatic(
                template.content_template, vars
            )
            self.db.insert_page({
                "title": title, "slug": slug,
                "content": content, "variables": vars
            })

    def fill(self, template: str, vars: dict) -> str:
        for k, v in vars.items():
            template = template.replace(f"{{{k}}}", v)
        return template
```

**ระวัง:**
- Duplicate content → inject randomness + local data + examples
- Thin content → enforce 1200+ words + FAQ + schema
- Google sandbox → เว็บใหม่ไม่ rank ทันที

### Feature 14: AI SEO Brain (Decision-Making Layer)

**หัวใจ:** ให้ระบบ "เลือกเองว่าจะทำอะไรต่อ" ไม่ใช่แค่ execute

```python
# ai-engine/services/seo_brain.py

class SEOBrain:
    """ตัดสินใจว่าจะทำอะไรต่อ — rule-based + AI hybrid"""

    def __init__(self, db, keyword_discovery, article_writer,
                 ranking_optimizer, backlink_agent, gemini):
        self.db = db
        self.keyword = keyword_discovery
        self.writer = article_writer
        self.optimizer = ranking_optimizer
        self.backlink = backlink_agent
        self.gemini = gemini

    async def run(self, site_id: str):
        # 1. Keyword decisions
        opportunities = self.db.get_keyword_opportunities(site_id)
        for k in opportunities:
            decision = self.decide_keyword(k)
            if decision:
                await self.execute_keyword(k, decision)

        # 2. Article decisions
        articles = self.db.get_published_articles(site_id)
        for a in articles:
            decision = self.decide_article(a)
            if decision:
                await self.execute_article(a, decision)

    # --- Rule-based decisions ---

    def decide_keyword(self, k: dict) -> str | None:
        if k["score"] >= 7: return "generate"
        if k["score"] >= 5: return "test"      # generate 1 บทความลองก่อน
        return "ignore"

    def decide_article(self, a: dict) -> str | None:
        m = self.db.get_metrics(a["id"])
        if not m: return None                   # ยังไม่มี data

        if not m["indexed"]:       return "fix_index"
        if m["ctr"] < 0.02:       return "rewrite_title"
        if 5 < m["position"] <= 15: return "expand_content"
        if m["position"] > 15:    return "add_backlink"
        return "hold"

    # --- AI-enhanced decisions (hybrid) ---

    async def ai_decide(self, context: dict) -> dict:
        """ใช้ AI เฉพาะ decision ที่ซับซ้อน"""
        prompt = f"""
You are an SEO strategist. Given this data:
{context}

Decide the best action: generate | optimize | backlink | ignore
Explain why in 1 sentence.
Return JSON: {{"decision": "...", "reason": "...", "confidence": 0.0-1.0}}
"""
        return await self.gemini.generate(prompt)

    # --- Execution ---

    async def execute_keyword(self, k, decision):
        if decision == "generate":
            await self.writer.generate_from_keyword(k)
        self.db.log_decision(k["id"], "keyword", decision)

    async def execute_article(self, a, decision):
        if decision == "rewrite_title":
            await self.optimizer.rewrite_title(a)
        elif decision == "expand_content":
            await self.optimizer.expand_article(a)
        elif decision == "add_backlink":
            await self.backlink.run_for_article(a)
        elif decision == "fix_index":
            await self.optimizer.submit_index(a)
        self.db.log_decision(a["id"], "article", decision)
```

**Learning Loop (ทำให้ฉลาดขึ้นเรื่อยๆ):**
```python
# เก็บผลลัพธ์ทุก decision → ปรับ rules
if decision == "expand_content" and outcome == "rank_up":
    increase_weight("content_depth")
```

**Guardrails:**
- Confidence score < 0.6 → skip
- Max 5 articles/day, Max 3 backlinks/day
- Kill switch: ถ้า 10 actions fail → stop system

---

## Scheduler (Cron Jobs)

| Schedule | Job | Description |
|----------|-----|-------------|
| **ทุก 6 ชม.** | `SEOBrain.run()` | ตัดสินใจ + execute actions ทั้งหมด |
| **ทุก 12 ชม.** | `RankingOptimizer.run()` | ดึง GSC data + optimize |
| **ทุกวัน** | `KeywordDiscovery.run()` | หา keyword ใหม่ |
| **ทุกวัน** | Content generation | สร้าง content ที่ Brain สั่ง |
| **ทุกสัปดาห์** | `BacklinkFinder.find()` | หาโอกาส backlink ใหม่ |
| **ทุก 30 วัน** | Content refresh | refresh content เก่า |

---

## Queue System (Upgraded)

```
Priority Queue:
  HIGH   = money keyword articles (transactional/commercial intent)
  MEDIUM = informational articles
  LOW    = programmatic pages

Features:
  - Retry policy (max 3 retries, exponential backoff)
  - Dead-letter queue (failed jobs → manual review)
  - Job priority (high = money keyword ต้องทำก่อน)
  - Rate limiting (ป้องกัน API limit)
```

---

## Project Structure

```
_SEO_AGENTS/
├── frontend/                          # Next.js 15
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── sites/
│   │   │   │   ├── page.tsx           # Site list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Site detail + Brand Voice
│   │   │   │       ├── seo/page.tsx   # SEO report + Schema
│   │   │   │       ├── competitors/   # Competitor analysis
│   │   │   │       ├── keywords/      # Keyword management + discovery
│   │   │   │       ├── clusters/      # Topic clusters
│   │   │   │       ├── articles/      # Article list + status
│   │   │   │       ├── backlinks/     # Backlink status
│   │   │   │       ├── programmatic/  # Programmatic SEO
│   │   │   │       └── analytics/     # Performance dashboard
│   │   │   ├── articles/[id]/         # Article preview + EEAT score
│   │   │   └── brain/                 # AI Brain decisions log
│   │   ├── features/
│   │   │   ├── sites/
│   │   │   ├── keywords/
│   │   │   ├── articles/
│   │   │   ├── competitors/
│   │   │   ├── backlinks/
│   │   │   ├── programmatic/
│   │   │   ├── analytics/
│   │   │   └── dashboard/
│   │   ├── components/ui/             # shadcn/ui
│   │   └── lib/
│   └── package.json
│
├── backend/                           # Go Fiber + Air
│   ├── cmd/api/main.go
│   ├── .air.toml
│   ├── domain/
│   │   ├── models/
│   │   ├── dto/
│   │   ├── repositories/
│   │   └── services/
│   ├── application/serviceimpl/
│   ├── infrastructure/
│   │   ├── postgres/
│   │   ├── redis/
│   │   └── wordpress/                 # CMS client
│   ├── interfaces/api/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   └── routes/
│   └── pkg/
│       ├── config/
│       ├── di/
│       ├── logger/
│       └── scheduler/                 # Cron jobs
│
├── ai-engine/                         # Python FastAPI
│   ├── main.py
│   ├── skills/                        # marketingskills .md files
│   │   ├── seo-audit.md
│   │   ├── schema-markup.md
│   │   ├── copywriting.md
│   │   ├── competitor-profiling.md
│   │   ├── product-marketing-context.md
│   │   ├── programmatic-seo.md
│   │   ├── page-cro.md
│   │   ├── site-architecture.md
│   │   └── ... (38+ skills)
│   ├── services/
│   │   ├── # Core
│   │   ├── skill_loader.py
│   │   ├── skill_router.py            # Dynamic skill selection
│   │   ├── seo_brain.py               # Decision-making layer
│   │   ├── # Analysis
│   │   ├── crawler.py
│   │   ├── analyzer.py
│   │   ├── seo_advisor.py
│   │   ├── serp_analyzer.py           # SERP scraping + analysis
│   │   ├── competitor_profiler.py
│   │   ├── # Content
│   │   ├── article_writer.py
│   │   ├── internal_linker.py         # Graph-based linking
│   │   ├── schema_generator.py
│   │   ├── image_generator.py
│   │   ├── image_seo_optimizer.py     # Compression, WebP, alt
│   │   ├── # Discovery & Optimization
│   │   ├── keyword_discovery.py
│   │   ├── keyword_scorer.py
│   │   ├── ranking_optimizer.py       # Feedback loop
│   │   ├── # Publishing & Outreach
│   │   ├── cms_publisher.py           # WordPress integration
│   │   ├── backlink_finder.py
│   │   ├── outreach_agent.py
│   │   ├── link_tracker.py
│   │   ├── # Scale
│   │   ├── programmatic_generator.py
│   │   └── site_builder.py
│   ├── models/                        # Pydantic models
│   ├── utils/
│   │   ├── gemini_client.py
│   │   ├── gsc_client.py             # Google Search Console
│   │   └── scraper_utils.py
│   └── requirements.txt
│
├── docker-compose.yml
├── .env
├── .gitignore
└── SEO_AGENTS_PLAN.md
```

---

## Go Fiber + Air (Hot Reload)

### Air Config (`backend/.air.toml`)

```toml
root = "."
tmp_dir = "tmp"

[build]
  bin = "./tmp/main.exe"
  cmd = "go build -o ./tmp/main.exe ./cmd/api"
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor", "node_modules"]
  exclude_regex = ["_test.go"]
  include_ext = ["go", "tpl", "tmpl", "html", "toml", "yaml", "yml"]
  kill_delay = "0s"
  log = "build-errors.log"
  stop_on_error = false

[color]
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[misc]
  clean_on_exit = true

[screen]
  clear_on_rebuild = false
  keep_scroll = true
```

### ติดตั้ง Air

```bash
go install github.com/air-verse/air@latest
air -v
```

---

## API Endpoints

### Go Fiber (External API)

#### Sites
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sites` | Add site + trigger analysis |
| GET | `/api/v1/sites` | List all sites |
| GET | `/api/v1/sites/:id` | Site detail + brand voice |
| PUT | `/api/v1/sites/:id` | Update site |
| DELETE | `/api/v1/sites/:id` | Remove site |
| POST | `/api/v1/sites/:id/reanalyze` | Re-run analysis |

#### SEO
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sites/:id/seo` | SEO recommendations |
| GET | `/api/v1/sites/:id/urls` | Crawled URLs |
| GET | `/api/v1/sites/:id/schema` | Schema markup |

#### Competitors
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sites/:id/competitors` | Add competitor |
| GET | `/api/v1/sites/:id/competitors` | List competitors |

#### Keywords
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sites/:id/keywords` | Add keyword |
| GET | `/api/v1/sites/:id/keywords` | List keywords |
| GET | `/api/v1/sites/:id/keyword-opportunities` | Auto-discovered keywords |
| POST | `/api/v1/keywords/:id/suggest-topics` | Suggest topics |

#### Topic Clusters
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sites/:id/clusters` | Create topic cluster |
| GET | `/api/v1/sites/:id/clusters` | List clusters |

#### Articles
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/articles/generate` | Generate article |
| GET | `/api/v1/sites/:id/articles` | List articles |
| GET | `/api/v1/articles/:id` | Article detail |
| GET | `/api/v1/articles/:id/metrics` | Performance metrics |
| POST | `/api/v1/articles/:id/publish` | Publish to CMS |

#### Backlinks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sites/:id/backlinks` | List backlinks |
| GET | `/api/v1/sites/:id/backlink-opportunities` | Opportunities |
| POST | `/api/v1/backlinks/:id/outreach` | Send outreach |

#### Programmatic SEO
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sites/:id/templates` | Create template |
| POST | `/api/v1/templates/:id/generate` | Generate pages from template |
| GET | `/api/v1/sites/:id/programmatic-pages` | List generated pages |

#### Brain & Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sites/:id/decisions` | Brain decision logs |
| GET | `/api/v1/sites/:id/analytics` | Performance dashboard data |
| POST | `/api/v1/brain/run` | Manually trigger Brain |

### Python AI Engine (Internal API)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Analyze website |
| POST | `/seo-audit` | SEO audit |
| POST | `/serp-analyze` | SERP analysis |
| POST | `/competitor-profile` | Competitor analysis |
| POST | `/discover-keywords` | Keyword discovery |
| POST | `/suggest-topics` | Topic suggestions |
| POST | `/generate-article` | Generate article |
| POST | `/generate-programmatic` | Generate programmatic page |
| POST | `/generate-image` | Generate + optimize image |
| POST | `/generate-schema` | Generate JSON-LD |
| POST | `/optimize-article` | Ranking optimizer action |
| POST | `/find-backlinks` | Find backlink opportunities |
| POST | `/send-outreach` | Send outreach email |
| POST | `/brain/run` | Run SEO Brain |
| GET | `/skills` | List available skills |

---

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=seo_agents
DB_PASSWORD=your_password
DB_NAME=seo_agents

# Redis
REDIS_URL=redis://localhost:6379

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Google Search Console
GSC_CREDENTIALS_PATH=./credentials/gsc.json

# WordPress CMS
WP_URL=https://your-site.com
WP_USERNAME=admin
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Email (Outreach)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# AI Engine
AI_ENGINE_URL=http://localhost:8000

# App
APP_PORT=3001
FRONTEND_PORT=3000
```

---

## วิธีรัน (Local Development)

```bash
# 1. Start infrastructure
docker-compose up -d  # PostgreSQL + Redis

# 2. Clone marketing skills (ครั้งแรกเท่านั้น)
cd ai-engine
git clone https://github.com/coreyhaines31/marketingskills.git skills_repo
cp skills_repo/skills/*.md skills/

# 3. Start AI Engine (Python)
cd ai-engine
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 4. Start Backend (Go + Air hot reload)
cd backend
air

# 5. Start Frontend (Next.js)
cd frontend
npm install
npm run dev  # port 3000
```

---

## Full Automation Flow (End-to-End)

```
Day 0:  User ใส่เว็บ 1 ครั้ง + keyword seed 5 คำ
        → Crawl + Analyze + Brand Voice + Persona

Day 1:  Keyword Discovery หา 50 keywords
        → Brain score → เลือก top 10
        → Generate 10 articles (EEAT + Schema + Images)
        → Auto publish ไป WordPress

Day 3:  Ranking Optimizer ดึง GSC data
        → Fix titles ที่ CTR ต่ำ
        → Update บน WordPress

Day 7:  Expand content สำหรับ rank 5-15
        → Add internal links
        → Keyword Discovery รอบ 2

Day 14: Backlink Agent หาโอกาส
        → Generate link asset
        → Outreach 10 เว็บ

Day 30: Brain วิเคราะห์ผลรวม
        → Kill low performers
        → Scale winning keywords
        → Content refresh
        → Rank เริ่มขึ้น

→ ระบบวน loop ไปเรื่อยๆ ทุก 6 ชม.
```

---

## Implementation Priority

### Phase 1 — Foundation (MVP)
1. Project structure ทั้ง 3 services
2. Docker Compose (PostgreSQL + Redis)
3. Go Fiber + Air: Site CRUD + basic API
4. Python: Crawler + Gemini Analyzer + Skill Loader + Skill Router
5. Clone marketingskills → `ai-engine/skills/`
6. Next.js: Dashboard + Add site form
7. **ผลลัพธ์**: Add site → ดูผลวิเคราะห์ + Brand Voice + Persona

### Phase 2 — SEO & Content
1. SEO advisor (+ seo-audit, schema-markup skills)
2. SERP Analyzer
3. Competitor Profiler
4. Keyword management + Topic Suggestions
5. Article Writer (EEAT + Schema + Internal Links)
6. Image Generator + SEO Optimizer
7. Topic Cluster engine
8. Frontend: SEO report + keyword + article UI
9. **ผลลัพธ์**: วิเคราะห์ SEO + สร้างบทความ EEAT ครบ

### Phase 3 — Publishing & Feedback Loop
1. CMS Publisher (WordPress REST API)
2. GSC Integration
3. Ranking Optimizer (feedback loop)
4. Article metrics tracking
5. Content versioning (v1, v2, v3)
6. Frontend: Analytics dashboard + publish UI
7. **ผลลัพธ์**: Publish + track + optimize อัตโนมัติ

### Phase 4 — Autonomous Discovery
1. Keyword Discovery Engine (GSC + Suggest + Competitor + SERP)
2. Keyword Scoring
3. Auto Selection → Auto Generate
4. Scheduler (cron jobs)
5. Frontend: Keyword opportunities UI
6. **ผลลัพธ์**: ระบบหา keyword + สร้าง content เองได้

### Phase 5 — Backlink & Scale
1. Backlink Finder
2. Outreach Agent
3. Link Tracker
4. Programmatic SEO (templates + variables)
5. Site Builder
6. Frontend: Backlink + Programmatic UI
7. **ผลลัพธ์**: Scale ได้ 1000+ pages + backlink automation

### Phase 6 — AI Brain
1. SEO Brain (rule-based decisions)
2. AI-enhanced decisions (hybrid)
3. Learning Loop (track outcomes → adjust rules)
4. Budget Control + Kill Switch
5. Frontend: Brain decisions log
6. **ผลลัพธ์**: Autonomous SEO Machine ที่คิดและเลือกเอง

---

## Key Libraries

### Python (ai-engine)
```
fastapi
uvicorn
google-generativeai           # Gemini API
google-auth                   # GSC authentication
google-api-python-client      # GSC API
beautifulsoup4                # HTML parsing
playwright                    # Dynamic rendering + SERP scraping
httpx                         # Async HTTP
pydantic                      # Validation
Pillow                        # Image processing
python-wordpress-xmlrpc       # WordPress (alternative)
aiosmtplib                    # Email outreach
celery[redis]                 # Task queue (optional)
```

### Go (backend)
```
github.com/gofiber/fiber/v2
gorm.io/gorm
gorm.io/driver/postgres
github.com/redis/go-redis/v9
github.com/google/uuid
github.com/robfig/cron/v3     # Scheduler
github.com/air-verse/air      # Dev (hot reload)
```

### Next.js (frontend)
```
next 15
react 19
@tanstack/react-query
tailwindcss
shadcn/ui
axios
recharts                      # Analytics charts
```
