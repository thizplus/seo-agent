# Keyword Focus Queue — แผนระบบสร้างบทความตาม Keyword Map

## สรุปฟีเจอร์

ลูกค้าส่ง Keyword Map (Excel/Sheet) มาให้ → เราใส่เข้าระบบ → ระบบสร้างบทความ **วันละ 1 keyword/site** ตามลำดับ Priority ไม่ซ้ำกัน วนไปเรื่อยๆ

---

## ภาพรวม Flow

```
ลูกค้าส่ง Keyword Map (Google Sheet / Excel)
  ↓
เราใส่ Keyword Focus Queue ผ่าน UI:
  - เพิ่มทีละตัว (กรอก form)
  - Import ทีเดียว (วาง CSV จาก Sheet หรือ JSON)
  ↓
Scheduler ตี 6 ทุกวัน:
  1. เช็ค Focus Queue ก่อน (ถ้ามี → ใช้ queue, ไม่มี → fallback ระบบเดิม)
  2. ดึง keyword ถัดไปที่ status = 'pending' เรียงตาม priority
  3. เช็คว่า keyword นี้มีบทความอยู่แล้วหรือไม่ (ป้องกันซ้ำ)
  4. สร้างบทความ 1 keyword (ใช้ primary + secondary keywords + pillar URL)
  5. mark status = 'completed', link article_id
  ↓
วันถัดไป → หยิบ keyword ถัดไปอัตโนมัติ
  ↓
ครบทุก keyword → หยุด (กด Reset ถ้าจะวนรอบใหม่)
```

---

## Database — ตาราง `keyword_focus_queue`

```sql
CREATE TABLE keyword_focus_queue (
    id UUID PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    priority INT NOT NULL,                    -- ลำดับความสำคัญ (1 = สำคัญสุด)
    pillar_url VARCHAR(500),                  -- URL หลัก (Pillar Page)
    primary_keyword VARCHAR(255) NOT NULL,    -- keyword หลัก
    secondary_keywords TEXT,                  -- keyword รอง (comma separated)
    status VARCHAR(50) DEFAULT 'pending',     -- pending | completed | failed | skipped
    article_id UUID REFERENCES articles(id),  -- link บทความที่สร้างแล้ว
    error_message TEXT,                       -- เก็บ error ถ้าสร้างไม่สำเร็จ
    retry_count INT DEFAULT 0,                -- จำนวนครั้งที่ retry
    completed_at TIMESTAMP,                   -- วันที่สร้างบทความ
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(site_id, primary_keyword)
);
```

### Status Flow
```
pending → completed (สร้างบทความสำเร็จ)
pending → failed (สร้างไม่สำเร็จ → retry วันถัดไป สูงสุด 3 ครั้ง)
failed → completed (retry สำเร็จ)
failed → skipped (retry ครบ 3 ครั้งแล้วยังไม่สำเร็จ → ข้ามไป keyword ถัดไป)
pending → skipped (ข้ามด้วยมือ ผ่าน UI)
completed → pending (reset เพื่อวนรอบใหม่)
```

---

## ตัวอย่างข้อมูลจาก Keyword Map ของ Adlite

