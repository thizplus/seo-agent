# AI Search Visibility — Keyword ที่ AI แนะนำเว็บเรา

> สรุปสำหรับประชุม 26 ต.ค. 2026

---

## คำถาม

มี API หรือเครื่องมืออะไรบ้างที่บอกได้ว่า เมื่อผู้ใช้ค้นหาใน ChatGPT / Gemini / Bing Copilot แล้วเว็บเราถูกแสดงกี่ครั้ง มีคนคลิกเข้ามากี่ครั้ง และ keyword ไหนที่ AI แนะนำเราแล้ว

---

## คำตอบสั้น

**ยังไม่มี API ทางการที่ให้ข้อมูลครบ "แสดงผล + คลิก + keyword" จาก ChatGPT หรือ Gemini**
แต่มีข้อมูลบางส่วนจากหลายแหล่ง ดังนี้:

---

## ตารางเปรียบเทียบแหล่งข้อมูล

| แหล่ง | บอกอะไรได้ | จำนวนแสดงผล | จำนวนคลิก | Keyword/คำถาม | มี API | ค่าใช้จ่าย |
|--------|-----------|:-----------:|:---------:|:-------------:|:------:|:----------:|
| **Bing Webmaster Tools — AI Performance** | จำนวนครั้งที่หน้าเราถูก **อ้างอิง (citation)** ใน Copilot และ AI summary ของ Bing | มี (citations) | ไม่มี | มี (Grounding queries) | ไม่มี API, export CSV ได้ | ฟรี |
| **Google Search Console — Generative AI** (เปิดให้บางเว็บ มิ.ย. 2026) | Impressions จาก AI Overviews / AI Mode | มี | ไม่มี | ไม่มี | ยังไม่ยืนยันว่ามีใน API | ฟรี |
| **GSC Performance (ที่ระบบเราใช้อยู่)** | ยอดค้นหาปกติ **รวม** AI Overviews ไว้ด้วย แยกไม่ออก | รวม | รวม | รวม | มี (ใช้อยู่แล้ว) | ฟรี |
| **GA4 Referral Traffic** | จำนวนคนที่ **คลิกเข้ามาจริง** จาก chatgpt.com, gemini.google.com, copilot.microsoft.com, perplexity.ai | ไม่มี | มี | ไม่มี | มี (GA4 Data API) | ฟรี |
| **ChatGPT / Gemini App** | ไม่มี dashboard สำหรับเจ้าของเว็บ | ไม่มี | ไม่มี | ไม่มี | ไม่มี | — |
| **เครื่องมือ 3rd-party** (Ahrefs Brand Radar, Semrush AI Visibility, Otterly, Peec AI) | ยิงคำถามเข้า AI แล้วดูว่าแบรนด์ถูกพูดถึงไหม (สุ่มตัวอย่าง ไม่ใช่ยอดจริง) | ไม่ใช่ยอดจริง | ไม่มี | มี (ตามที่เราตั้ง) | บางเจ้ามี | เสียเงิน |

---

## สิ่งที่ทำได้ (เรียงจากคุ้มที่สุด)

### 1. สมัคร Bing Webmaster Tools (ทำได้เลย — ไม่ต้องเขียน code)

**ทำอะไร:** ยืนยันเว็บใน Bing Webmaster Tools → เปิดรายงาน AI Performance

**ได้อะไร:**
- **Grounding Queries** = คำถามที่ Copilot/Bing AI ใช้เว็บเราตอบ → นี่คือ "keyword ที่ AI แนะนำเรา" ที่ใกล้ที่สุดตอนนี้
- **Citation count** = จำนวนครั้งที่เว็บเราถูกอ้างอิง
- **Citation share** = สัดส่วนเทียบกับเว็บอื่นที่ถูกอ้างอิงในคำถามเดียวกัน
- Export เป็น CSV ได้

**วิธีสมัคร:**
1. ไปที่ https://www.bing.com/webmasters
2. Sign in ด้วย Microsoft account
3. เพิ่มเว็บ → ยืนยันด้วย DNS record หรือ meta tag
4. รอ 1-2 วัน → เปิดแท็บ AI Performance

**ข้อจำกัด:** ไม่มี API — ต้องเข้าดูหน้าเว็บหรือ export CSV เอง

---

### 2. เชื่อม GA4 Data API (เขียน code — ขนาดกลาง)

**ทำอะไร:** ดึง traffic จาก AI sources ผ่าน GA4 Data API

**ได้อะไร:**
- จำนวนคนที่คลิกเข้ามาจริงจาก:
  - `chatgpt.com` (ChatGPT)
  - `gemini.google.com` (Gemini)
  - `copilot.microsoft.com` (Bing Copilot)
  - `perplexity.ai` (Perplexity)
