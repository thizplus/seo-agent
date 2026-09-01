# SEO Agents — Pipeline & Automation Flow

## แนวคิดหลัก

ระบบทำงาน 3 ระดับ: **Site → Page → Keyword**

```
Site (เว็บ 1 เว็บ)
├── Page 1 (URL: /product/booth-fabric)
│   ├── Keyword: "บูธผ้า ราคา"
│   │   ├── SERP Top 10 (คู่แข่ง)
│   │   ├── Ranking History (อันดับรายวัน)
│   │   └── Articles (บทความที่เขียนให้ keyword นี้)
│   ├── Keyword: "บูธผ้า สำเร็จรูป"
│   │   └── ...
│   └── On-Page Audit (title, meta, H1, word count, ขาดอะไร)
│
├── Page 2 (URL: /product/backdrop)
│   ├── Keyword: "แบคดรอปผ้า"
│   └── ...
│
└── Page 3 (URL: /service/booth-rental)
    └── ...
```

---

## 4 Steps ของระบบ

### Step 1: Site Pipeline (ทำครั้งแรก + เมื่อมีหน้าใหม่)

> **เป้าหมาย:** เก็บ page ทั้งหมดของเว็บ + keyword ของแต่ละ page
> **Trigger:** กดปุ่ม "Run Pipeline" / กดซ้ำเมื่อสร้างหน้าใหม่
> **ไม่ตั้งเวลา** — ทำเมื่อต้องการ

```
กด Run Pipeline
│
├── Crawl เว็บ (max 50 pages)
│   └── เก็บทุก page: URL, title, H1, H2s, meta, word_count, page_type
│
├── LLM วิเคราะห์ site
│   ├── business_type, industry, brand_voice
│   └── target_persona
│
├── LLM เลือก keywords ต่อ page (1-3 keywords/page)
│   ├── Page /product/booth → ["บูธผ้า ราคา", "บูธผ้า สำเร็จรูป"]
│   ├── Page /product/backdrop → ["แบคดรอปผ้า", "แบคดรอป พับได้"]
│   └── Page /service/rental → ["เช่าบูธ งานแสดงสินค้า"]
│
├── Save ทั้งหมดลง DB
│   ├── sites → analysis_data, brand_voice
│   ├── site_pages → url, title, h1, meta, page_type, keywords
│   └── keywords → keyword, page_id, site_id
│
└── Result: UI แสดงทุก page + keyword ของแต่ละ page
```

**กดซ้ำอีกครั้ง:**
- Crawl ใหม่ → เจอ page ใหม่ที่เพิ่งสร้าง → เพิ่มเข้า DB
- Page เก่าที่มีอยู่แล้ว → update ข้อมูล (title, word_count อาจเปลี่ยน)
- Keyword เก่า → ไม่ลบ, ไม่สร้างซ้ำ

---

### Step 2: Page Analysis (ทำทุกวัน 03:00)

> **เป้าหมาย:** ตรวจสอบคู่แข่ง top 10 + on-page audit ทุก keyword
> **Trigger:** Scheduler ทุกวัน 03:00
> **ทำไม:** คู่แข่งเปลี่ยนทุกวัน ต้อง track

```
ทุกวัน 03:00
│
สำหรับแต่ละ site:
  สำหรับแต่ละ keyword (ทีละตัว, delay 30s):
  │
  ├── SERP Analyze (Google top 10)
  │   ├── อันดับ 1: competitor-a.com — "บูธผ้า ราคาถูก" (2100 words)
  │   ├── อันดับ 2: competitor-b.com — "รวมบูธผ้า 2026" (1800 words)
  │   ├── ...
  │   └── อันดับ 10: competitor-j.com — (900 words)
  │
  ├── เก็บ SERP snapshot ลง DB (keyword_serp_history)
  │   └── date, keyword_id, results[], avg_word_count, our_position
  │
  ├── เทียบกับเมื่อวาน
  │   ├── คู่แข่งรายใหม่เข้ามา?
  │   ├── คู่แข่งเก่าหายไป?
  │   └── เนื้อหาคู่แข่งเพิ่มขึ้น?
  │
  └── On-Page Audit ของ page เรา
      ├── title มี keyword ไหม?
      ├── meta description ดีพอไหม?
      ├── H1/H2 structure ถูกไหม?
      ├── word count เทียบกับ avg คู่แข่ง?
      └── ขาดอะไร → บันทึกเป็น recommendations
```