| priority | pillar_url | primary_keyword | secondary_keywords | status |
|----------|-----------|----------------|-------------------|--------|
| 1 | /fabricbackdrop/ | แบคดรอปผ้า | Backdrop ผ้า, แบคดรอปออกบูธ, สั่งทำแบคดรอปผ้า, Fabric Backdrop | pending |
| 2 | /table-cover/ | ผ้าคลุมโต๊ะ | ผ้าปูโต๊ะ, ผ้าคลุมโต๊ะออกบูธ, ผ้าคลุมโต๊ะสกรีนโลโก้ | pending |
| 3 | / | อุปกรณ์ออกบูธ | บูธผ้า, อุปกรณ์จัดบูธ, บูธสำเร็จรูป, ชุดออกบูธ | pending |
| 4 | /fabriclightbox/ | กล่องไฟผ้า | Fabric Lightbox, กล่องไฟออกบูธ, กล่องไฟผ้าติดผนัง | pending |
| 5 | /roll-up/ | Roll Up | โรลอัพ, Roll Up ผ้า, ป้าย Roll Up, Roll Up ราคา | pending |
| 6 | /fabric-counter/ | เคาน์เตอร์ผ้า | เคาน์เตอร์ออกบูธ, เคาน์เตอร์ผ้าออกงาน, Fabric Counter | pending |
| 7 | /backdrop-set/ | ชุดออกบูธ | ชุดออกบูธผ้า, บูธสำเร็จรูป, ชุดบูธแสดงสินค้า, แบคดรอปพร้อมเคาน์เตอร์ | pending |
| 8 | /boothdesign/ | ออกแบบบูธ | รับออกแบบบูธ, บูธแสดงสินค้า, ออกแบบบูธผ้า, ผลิตบูธแสดงสินค้า | pending |
| 9 | /cloth-flag/ | ธงปีกนก | ธงชายหาด, Beach Flag, ธงโฆษณา, รับทำธงปีกนก | pending |
| 10 | /booth-exhibition/ | รับพิมพ์ผ้าออกบูธ | พิมพ์ผ้า, งานพิมพ์ผ้า, พิมพ์ผ้า Exhibition, พิมพ์ผ้าแบคดรอป | pending |

---

## Scheduler Logic (แก้ `runContentGeneration`)

```
สำหรับแต่ละ site:

  1. ดึง Focus Queue:
     - pending: ORDER BY priority ASC LIMIT 1
     - failed ที่ retry < 3: ORDER BY priority ASC LIMIT 1

  2. ถ้ามี queue item:
     a. เช็คว่า primary_keyword มีบทความอยู่แล้วไหม (ป้องกันซ้ำ)
        - ถ้ามี → mark completed + link article_id ที่มีอยู่ → หยิบตัวถัดไป
        - ถ้าไม่มี → สร้างบทความใหม่
     b. สร้างบทความ: ส่ง primary + secondary keywords + pillar_url ไปยัง AI Engine
     c. สำเร็จ → UPDATE status='completed', article_id=?, completed_at=NOW()
     d. ล้มเหลว → UPDATE status='failed', error_message=?, retry_count++
        - ถ้า retry_count >= 3 → UPDATE status='skipped'

  3. ถ้าไม่มี queue item (ไม่มี pending/failed):
     → fallback ระบบเดิม (หยิบจาก keywords table)

  4. delay 120 วินาที ก่อนไป site ถัดไป
```

### Priority Logic
- **มี Focus Queue (pending/failed items)** → ใช้ queue (สร้างตามลำดับ priority)
- **ไม่มี Focus Queue** → fallback เป็นระบบเดิม (หยิบ keyword จาก keywords table)
- **Queue ครบหมดแล้ว (ทุก item completed/skipped)** → ไม่สร้างจาก queue อีก, fallback ระบบเดิม

---

## AI Engine — แก้ไข article_writer.py

### ปัจจุบัน
```python
async def generate(keyword, site_url, site_name, brand_voice, industry):
    # ใช้แค่ keyword ตัวเดียว
    serp_data = await self.serp.analyze(keyword)
    prompt = f"เขียนบทความ SEO สำหรับ keyword: {keyword}"
    ...
```

### ใหม่ — เพิ่ม parameter
```python
async def generate(keyword, site_url, site_name, brand_voice, industry,
                   secondary_keywords=None, pillar_url=None):
    serp_data = await self.serp.analyze(keyword)

    prompt = f"เขียนบทความ SEO สำหรับ keyword หลัก: {keyword}"

    if secondary_keywords:
        prompt += f"""
        ใช้ keyword รองเหล่านี้เป็น H2/H3 headings ในบทความ:
        {', '.join(secondary_keywords)}
        """

    if pillar_url:
        prompt += f"""
        ใส่ internal link กลับไปยังหน้าหลัก: {pillar_url}
        โดยใช้ anchor text ที่เกี่ยวข้องกับ keyword หลัก
        """
    ...
```