- แยกตามหน้า landing page
- ดู trend รายวัน/รายสัปดาห์

**สิ่งที่ต้องทำ:**
- เพิ่ม scope `analytics.readonly` ใน OAuth (ตอนเชื่อม GSC ใช้ Google OAuth อยู่แล้ว)
- เรียก GA4 Data API filter `sessionSource` = "chatgpt.com" / "gemini.google.com" / etc.
- สร้าง widget "Traffic จาก AI" ในหน้า Analytics

**ข้อจำกัด:** เห็นแค่คลิก ไม่เห็นจำนวนแสดงผล (ไม่รู้ว่า AI แสดงเราแต่คนไม่คลิกกี่ครั้ง)

**หมายเหตุ:** ระบบเรายังไม่ได้เชื่อม GA4 เลย (มีแค่ GSC) ต้องให้ลูกค้าเพิ่ม GA4 property และเชื่อม OAuth

---

### 3. Import CSV จาก Bing AI Performance (เขียน code — ขนาดกลาง)

**ทำอะไร:** ให้ user upload CSV จาก Bing → ระบบ parse แล้วแสดง dashboard

**ได้อะไร:**
- Grounding queries ของแต่ละ site
- เอา query มาเติมเป็น keyword ในคิวบทความ
- ใช้เป็น secondary keywords

**สิ่งที่ต้องทำ:**
- หน้า upload CSV ใน frontend
- Backend parse CSV → เก็บใน DB
- แสดง dashboard: query × URL × citation count
- ปุ่ม "เพิ่มเข้าคิว" ข้างแต่ละ query

---

### 4. AI Visibility Check แบบ DIY (ทางเลือก — มีค่า API)

**ทำอะไร:** ตั้งชุดคำถามต่อ site → ยิงผ่าน API ของ OpenAI/Gemini (เปิด web search) วันละครั้ง → เช็คว่าตอบชื่อแบรนด์/URL เราไหม

**ตัวอย่าง:**
```
คำถาม: "ร้านทำบูธจัดแสดงสินค้าในไทย แนะนำที่ไหนดี"
AI ตอบ: "...Adlite and Fabric เป็นหนึ่งในผู้ให้บริการ..."
→ บันทึก: ถูกพูดถึง ✓, URL ถูกอ้างอิง ✗
```

**ได้อะไร:**
- Trend ว่าแบรนด์ถูก AI พูดถึงบ่อยขึ้นหรือน้อยลง
- เปรียบเทียบกับคู่แข่ง (ยิงคำถามเดียวกัน ดูว่าใครถูกพูดถึง)

**ข้อจำกัด:**
- คำตอบ API ไม่เหมือนกับที่ user เห็นในแอป 100%
- คำตอบแต่ละครั้งไม่เหมือนกัน (ต้องยิงหลายรอบแล้วเฉลี่ย)
- มีค่า API: OpenAI web search ~$0.01-0.05/query, Gemini grounding ~$0.01/query

**ค่าใช้จ่ายประมาณ:**
- 4 sites × 10 คำถาม × 30 วัน = 1,200 queries/เดือน
- ประมาณ $12-60/เดือน (400-2,000 บาท)

---

## แนะนำสำหรับการประชุม

| ลำดับ | ทำอะไร | ระยะเวลา | ค่าใช้จ่าย |
|-------|--------|----------|-----------|
| **ทำเลย** | สมัคร Bing Webmaster Tools ทุก site | 30 นาที | ฟรี |
| **ระยะสั้น** | เชื่อม GA4 → ดู AI referral traffic | 2-3 วัน dev | ฟรี (ต้องมี GA4 property) |
| **ระยะกลาง** | Import Bing CSV + เติมคิว keyword | 1-2 วัน dev | ฟรี |
| **ระยะยาว** | AI Visibility Check แบบ DIY | 2-3 วัน dev | 400-2,000 บาท/เดือน |

---

## สิ่งที่ต้องเตรียมก่อน

1. **Bing Webmaster Tools** — ต้องมี Microsoft account + เข้าถึง DNS ของแต่ละ domain
2. **GA4** — ต้องมี GA4 property ของแต่ละ site + Measurement ID + ให้สิทธิ์ OAuth
3. **AI Visibility Check** — ต้องตัดสินใจงบ API + ตั้งชุดคำถามต่อ site

---

## Sources

- [Search Engine Journal — Google reports AI search impressions (มิ.ย. 2026)](https://searchenginejournal.com/google-reports-ai-search-impressions-how-to-read-them/582824)
- [Practical Ecommerce — Bing's improved AI Performance section](https://www.practicalecommerce.com/bings-improved-ai-performance-section)
- [Search Influence — Inside Bing's AI Performance Report](https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/)
- [GA4 Data API — Filter by session source](https://developers.google.com/analytics/devguides/reporting/data/v1)
