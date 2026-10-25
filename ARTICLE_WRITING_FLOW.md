# Flow การเขียนบทความในระบบ SEO Agents

> สรุปจาก code จริง ณ commit `55fbf32` (25 ต.ค. 2026)

---

## ภาพรวม

ระบบเขียนบทความได้ 2 ทาง:

| ทาง | Trigger | ข้อมูลที่ส่ง |
|-----|---------|-------------|
| **คิวบทความ (Focus Queue)** | Scheduler 06:00 หรือกดปุ่ม | keyword หลัก + keyword รอง + pillar URL + หัวข้อ + ขอบเขต + โทน |
| **Keyword ทั่วไป (Fallback)** | Scheduler 06:00 (ถ้าคิวว่าง) | keyword หลักอย่างเดียว |

---

## Flow ทีละขั้น

### ขั้นที่ 1: Scheduler Trigger (ทุกวัน 06:00)

**ไฟล์:** `backend/pkg/scheduler/scheduler.go`

```
06:00 → runContentGeneration()
  → วนทุก site ที่มี LLM API key + WordPress URL
    → เช็ค Focus Queue ก่อน (GetNextPending)
      → ถ้ามี → generateFromFocusQueue()
      → ถ้าไม่มี → generateFromKeywords() (fallback)
    → delay 120 วินาทีระหว่าง site
```

- จำกัด **1 บทความ / site / วัน**
- บทความที่สร้างเสร็จจะเป็น **draft** ทั้งหมด (ไม่มี auto publish)

---

### ขั้นที่ 2: เตรียมข้อมูลส่ง AI Engine

#### กรณี Focus Queue (มีข้อมูลครบ)

**ไฟล์:** `scheduler.go` → `generateFromFocusQueue()`

ข้อมูลที่ส่งไป `articleService.Generate()`:

| Field | มาจาก | ตัวอย่าง |
|-------|--------|---------|
| `keyword` | Focus Queue → `PrimaryKeyword` | "บูธจัดแสดงสินค้า" |
| `secondaryKeywords` | Focus Queue → `SecondaryKeywords` (comma-separated) | ["บูธนิทรรศการ", "ออกแบบบูธ"] |
| `pillarUrl` | Focus Queue → `PillarURL` | "https://example.com/services" |
| `customTitle` | Focus Queue → `CustomTitle` | "10 ไอเดียบูธจัดแสดงสินค้า" |
| `contentGuide` | Focus Queue → `OverrideGuide` หรือ Site → `ContentGuide` | "เน้นบูธผ้า ห้ามพูดถึงบูธเหล็ก" |
| `writingTone` | Focus Queue → `OverrideTone` หรือ Site → `WritingTone` | "professional" |
| `siteUrl`, `siteName`, `brandVoice`, `industry` | Site settings | — |
| `llmProvider`, `llmApiKey` | Site settings | "gemini" |

#### กรณี Fallback (ข้อมูลน้อย)

**ไฟล์:** `scheduler.go` → `generateFromKeywords()`

ส่งแค่ `siteId` + `keywordId` — **ไม่ส่ง** secondary keywords, pillar URL, content guide, writing tone

> หมายเหตุ: นี่คือบั๊กที่เจอ — fallback ควรส่ง `site.ContentGuide` และ `site.WritingTone` ด้วย

---

### ขั้นที่ 3: Go Backend → AI Engine

**ไฟล์:** `backend/application/serviceimpl/article_service_impl.go` → `Generate()`

1. สร้าง Article record ใน DB สถานะ `generating`
2. Build request map ส่งไป AI Engine (`POST /generate-article`)
3. รอ response กลับมา (ใช้เวลา 1-3 นาที)
4. Parse response → บันทึกลง DB สถานะ `completed`
5. บันทึก version "initial"
6. **Background:** เรียก `AnalyzeSERP` อีกครั้ง เพื่อเก็บข้อมูล SERP ลง keyword (ค้นซ้ำ 2 ครั้ง)

---

### ขั้นที่ 4: AI Engine — วิเคราะห์คู่แข่ง (SERP Analysis)

**ไฟล์:** `ai-engine/services/serp_analyzer.py` หรือ `ai-engine/infrastructure/adapters/serper_adapter.py`

#### ถ้ามี SERPER_API_KEY (ใช้ Serper.dev — Google SERP จริง):
```
1. ค้น keyword ใน Google (ภาษาไทย, ประเทศไทย)
2. ได้ผลลัพธ์ top 10 (title + URL + snippet)
3. Crawl top 5 → นับจำนวนคำ (ใช้ len(text.split()))
4. คำนวณ avg_word_count, min, max
5. Detect search intent (transactional / commercial / informational)
```