**Data ที่ UI แสดง (ต่อ keyword):**
```
Keyword: "บูธผ้า ราคา"
├── Page: /product/booth-fabric
├── Score: 7/10 | Intent: transactional
├── Our Position: #8 (↑2 จากเมื่อวาน)
├── Competitors:
│   ├── #1 competitor-a.com (2100 words) — ไม่เปลี่ยน
│   ├── #2 competitor-b.com (1800 words) — ใหม่! เพิ่งเข้ามา
│   └── #3 competitor-c.com (1500 words)
├── Avg competitor words: 1800
├── Our page words: 1200 ⚠️ (น้อยกว่า avg)
└── Recommendations:
    ├── เพิ่มเนื้อหาอีก 600+ คำ
    ├── H2 ขาด "วิธีเลือกบูธผ้า"
    └── เพิ่ม FAQ section
```

---

### Step 3: Content Generation (ทำทุกวัน 06:00)

> **เป้าหมาย:** สร้างบทความสำหรับ keyword ที่ยังไม่มีบทความ
> **Trigger:** Scheduler ทุกวัน 06:00
> **ใช้ data จาก Step 2** — รู้คู่แข่ง + รู้ว่าต้องเขียนกี่คำ + ต้องมี H2 อะไร

```
ทุกวัน 06:00
│
สำหรับแต่ละ site:
  ├── ดึง keywords ที่ยังไม่มีบทความ
  ├── เรียงตาม score สูงสุด
  ├── เลือก top 3
  │
  สำหรับแต่ละ keyword (delay 60s):
  │
  ├── ดึง SERP data จาก DB (Step 2 เก็บไว้แล้ว)
  │   └── "คู่แข่ง avg 1800 คำ, common H2s: วิธีเลือก, ราคา, ติดตั้ง"
  │
  ├── Generate บทความ EEAT
  │   ├── ต้อง > avg คู่แข่ง words
  │   ├── ครอบคลุม H2s ที่คู่แข่งมี + เพิ่มของเรา
  │   └── เน้น E-E-A-T signals
  │
  └── Save เป็น draft → คนตรวจ → Publish
```

---

### Step 4: Ranking Tracker (ทำทุก 12 ชม.)

> **เป้าหมาย:** ติดตามอันดับ keyword ของเรา + ปรับปรุงอัตโนมัติ
> **Trigger:** Scheduler ทุก 12 ชม.
> **ต้องมี GSC connected**

```
ทุก 12 ชม.
│
สำหรับแต่ละ site ที่มี GSC:
  สำหรับแต่ละ keyword/page:
  │
  ├── ดึง metrics จาก GSC
  │   ├── position (อันดับ)
  │   ├── impressions
  │   ├── clicks
  │   └── CTR
  │
  ├── เก็บ ranking history (keyword_rankings table)
  │   └── date, keyword_id, position, impressions, clicks, ctr
  │
  ├── ตัดสินใจ optimize
  │   ├── CTR < 2% → rewrite title อัตโนมัติ
  │   ├── Position 5-15 → expand content
  │   ├── Position > 15 → add internal links
  │   └── Position 1-3 → ไม่ต้องทำอะไร (รักษาตำแหน่ง)
  │
  └── Update WordPress อัตโนมัติ (ถ้ามี action)
```

**Data ที่ UI แสดง (Ranking History):**
```
Keyword: "บูธผ้า ราคา"
├── Day 1:  Position #42  | Impressions: 10   | CTR: 0%
├── Day 7:  Position #18  | Impressions: 120  | CTR: 1.2%
├── Day 14: Position #11  | Impressions: 350  | CTR: 2.5%  → expand content
├── Day 21: Position #7   | Impressions: 800  | CTR: 4.1%
├── Day 30: Position #4   | Impressions: 1500 | CTR: 6.8%
└── Trend: ↑ ขึ้นเรื่อยๆ
```

---