### Backend → AI Engine Request
```json
{
  "keyword": "แบคดรอปผ้า",
  "site_url": "https://adliteandfavbric.com",
  "site_name": "Adlite and Fabric",
  "brand_voice": "...",
  "industry": "...",
  "llm_provider": "gemini",
  "llm_api_key": "...",
  "secondary_keywords": ["Backdrop ผ้า", "แบคดรอปออกบูธ", "สั่งทำแบคดรอปผ้า"],
  "pillar_url": "https://adliteandfavbric.com/fabricbackdrop/"
}
```

### ผลลัพธ์บทความ
- H1: keyword หลัก (แบคดรอปผ้า)
- H2/H3: secondary keywords (Backdrop ผ้า, แบคดรอปออกบูธ, ...)
- Internal link: `<a href="/fabricbackdrop/">แบคดรอปผ้า</a>` ในเนื้อหา
- SERP-based: วิเคราะห์ top 10 + เขียนให้ดีกว่า

---

## API Endpoints ใหม่

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/v1/sites/:id/focus-queue` | ดู queue ทั้งหมด + สถานะสรุป |
| POST | `/api/v1/sites/:id/focus-queue` | เพิ่ม keyword เข้า queue (ทีละตัว) |
| POST | `/api/v1/sites/:id/focus-queue/import` | Import หลายตัว (JSON array หรือ CSV) |
| PUT | `/api/v1/sites/:id/focus-queue/:queueId` | แก้ไข priority / keywords |
| DELETE | `/api/v1/sites/:id/focus-queue/:queueId` | ลบออกจาก queue |
| POST | `/api/v1/sites/:id/focus-queue/:queueId/skip` | ข้าม keyword นี้ |
| POST | `/api/v1/sites/:id/focus-queue/:queueId/retry` | Retry keyword ที่ failed |
| POST | `/api/v1/sites/:id/focus-queue/reset` | Reset completed ทั้งหมดเป็น pending |
| GET | `/api/v1/sites/:id/focus-queue/status` | สรุปสถานะ (จำนวน, progress, keyword ถัดไป) |

### Import — รองรับ 2 format

**JSON:**
```json
{
  "keywords": [
    {
      "priority": 1,
      "pillarUrl": "/fabricbackdrop/",
      "primaryKeyword": "แบคดรอปผ้า",
      "secondaryKeywords": "Backdrop ผ้า, แบคดรอปออกบูธ, สั่งทำแบคดรอปผ้า"
    }
  ]
}
```

**CSV (วางจาก Google Sheet):**
```json
{
  "csv": "1,/fabricbackdrop/,แบคดรอปผ้า,\"Backdrop ผ้า, แบคดรอปออกบูธ\"\n2,/table-cover/,ผ้าคลุมโต๊ะ,\"ผ้าปูโต๊ะ, ผ้าคลุมโต๊ะออกบูธ\""
}
```

### Status Response
```json
{
  "success": true,
  "data": {
    "total": 10,
    "completed": 3,
    "pending": 5,
    "failed": 1,
    "skipped": 1,
    "progress": "30%",
    "nextKeyword": {
      "priority": 4,
      "primaryKeyword": "กล่องไฟผ้า",
      "secondaryKeywords": "Fabric Lightbox, กล่องไฟออกบูธ"
    },
    "estimatedDaysLeft": 6,
    "lastGenerated": {
      "keyword": "อุปกรณ์ออกบูธ",
      "date": "2026-09-02",
      "articleTitle": "อุปกรณ์ออกบูธครบวงจร: คู่มือเลือกซื้อ...",
      "articleId": "uuid"
    }
  }
}
```

---

## Frontend — UI Components

### Focus Queue Card (หน้า Site Detail)

```
┌──────────────────────────────────────────────────────────┐
│ 🎯 คิวบทความ (Keyword Focus)                   + เพิ่ม  │
│ ระบบจะสร้างบทความตามลำดับ วันละ 1 keyword                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ สรุป: 3/10 เสร็จ | 1 ล้มเหลว | เหลือ 6 keyword | ~6 วัน │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ 30%                     │
│                                                          │
│ #1 ✅ แบคดรอปผ้า              สร้างแล้ว 2 ก.ย. 2026     │
│      ↳ Backdrop ผ้า, แบคดรอปออกบูธ, สั่งทำ...            │
│      ↳ /fabricbackdrop/                          [ดู] 🗑  │
│                                                          │
│ #2 ✅ ผ้าคลุมโต๊ะ             สร้างแล้ว 3 ก.ย. 2026     │
│      ↳ ผ้าปูโต๊ะ, ผ้าคลุมโต๊ะออกบูธ                     │
│                                                          │
│ #3 ✅ อุปกรณ์ออกบูธ           สร้างแล้ว 4 ก.ย. 2026     │
│                                                          │
│ #4 ❌ กล่องไฟผ้า              ล้มเหลว (retry 1/3)  [↻]  │
│      ↳ Error: LLM timeout                                │
│                                                          │
│ #5 ⏳ Roll Up                 รอสร้าง (ถัดไป)            │
│ #6 ⏳ เคาน์เตอร์ผ้า           รอสร้าง                    │
│ #7 ⏳ ชุดออกบูธ               รอสร้าง                    │
│ #8 ⏳ ออกแบบบูธ               รอสร้าง                    │
│ #9 ⏳ ธงปีกนก                 รอสร้าง                    │
│ #10 ⏳ รับพิมพ์ผ้าออกบูธ       รอสร้าง                   │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ วาง CSV จาก Google Sheet              [Import CSV]  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│                        [Reset Queue]  [ล้าง Queue ทั้งหมด]│
└──────────────────────────────────────────────────────────┘
```

### เพิ่ม Keyword Dialog

```
┌──────────────────────────────────────┐
│ เพิ่ม Keyword เข้าคิว                │
│                                      │
│ ลำดับ:        [1           ]         │
│ Keyword หลัก: [แบคดรอปผ้า  ]         │
│ Keywords รอง: [Backdrop ผ้า, ...]    │
│ URL หลัก:     [/fabricbackdrop/]     │
│                                      │
│              [ยกเลิก]  [เพิ่ม]       │
└──────────────────────────────────────┘
```

### Import CSV Dialog

```
┌────────────────────────────────────────────────┐
│ Import จาก Google Sheet                        │
│                                                │
│ วาง CSV ที่นี่ (คัดลอกจาก Google Sheet):        │
│ ┌────────────────────────────────────────────┐ │
│ │ 1  /fabricbackdrop/  แบคดรอปผ้า  Back...   │ │
│ │ 2  /table-cover/     ผ้าคลุมโต๊ะ  ผ้า...   │ │
│ │ 3  /                 อุปกรณ์ออกบูธ  บูธ... │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Format: ลำดับ [TAB] URL [TAB] Keyword [TAB] Secondary │
│ (คัดลอกจาก Sheet แล้ววางได้เลย)                │
│                                                │
│ Preview: 3 keywords พร้อม import               │
│                                                │
│                    [ยกเลิก]  [Import 3 keywords]│
└────────────────────────────────────────────────┘
```

---

## Error Handling & Retry

### สร้างบทความล้มเหลว
```
ครั้งที่ 1 fail → status='failed', retry_count=1
  ↓ วันถัดไป scheduler หยิบ failed item (retry_count < 3)