#### ถ้าไม่มี key (Fallback — DuckDuckGo):
```
ใช้ DuckDuckGo search แทน (region=th-th)
flow เดียวกัน แต่ผลลัพธ์อาจต่างจาก Google
```

#### ข้อมูลที่ได้จาก SERP:

| Field | ค่าตัวอย่าง | ใช้ใน prompt |
|-------|------------|-------------|
| `avg_word_count` | 1,850 | คำนวณ target = avg + 500 (ขั้นต่ำ 2,000) |
| `intent` | "informational" | บอก AI ว่า intent แบบไหน |
| `common_headings` | (ส่ง N/A ทุกครั้ง) | **ไม่มี code ดึงมา — เป็น N/A เสมอ** |
| `results[0..4].title` | "10 ไอเดียบูธ..." (ตัด 30 ตัวอักษร) | แสดงให้ AI เห็นชื่อบทความคู่แข่ง 5 อันดับ |

#### สิ่งที่ระบบ **ไม่ได้ทำ**:
- ไม่ได้อ่านเนื้อหาบทความคู่แข่ง (อ่านแค่ title)
- ไม่ได้ดึง headings (H2/H3) จากบทความคู่แข่ง
- ไม่ได้วิเคราะห์โครงสร้างเนื้อหาคู่แข่ง
- การนับคำใช้ `text.split()` ซึ่งนับภาษาไทยผิด (ไทยไม่เว้นวรรคระหว่างคำ)

---

### ขั้นที่ 5: AI Engine — เขียนบทความ (Article Writer)

**ไฟล์:** `ai-engine/services/article_writer.py`

#### 5.1 System Prompt

```
คุณคือ SEO Content Expert ระดับมืออาชีพ เชี่ยวชาญด้าน EEAT
เขียนเป็นภาษาไทย ใช้ข้อมูลจริง อ้างอิงแหล่งที่มา

## Brand Voice
{brand_voice ของ site — ถ้ามี}
```

#### 5.2 Article Prompt (ส่งไป LLM)

Prompt ประกอบด้วย sections เหล่านี้ตามลำดับ:

```
เขียนบทความ SEO สำหรับ keyword: "{keyword}"

## ข้อมูลเว็บไซต์
- เว็บ: {site_name} ({site_url})
- อุตสาหกรรม: {industry}

## ข้อมูลคู่แข่ง (SERP Top 10)
- จำนวนคำเฉลี่ย: {avg_word_count} คำ
- Search Intent: {intent}
- Headings ที่พบบ่อย: N/A (ไม่มี code ดึง)
- คู่แข่ง Top 5: {title 5 อันดับแรก ตัดเหลือ 30 ตัวอักษร}

## Keywords รอง (ถ้ามี — จาก Focus Queue)
{keyword รอง}
- ใช้เป็น H2/H3 อย่างน้อย 1 ครั้งต่อ keyword
- กระจายในเนื้อหาอย่างเป็นธรรมชาติ

## Internal Linking (ถ้ามี pillar URL)
- ใส่ internal link กลับไปยัง: {pillar_url}
- ใช้ anchor text ที่เกี่ยวข้องกับ keyword หลัก
- ใส่ลิงก์อย่างน้อย 1-2 จุดในเนื้อหา

## หัวข้อบทความที่กำหนด (ถ้ามี custom title)
{custom_title} — ใช้เป็น H1

## แนวทางเนื้อหา (ถ้ามี content guide)
{content_guide}

## อารมณ์/โทนการเขียน (ถ้ามี writing tone)
เขียนด้วยโทน: {writing_tone}

## ชื่อแบรนด์ (สำคัญมาก!)
- ใช้ "{site_name}" ตามที่ระบุเท่านั้น ห้ามเปลี่ยนแปลง
- ห้ามเพิ่ม "TH", "Thailand" หรือแยกคำ

## สไตล์การเขียน (สำคัญมาก!)
- ภาษาไทยธรรมชาติ อ่านง่าย
- ห้ามใช้ภาษาราชการ/คำหรูหรา
- ทุกประโยคจบสมบูรณ์ ไม่ตัดกลาง
- แต่ละย่อหน้ามีเนื้อหาเพียงพอ

## ข้อห้ามเรื่องการอ้างอิง (สำคัญมาก!)
- ห้ามอ้างอิง ISO, มาตรฐานวัสดุ, หน่วยงานที่ไม่ได้ระบุ
- ห้ามสร้างสถิติ/ตัวเลข/แหล่งอ้างอิงปลอม
- ถ้าไม่แน่ใจ ให้เขียนเป็นคำแนะนำทั่วไป

## Requirements
1. เขียน {target_words}+ คำ (avg คู่แข่ง + 500, ขั้นต่ำ 2,000)
2. โครงสร้าง heading ชัดเจน (# H1, ## H2, ### H3)
3. ห้ามเขียน "H2:" หรือ "H3:" เป็น text
4. เน้น EEAT: Experience, Expertise, Authority, Trust
5. มี FAQ section (3-5 คำถาม)
6. มี meta description (150-160 ตัวอักษร)
7. keyword หลักอยู่ใน H1, H2 แรก, ย่อหน้าแรก
8. เขียนเป็น Markdown format
```