## ตาราง DB ที่ต้องเพิ่ม

### site_pages (เก็บทุก page ของเว็บ)
```sql
CREATE TABLE site_pages (
    id UUID PRIMARY KEY,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL,
    title VARCHAR(500),
    h1 VARCHAR(500),
    meta_description TEXT,
    page_type VARCHAR(50),       -- product | service | blog | home | other
    word_count INT DEFAULT 0,
    last_crawled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### keywords (เพิ่ม page_id)
```sql
ALTER TABLE keywords ADD COLUMN page_id UUID REFERENCES site_pages(id);
-- keyword ผูกกับ page → รู้ว่า keyword นี้มาจากหน้าไหน
```

### keyword_serp_history (SERP snapshot รายวัน)
```sql
CREATE TABLE keyword_serp_history (
    id UUID PRIMARY KEY,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    checked_at DATE NOT NULL,
    our_position INT,                 -- อันดับของเรา (0 = ไม่ติด)
    avg_word_count INT,
    results JSONB,                    -- top 10: [{url, title, word_count, position}]
    changes JSONB,                    -- {new_competitors: [], removed: [], content_changes: []}
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### keyword_rankings (ranking history จาก GSC)
```sql
CREATE TABLE keyword_rankings (
    id UUID PRIMARY KEY,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    page_id UUID REFERENCES site_pages(id),
    recorded_at DATE NOT NULL,
    position FLOAT,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    ctr FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Scheduler Summary

| เวลา | Job | ทำอะไร | ต้อง GSC? |
|-------|-----|--------|----------|
| **Manual** | Run Pipeline | Crawl + วิเคราะห์ site + เก็บ pages + keywords | ไม่ |
| **03:00 ทุกวัน** | Page Analysis | SERP top 10 ทุก keyword + on-page audit | ไม่ |
| **06:00 ทุกวัน** | Content Gen | สร้างบทความ 3 ตัว/site (draft) | ไม่ |
| ***/12h** | Ranking Track | ดึง GSC metrics + optimize อัตโนมัติ | ต้อง |

---

## UI ที่ต้องแสดง

### Site Detail Page

```
Site: IdeaHead (https://ideahead.co.th)
├── [Run Pipeline] ← กดเพื่อ crawl + เก็บ pages
│
├── Pages (19 pages)
│   ├── /product/display → "ดิสเพลย์" [product] 850 words
│   │   ├── Keywords: "ดิสเพลย์กระดาษ" [7/10], "ผลิตดิสเพลย์" [6/10]
│   │   ├── SERP: 10 competitors | avg 1800 words | our position: #12
│   │   └── Audit: ⚠️ word count ต่ำกว่า avg, ขาด FAQ
│   │
│   ├── /product/sticker → "สติ๊กเกอร์" [product] 600 words
│   │   ├── Keywords: "สติ๊กเกอร์ไดคัต ราคา" [6/10]
│   │   └── SERP: 10 competitors | avg 2000 words
│   │
│   └── /service/booth → "บูธสำเร็จรูป" [service] 400 words
│       └── Keywords: "บูธสำเร็จรูป ราคา" [7/10]
│
├── Articles (draft — รอ publish)
│   ├── "ดิสเพลย์กระดาษ: คู่มือฉบับสมบูรณ์" — 2500 words [completed]
│   └── "สติ๊กเกอร์ไดคัต ราคา" — 2100 words [completed]
│
└── Ranking History (กราฟ)
    ├── "ดิสเพลย์กระดาษ": #42 → #18 → #11 → #7 (↑)
    └── "สติ๊กเกอร์ไดคัต": #35 → #22 → #15 (↑)
```

---

## Flow Summary

```
Step 1 (Manual): Crawl เว็บ → เก็บ pages + keywords ต่อ page
                         ↓
Step 2 (ทุกวัน 03:00): SERP analyze ทุก keyword → เก็บคู่แข่ง top 10
                         ↓
Step 3 (ทุกวัน 06:00): Generate บทความ (ใช้ SERP data) → draft
                         ↓
Step 4 (ทุก 12 ชม.):   Track ranking จาก GSC → optimize อัตโนมัติ
                         ↓
                    วน loop ทุกวัน
```
