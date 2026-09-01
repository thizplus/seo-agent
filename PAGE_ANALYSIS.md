# Page-Level Analysis — Implementation Plan

## แนวคิด

ทุก page ของเว็บต้องถูกวิเคราะห์เทียบกับคู่แข่ง **ทุกวัน** อัตโนมัติ
เพื่อรู้ว่าหน้าเราขาดอะไร คู่แข่งทำอะไรเพิ่ม ต้องปรับปรุงตรงไหน

---

## สิ่งที่ต้องทำต่อ page (1 page = 1 analysis)

```
Page: /display (ดิสเพลย์)
│
├── 1. SERP Analyze (keyword หลักของหน้านี้)
│   ├── Scrape Google top 10
│   ├── เก็บ: url, title, word_count, position
│   ├── หาว่าเราอยู่อันดับเท่าไหร่
│   └── เก็บเป็น snapshot รายวัน (เทียบกับเมื่อวาน)
│
├── 2. On-Page Audit (เทียบเรา vs คู่แข่ง)
│   ├── Word Count: เรา 486 vs avg คู่แข่ง 1800 → ⚠️ ต้องเพิ่ม 1300+
│   ├── H1: "Display" → ⚠️ ควรเป็นภาษาไทย + มี keyword
│   ├── Meta Description: ไม่มี → ❌
│   ├── H2 Structure: คู่แข่งมี 8 H2 เราม 2 → ⚠️
│   ├── Images: คู่แข่ง avg 5 รูป เรา 1 → ⚠️
│   └── Internal Links: คู่แข่ง avg 10 links เรา 2 → ⚠️
│
├── 3. Changes Detection (เทียบกับเมื่อวาน)
│   ├── คู่แข่งรายใหม่เข้า top 10?
│   ├── คู่แข่งเก่าหายไป?
│   ├── คู่แข่งเพิ่มเนื้อหา (word count เพิ่ม)?
│   └── อันดับเราเปลี่ยน?
│
└── 4. Recommendations (AI สรุปให้)
    ├── "เพิ่มเนื้อหาอีก 1300 คำ เน้น FAQ + ตัวอย่าง"
    ├── "แก้ H1 เป็น 'ชั้นวางสินค้า ดิสเพลย์ ราคาโรงงาน'"
    └── "เพิ่ม meta description 150 ตัวอักษร"
```

---

## Trigger: กดเองก็ได้ + Auto ทุกวันก็ได้

### กดเอง (Manual)
- ปุ่ม **"Analyze"** ต่อ page ใน UI
- วิเคราะห์ page นั้นทันที (SERP + audit + recommendations)
- ผลแสดงใน UI ทันที

### Auto ทุกวัน (Scheduler 03:00)
- วิเคราะห์ **ทุก page ของทุก site** อัตโนมัติ
- **ทำทีละ page มี delay** ป้องกัน rate limit + Google block

#### Delay Strategy

```
Site 1 (19 pages × 3 keywords = ~57 SERP requests)
│
├── Page 1: /display
│   ├── Keyword "ชั้นวางสินค้า" → SERP analyze → 5 sec
│   ├── Keyword "ดิสเพลย์อะคริลิค" → SERP analyze → 5 sec
│   └── Keyword "ผลิตดิสเพลย์" → SERP analyze → 5 sec
│   └── On-page audit → 2 sec
│   └── Total: ~17 sec
│   └── Delay หลัง page: 30 sec
│
├── Page 2: /booth-exhibition
│   └── ... (เหมือนกัน)
│   └── Delay: 30 sec
│
├── ...
│
└── Page 19: done
    └── Delay ก่อน site ถัดไป: 60 sec

Site 2 (next site)
└── ...

ประมาณ:
- 1 page = ~20 sec (SERP + audit) + 30 sec delay = ~50 sec
- 19 pages = ~16 min ต่อ site
- 4 sites = ~64 min + delays = ~90 min total
- เริ่ม 03:00 → เสร็จ ~04:30
```

---

## Database

