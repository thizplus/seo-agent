# TODO - Next Session

## Image System Fixes (Priority)

### 1. Find Images: แยก Preview กับ Upload
**ปัญหา**: ตอนนี้กด Find แล้ว auto upload ทันที ไม่ให้เลือกก่อน
**แก้ไข**:
- Python: แยก endpoint `/search-images` (return URLs ไม่ upload) กับ `/upload-images` (upload เฉพาะที่เลือก)
- Frontend: กด Find → แสดง preview grid → user ติ๊กเลือก → เลือก featured/content → กด Upload
- Go: เพิ่ม endpoint ใหม่

### 2. รูปไม่ตรง keyword
**ปัญหา**: DuckDuckGo return รูปมั่ว (anime, ไม่เกี่ยว)
**แก้ไข**:
- ค้นหาหลาย query + ให้ user เลือกเอง (แก้ได้จาก fix ข้อ 1)
- แสดง source URL ให้ user เห็นว่ารูปมาจากไหน

### 3. รูปไม่ persist หลัง refresh
**ปัญหา**: รูปเก็บใน React state หายเมื่อ refresh
**แก้ไข**:
- Go: บันทึกลง `article_images` table หลัง upload
- Go: ดึง images มาด้วยตอน GET /articles/:id
- Frontend: แสดงจาก article data แทน state
- Frontend types: เพิ่ม `images` ใน Article type

### 4. Filename + Alt text ปรับปรุง
**ปัญหา**: บางครั้ง alt text ยังไม่ตรง keyword
**แก้ไข**:
- ให้ user แก้ alt text ได้ก่อน upload (editable field)

---

## Phase 2 ที่เหลือ

### Content Versioning UI
- [x] Backend API พร้อมแล้ว (GET /articles/:id/versions)
- [ ] Frontend: แสดง version history (ทำแล้วแต่ยังไม่มี data เพราะ articles สร้างก่อนมี versioning)
- [ ] Frontend: เปรียบเทียบ 2 versions (diff view)

### Metrics Dashboard
- [x] Backend API พร้อมแล้ว (GET /articles/:id/metrics, POST /articles/:id/optimize)
- [x] Frontend: Fetch Metrics + Optimize buttons (ทำแล้ว)
- [ ] Frontend: กราฟ performance (ถ้ามี data — ต้องรอ 2-3 วัน GSC จะมี data)

---

## สิ่งที่ทำเสร็จวันนี้

- Phase 0: MVP ครบ (Generate + Publish + GSC + Optimizer + Scheduler)
- Phase 0: Google OAuth login (redirect flow)
- Phase 0: GSC OAuth Connect per-site
- Phase 1: Site Analyzer + Keyword Discovery + Topic Clusters + Competitor (API)
- Refactor: Port/Adapter ทั้ง Python + Go
- Multi-LLM: 6 providers (Gemini, OpenAI, Claude, DeepSeek, Groq, Mistral)
- Phase 2: Image Generation (AI gen + Find from internet)
- Phase 2: Content Versioning (backend)
- Phase 2: Metrics Dashboard (backend + frontend)
- Image Find: DuckDuckGo search + WebP + upload WP + set featured + inject content
- Image Find: Alt text ภาษาไทย + EN filename (SEO friendly)