ครั้งที่ 2 fail → retry_count=2
  ↓ วันถัดไป
ครั้งที่ 3 fail → retry_count=3 → status='skipped' (ข้ามอัตโนมัติ)
  ↓
Scheduler หยิบ keyword ถัดไปที่เป็น pending
```

### เหตุผลที่อาจ fail
- LLM API timeout / rate limit
- SERP API error
- Network error ระหว่าง backend → AI Engine

### Retry ด้วยมือ
- กดปุ่ม [↻] ที่ failed item → reset status='pending', retry_count=0

---

## ป้องกันบทความซ้ำ

### เช็ค 3 ระดับก่อนสร้าง

1. **Queue status**: ถ้า status = 'completed' → ข้าม (มีบทความแล้ว)
2. **Articles table**: ถ้ามี article ที่ title หรือ keyword ตรงกัน → link article_id + mark completed
3. **Keywords table**: ถ้ามี keyword ใน keywords table + มี article_id → link + mark completed

### Reset รอบใหม่
เมื่อกด Reset:
- completed → pending (article_id ยังอยู่ เพื่อ reference)
- skipped → pending
- failed → pending, retry_count = 0
- **ไม่ลบบทความเดิม** — สร้างบทความใหม่เพิ่มเข้าไป (version ใหม่)

---

## ไฟล์ที่ต้องสร้าง/แก้ไข

### สร้างใหม่ (5 ไฟล์)
| ไฟล์ | หน้าที่ |
|------|--------|
| `backend/domain/models/keyword_focus_queue.go` | Model |
| `backend/domain/repositories/focus_queue_repository.go` | Interface |
| `backend/infrastructure/postgres/focus_queue_repo.go` | Implementation |
| `backend/interfaces/api/handlers/focus_queue_handler.go` | API Handler (CRUD + Import + Status) |
| `frontend/src/features/sites/components/focus-queue-card.tsx` | UI Component |

### แก้ไข (11 ไฟล์)
| ไฟล์ | แก้อะไร |
|------|--------|
| `backend/infrastructure/postgres/db.go` | AutoMigrate KeywordFocusQueue |
| `backend/pkg/di/container.go` | เพิ่ม FocusQueueRepo |
| `backend/interfaces/api/routes/routes.go` | เพิ่ม focus-queue routes (8 endpoints) |
| `backend/pkg/scheduler/scheduler.go` | แก้ ContentGen ให้เช็ค queue ก่อน + retry logic |
| `ai-engine/main.py` | เพิ่ม parameter secondary_keywords + pillar_url ใน /generate-article |
| `ai-engine/services/article_writer.py` | รับ + ใช้ secondary_keywords เป็น H2/H3 + pillar_url เป็น internal link |
| `frontend/src/features/sites/types.ts` | เพิ่ม FocusQueueItem type |
| `frontend/src/features/sites/service.ts` | เพิ่ม focus queue service (8 methods) |
| `frontend/src/features/sites/hooks.ts` | เพิ่ม focus queue hooks |
| `frontend/src/constants/api-routes.ts` | เพิ่ม FOCUS_QUEUE routes |
| `frontend/src/features/sites/index.ts` | export FocusQueueCard |
| `frontend/src/app/dashboard/sites/[id]/page.tsx` | เพิ่ม FocusQueueCard |

---

## สรุปวิธีใช้งาน

1. **ลูกค้าส่ง Keyword Map** (Google Sheet / Excel)
2. **Copy จาก Sheet → วางใน Import CSV** (ไม่ต้องแปลง format)
3. **ระบบทำงานอัตโนมัติ** — วันละ 1 keyword ตาม priority ไม่ซ้ำกัน
4. **เช็คสถานะ** ผ่าน UI ได้ว่าทำถึงไหน เหลืออีกกี่วัน
5. **ล้มเหลว** → auto retry 3 ครั้ง แล้ว skip ไป keyword ถัดไป
6. **ครบทุก keyword** → กด Reset เพื่อวนรอบใหม่ หรือเพิ่ม keyword ใหม่

### ข้อดี
- ไม่สร้างซ้ำ — เช็ค 3 ระดับ (queue + articles + keywords)
- ควบคุมได้ — เลือก keyword ตาม priority ของลูกค้า
- มี secondary keywords — บทความ focus ตรงจุด + internal linking ไป pillar page
- Error handling — auto retry 3 ครั้ง ไม่ค้างเมื่อ fail
- วัดผลได้ — progress bar, วันที่เหลือ, keyword ถัดไป
- Import ง่าย — copy จาก Google Sheet วางได้เลย