### page_analyses (on-page audit ล่าสุด)
```sql
CREATE TABLE page_analyses (
    id UUID PRIMARY KEY,
    page_id UUID REFERENCES site_pages(id) ON DELETE CASCADE,
    analyzed_at TIMESTAMPTZ NOT NULL,

    -- Our page data
    our_word_count INT,
    our_h1 VARCHAR(500),
    our_meta VARCHAR(500),
    our_h2_count INT,
    our_image_count INT,
    our_internal_links INT,

    -- Competitor avg data
    avg_word_count INT,
    avg_h2_count INT,
    avg_image_count INT,
    competition_count INT,

    -- Audit results
    issues JSONB,           -- [{type: "word_count", severity: "warning", message: "..."}]
    recommendations JSONB,  -- ["เพิ่มเนื้อหาอีก 1300 คำ", "แก้ H1", ...]

    -- SERP snapshot per keyword
    serp_snapshots JSONB,   -- {keyword: {our_position, results: top10[], changes: {}}}

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### keyword_serp_history (SERP snapshot รายวัน — เก็บ history)
```sql
CREATE TABLE keyword_serp_history (
    id UUID PRIMARY KEY,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    checked_at DATE NOT NULL,
    our_position INT DEFAULT 0,
    avg_word_count INT,
    results JSONB,          -- [{url, title, word_count, position}]
    changes JSONB,          -- {new: [], removed: [], updated: []}
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Manual (กดเอง)
| Method | Path | ทำอะไร |
|--------|------|--------|
| POST | `/sites/:id/pages/:pageId/analyze` | วิเคราะห์ page เดียว (SERP + audit) |
| GET | `/sites/:id/pages/:pageId/analysis` | ดูผล analysis ล่าสุด |
| GET | `/keywords/:id/serp-history` | ดู SERP history ของ keyword |

### Auto (Scheduler)
| เวลา | Job | ทำอะไร |
|-------|-----|--------|
| 03:00 ทุกวัน | `runPageAnalysis()` | วิเคราะห์ทุก page ทุก site (มี delay) |

---

## Python AI Engine Endpoints

| Method | Path | ทำอะไร |
|--------|------|--------|
| POST | `/analyze-page` | วิเคราะห์ 1 page: SERP + on-page audit + recommendations |

### Request
```json
{
  "page_url": "https://ideahead.co.th/display",
  "keywords": ["ชั้นวางสินค้า", "ดิสเพลย์อะคริลิค"],
  "site_url": "https://ideahead.co.th",
  "llm_provider": "gemini",
  "llm_api_key": "..."
}
```

### Response
```json
{
  "page_url": "https://ideahead.co.th/display",
  "our_page": {
    "word_count": 486,
    "h1": "Display",
    "meta_description": "",
    "h2_count": 2,
    "image_count": 1,
    "internal_links": 2
  },
  "serp_results": {
    "ชั้นวางสินค้า": {
      "our_position": 0,
      "avg_word_count": 1800,
      "results": [
        {"position": 1, "url": "competitor-a.com", "title": "...", "word_count": 2100},
        {"position": 2, "url": "competitor-b.com", "title": "...", "word_count": 1800}
      ],
      "changes": {
        "new_competitors": ["competitor-b.com"],
        "removed": [],
        "position_change": 0
      }
    }
  },
  "audit": {
    "issues": [
      {"type": "word_count", "severity": "critical", "message": "เนื้อหา 486 คำ น้อยกว่า avg คู่แข่ง 1800 คำ (ขาด 1314 คำ)"},
      {"type": "h1", "severity": "warning", "message": "H1 เป็นภาษาอังกฤษ 'Display' ควรเป็นไทย + มี keyword"},
      {"type": "meta", "severity": "critical", "message": "ไม่มี meta description"},
      {"type": "h2_count", "severity": "warning", "message": "มี H2 แค่ 2 หัวข้อ คู่แข่ง avg 8 หัวข้อ"}
    ],
    "score": 35,
    "recommendations": [
      "เพิ่มเนื้อหาอีก 1300+ คำ เน้นรายละเอียดสินค้า + FAQ",
      "แก้ H1 เป็น 'ชั้นวางสินค้า ดิสเพลย์ ราคาโรงงาน | IdeaHead'",
      "เพิ่ม meta description: 'โรงงานผลิตชั้นวางสินค้า ดิสเพลย์กระดาษ อะคริลิค...'",
      "เพิ่ม H2 sections: วิธีเลือก, ประเภท, ราคา, ตัวอย่างผลงาน"
    ]
  }
}
```

---

## UI ที่ต้องเพิ่ม

### Pages Card (แก้ไข — เพิ่มปุ่ม Analyze + แสดง audit)

```
Pages (19)
│
├── /display [product] 486 words
│   ├── Keywords: ชั้นวางสินค้า [7/10], ดิสเพลย์ [6/10]
│   ├── Audit Score: 35/100 ⚠️
│   ├── Issues: word_count ❌, H1 ⚠️, meta ❌
│   └── [Analyze] [Generate Article]
│
├── /booth-exhibition [other] 222 words
│   ├── Keywords: บูธงานแสดงสินค้า [8/10]
│   ├── Audit Score: -- (ยังไม่ analyze)
│   └── [Analyze] [Generate Article]
│
└── /sticker [other] 309 words
    └── ...
```

### Page Detail (กดเข้า page → เห็น full analysis)

```
Page: /display — ชั้นวางสินค้า

Our Page:
  Word Count: 486 ⚠️ (avg คู่แข่ง: 1800)
  H1: "Display" ⚠️
  Meta: ไม่มี ❌

SERP Top 10 for "ชั้นวางสินค้า":
  #1 competitor-a.com — 2100 words — ไม่เปลี่ยน
  #2 competitor-b.com — 1800 words — ใหม่!
  #3 competitor-c.com — 1500 words
  ...
  เราอยู่: ไม่ติดอันดับ

Recommendations:
  1. เพิ่มเนื้อหาอีก 1300+ คำ
  2. แก้ H1 เป็นภาษาไทย
  3. เพิ่ม meta description
  4. เพิ่ม FAQ section

[Generate Article for this page]
```

---

## Implementation Files

### Backend (Go)
| ไฟล์ | ทำอะไร |
|------|--------|
| `models/page_analysis.go` | **สร้างใหม่** — PageAnalysis model |
| `models/keyword_serp_history.go` | **สร้างใหม่** — SERP history model |
| `repositories/page_analysis_repository.go` | **สร้างใหม่** — Interface |
| `repositories/serp_history_repository.go` | **สร้างใหม่** — Interface |
| `postgres/page_analysis_repo.go` | **สร้างใหม่** — Implementation |
| `postgres/serp_history_repo.go` | **สร้างใหม่** — Implementation |
| `dto/page_analysis_dto.go` | **สร้างใหม่** — Response + mapper |
| `handlers/page_handler.go` | **แก้** — เพิ่ม AnalyzePage, GetAnalysis |
| `routes/routes.go` | **แก้** — เพิ่ม routes |
| `scheduler/scheduler.go` | **แก้** — เพิ่ม runPageAnalysis() job ทุกวัน 03:00 |
| `di/container.go` | **แก้** — เพิ่ม repos + services |
| `postgres/db.go` | **แก้** — AutoMigrate ใหม่ |

### Python AI Engine
| ไฟล์ | ทำอะไร |
|------|--------|
| `services/page_analyzer.py` | **สร้างใหม่** — SERP + crawl page + audit + LLM recommendations |
| `models/schemas.py` | **แก้** — เพิ่ม AnalyzePageRequest |
| `main.py` | **แก้** — เพิ่ม `/analyze-page` endpoint |

### Frontend
| ไฟล์ | ทำอะไร |
|------|--------|
| `features/pages/types.ts` | **แก้** — เพิ่ม PageAnalysis, AuditIssue interfaces |
| `features/pages/service.ts` | **แก้** — เพิ่ม analyzePage(), getAnalysis() |
| `features/pages/hooks.ts` | **แก้** — เพิ่ม useAnalyzePage(), usePageAnalysis() |
| `sites/components/pages-card.tsx` | **แก้** — เพิ่มปุ่ม Analyze + แสดง audit score |
| `sites/components/page-detail-card.tsx` | **สร้างใหม่** — full page analysis view |

---

## Scheduler Detail (03:00 ทุกวัน)

```go
func (s *Scheduler) runPageAnalysis() {
    sites := getAllSites()

    for _, site := range sites {
        pages := getPagesBySiteID(site.ID)

        for _, page := range pages {
            keywords := getKeywordsByPageID(page.ID)

            // SERP analyze ทุก keyword ของ page นี้
            for _, kw := range keywords {
                serpData := aiEngine.AnalyzeSERP(kw.Keyword)
                saveSerpHistory(kw.ID, serpData)    // เก็บ history
                updateKeywordSERP(kw.ID, serpData)  // update ล่าสุด
                time.Sleep(5 * time.Second)         // delay ระหว่าง keyword
            }

            // On-page audit (เทียบ page เรา vs SERP avg)
            audit := aiEngine.AnalyzePage(page, keywords, serpData)
            savePageAnalysis(page.ID, audit)

            time.Sleep(30 * time.Second) // delay ระหว่าง page
        }

        time.Sleep(60 * time.Second) // delay ระหว่าง site
    }
}
```

### เวลาที่ใช้ (ประมาณ)

| รายการ | เวลา |
|--------|------|
| 1 keyword SERP | ~3 sec (scrape) + 5 sec delay |
| 1 page (3 keywords + audit) | ~40 sec + 30 sec delay = **70 sec** |
| 1 site (19 pages) | ~22 min + 60 sec delay |
| 4 sites | ~90 min |
| **เริ่ม 03:00 → เสร็จ ~04:30** | |

---

## สรุป

| อะไร | กดเอง | Auto | เวลา Auto |
|------|-------|------|-----------|
| Pipeline (crawl + keywords) | ✅ ปุ่ม Run Pipeline | ❌ ไม่ auto | - |
| Page Analysis (SERP + audit) | ✅ ปุ่ม Analyze ต่อ page | ✅ ทุกวัน | 03:00 |
| Content Generation | ✅ ปุ่ม Generate ต่อ keyword | ✅ ทุกวัน | 06:00 |
| Ranking Tracker (GSC) | ❌ auto only | ✅ ทุก 12 ชม. | */12h |