#### 5.3 Output Format

AI ตอบกลับเป็น JSON:

```json
{
  "title": "หัวข้อบทความ (มี keyword)",
  "slug": "slug-ภาษาอังกฤษ",
  "content": "เนื้อหาบทความใน Markdown",
  "metaDescription": "meta description 150-160 ตัวอักษร",
  "wordCount": 2500,
  "eeatScore": {
    "experience": 8,
    "expertise": 8,
    "authority": 7,
    "trust": 8
  },
  "schemaMarkup": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "...",
    "description": "..."
  }
}
```

#### 5.4 Post-processing

1. **FAQ Validation** — ถ้าไม่มี section FAQ ใน content → retry อีก 1 ครั้ง
2. **JSON Parsing** — มี fallback 5 ขั้น:
   - ลอง parse JSON ตรงๆ
   - ตัด ```json wrapper ออก
   - หา JSON object ใน text
   - ใช้ regex ดึงแต่ละ field
   - ใช้ raw response เป็น content

---

### ขั้นที่ 6: บันทึกผลลัพธ์

1. อัปเดต Article ใน DB:
   - `Title`, `Slug`, `Content` (Markdown)
   - `MetaDescription`, `WordCount`
   - `SchemaMarkup`, `EEATScore` (JSON)
   - `Status` = "completed", `PublishStatus` = "draft"
2. บันทึก Version "initial" (เก็บ content เดิมไว้)
3. อัปเดต Focus Queue: `status` = "completed", `article_id` = ID ของบทความ

---

## Diagram: Flow รวม

```
[Focus Queue]                    [Keywords Table]
     |                                |
     v                                v
generateFromFocusQueue()     generateFromKeywords()
  (keyword + secondary +        (keyword อย่างเดียว)
   pillar + title +
   guide + tone)
     |                                |
     +----------+---------------------+
                |
                v
    articleService.Generate()
                |
                v
    POST /generate-article → AI Engine
                |
        +-------+--------+
        |                 |
        v                 v
  SERP Analysis      Article Writer
  (Serper/DDG)        (Gemini LLM)
  - top 10 title      - system prompt
  - avg word count     - article prompt
  - search intent      - FAQ validation
        |                 |
        +-------+---------+
                |
                v
         JSON Response
    (title, slug, content,
     meta, EEAT score,
     schema markup)
                |
                v
      Save to DB (draft)
      Save version "initial"
      Update Focus Queue
```

---

## LLM Provider

| Provider | ตั้งค่าที่ | หมายเหตุ |
|----------|-----------|---------|
| Gemini (default) | Site settings → `llm_provider` | ใช้ Gemini API |
| OpenAI | Site settings | รองรับแต่ต้องตั้ง key |

---

## ข้อจำกัดที่พบ

| ข้อ | รายละเอียด |
|-----|-----------|
| ไม่อ่านเนื้อหาคู่แข่ง | ใช้แค่ title 5 อันดับ (ตัด 30 ตัวอักษร) + avg word count |
| Headings เป็น N/A | ไม่มี code ดึง H2/H3 จากคู่แข่ง |
| นับคำไทยผิด | ใช้ `text.split()` (นับจากช่องว่าง) แต่ภาษาไทยไม่เว้นวรรค |
| SERP ค้นซ้ำ 2 ครั้ง | AI Engine ค้นตอนเขียน + Go backend ค้นอีกรอบหลังเขียนเสร็จ |
| Fallback ไม่ส่ง guide/tone | `generateFromKeywords()` ส่งแค่ keyword ไม่ส่ง content guide |
| ไม่มี auto publish | บทความเป็น draft ทั้งหมด ต้อง publish เอง |
