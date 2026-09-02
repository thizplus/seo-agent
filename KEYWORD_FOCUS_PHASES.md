# Keyword Focus Queue — แผนแยก Phase

อ้างอิงจาก code จริงในระบบ

---

## Phase 1: Database + Backend API (CRUD)

**เป้าหมาย**: สร้าง/ดู/แก้/ลบ Focus Queue ผ่าน API ได้

### สร้างใหม่ (4 ไฟล์)

**1. `backend/domain/models/keyword_focus_queue.go`**
```go
type KeywordFocusQueue struct {
    ID                uuid.UUID  // PK
    SiteID            uuid.UUID  // FK sites
    Priority          int
    PillarURL         string
    PrimaryKeyword    string
    SecondaryKeywords string     // comma separated
    Status            string     // pending | completed | failed | skipped
    ArticleID         *uuid.UUID // FK articles (nullable)
    ErrorMessage      string
    RetryCount        int
    CompletedAt       *time.Time
    CreatedAt         time.Time
}
```

**2. `backend/domain/repositories/focus_queue_repository.go`**
```go
type FocusQueueRepository interface {
    GetBySiteID(ctx, siteID) ([]KeywordFocusQueue, error)
    GetNextPending(ctx, siteID) (*KeywordFocusQueue, error)  // ORDER BY priority ASC, status IN ('pending','failed' WHERE retry<3)
    Create(ctx, item) error
    CreateBatch(ctx, items []KeywordFocusQueue) error         // import หลายตัว
    Update(ctx, item) error
    Delete(ctx, id) error
    ResetAll(ctx, siteID) error                               // completed/skipped/failed → pending
    GetStatus(ctx, siteID) (total, completed, pending, failed, skipped int, error)
}
```

**3. `backend/infrastructure/postgres/focus_queue_repo.go`**
- Implement ทุก method ข้างบน
- `GetNextPending`: `WHERE site_id=? AND (status='pending' OR (status='failed' AND retry_count<3)) ORDER BY priority ASC LIMIT 1`

**4. `backend/interfaces/api/handlers/focus_queue_handler.go`**
- `GetQueue` — GET `/sites/:id/focus-queue`
- `AddItem` — POST `/sites/:id/focus-queue`
- `ImportItems` — POST `/sites/:id/focus-queue/import` (รับ JSON array + CSV)
- `UpdateItem` — PUT `/sites/:id/focus-queue/:queueId`
- `DeleteItem` — DELETE `/sites/:id/focus-queue/:queueId`
- `SkipItem` — POST `/sites/:id/focus-queue/:queueId/skip`
- `RetryItem` — POST `/sites/:id/focus-queue/:queueId/retry`
- `ResetQueue` — POST `/sites/:id/focus-queue/reset`
- `GetStatus` — GET `/sites/:id/focus-queue/status`

### แก้ไข (3 ไฟล์)

**5. `backend/infrastructure/postgres/db.go`**
- เพิ่ม `&models.KeywordFocusQueue{}` ใน AutoMigrate (บรรทัด 24-39)

**6. `backend/pkg/di/container.go`**
- เพิ่ม `FocusQueueRepo repositories.FocusQueueRepository` ใน Container struct (บรรทัด 16-30)
- เพิ่ม `focusQueueRepo := postgres.NewFocusQueueRepository(db)` (บรรทัด 38-44)
- เพิ่ม `FocusQueueRepo: focusQueueRepo` ใน return (บรรทัด 52-67)

**7. `backend/interfaces/api/routes/routes.go`**
- เพิ่ม `focusQueueHandler := handlers.NewFocusQueueHandler(c.FocusQueueRepo, c.SiteRepo)` (บรรทัด 21)
- เพิ่ม routes 9 endpoints ใน sites group (บรรทัด 62+)

### ทดสอบ
- [ ] POST import 10 keywords → ได้ 10 records
- [ ] GET queue → เห็น 10 records เรียง priority
- [ ] GET status → total=10, pending=10
- [ ] PUT แก้ priority → ลำดับเปลี่ยน
- [ ] DELETE ลบ 1 → เหลือ 9
- [ ] POST skip → status เปลี่ยนเป็น skipped
- [ ] POST reset → ทั้งหมดกลับเป็น pending

---

## Phase 2: AI Engine รับ Secondary Keywords + Pillar URL

**เป้าหมาย**: AI Engine สร้างบทความที่ใช้ secondary keywords เป็น H2/H3 + internal link ไป pillar URL

### แก้ไข (3 ไฟล์)

**1. `ai-engine/models/schemas.py`**

ปัจจุบัน (บรรทัด 5-12):
```python
class GenerateArticleRequest(BaseModel):
    keyword: str
    site_url: str = ""
    site_name: str = ""
    brand_voice: str = ""
    industry: str = ""
    llm_provider: str = "gemini"
    llm_api_key: str = ""
```

เพิ่ม:
```python
    secondary_keywords: list[str] = []    # NEW
    pillar_url: str = ""                  # NEW
```

**2. `ai-engine/services/article_writer.py`**

ปัจจุบัน generate() signature (บรรทัด 17-24):
```python
async def generate(self, keyword, site_url="", site_name="", brand_voice="", industry=""):
```

เปลี่ยนเป็น:
```python
async def generate(self, keyword, site_url="", site_name="", brand_voice="", industry="",
                   secondary_keywords=None, pillar_url=""):
```

แก้ prompt (บรรทัด 36-67):
- เพิ่ม section ใน prompt: "ใช้ keyword รองเหล่านี้เป็น H2/H3: {secondary_keywords}"
- เพิ่ม instruction: "ใส่ internal link ไปยัง {pillar_url} ด้วย anchor text ที่เกี่ยวข้อง"
- target word count เพิ่มเป็น avg+500 เหมือนเดิม

**3. `ai-engine/main.py`**

ปัจจุบัน /generate-article endpoint (บรรทัด 54-65):
```python
result = await writer.generate(
    keyword=req.keyword, site_url=req.site_url, site_name=req.site_name,
    brand_voice=req.brand_voice, industry=req.industry,
)
```

เปลี่ยนเป็น:
```python
result = await writer.generate(
    keyword=req.keyword, site_url=req.site_url, site_name=req.site_name,
    brand_voice=req.brand_voice, industry=req.industry,
    secondary_keywords=req.secondary_keywords or None,
    pillar_url=req.pillar_url,
)
```

### ทดสอบ
- [ ] POST /generate-article ด้วย keyword เดียว (เดิม) → ยังทำงานปกติ
- [ ] POST /generate-article + secondary_keywords → บทความมี H2/H3 ตาม secondary
- [ ] POST /generate-article + pillar_url → บทความมี internal link ไป pillar

---

## Phase 3: Scheduler ใช้ Focus Queue

**เป้าหมาย**: Scheduler ตี 6 เช็ค Focus Queue ก่อน → สร้างตาม priority → ไม่ซ้ำ → retry ถ้า fail

### แก้ไข (2 ไฟล์)

**1. `backend/pkg/scheduler/scheduler.go`**

ปัจจุบัน runContentGeneration() (บรรทัด 192-253):
```go
// วน keyword ทั่วไป
for _, kw := range allKWs {
    if generated >= 1 { break }
    if usedKWIDs[kw.ID.String()] { continue }
    // generate...
}
```

เปลี่ยนเป็น:
```go
// 1. เช็ค Focus Queue ก่อน
focusItem, _ := s.focusQueueRepo.GetNextPending(ctx, site.ID)
if focusItem != nil {
    // เช็คว่ามีบทความอยู่แล้วไหม
    existingArticles, _ := s.articleRepo.GetBySiteID(ctx, site.ID)
    alreadyExists := false
    for _, a := range existingArticles {
        if a.Title contains focusItem.PrimaryKeyword... {
            // link article + mark completed
            alreadyExists = true
            break
        }
    }

    if !alreadyExists {
        // สร้างบทความจาก focus queue
        secondaryKWs := strings.Split(focusItem.SecondaryKeywords, ",")
        aiResp, err := s.aiEngine.GenerateArticle(ctx, map[string]any{
            "keyword":            focusItem.PrimaryKeyword,
            "secondary_keywords": secondaryKWs,
            "pillar_url":         focusItem.PillarURL,
            "site_url":           site.URL,
            // ... other fields
        })

        if err != nil {
            // mark failed + increment retry
            focusItem.Status = "failed"
            focusItem.ErrorMessage = err.Error()
            focusItem.RetryCount++
            if focusItem.RetryCount >= 3 {
                focusItem.Status = "skipped"
            }
            s.focusQueueRepo.Update(ctx, focusItem)
        } else {
            // save article + mark completed
            // ... save article to DB
            focusItem.Status = "completed"
            focusItem.ArticleID = &article.ID
            focusItem.CompletedAt = &now
            s.focusQueueRepo.Update(ctx, focusItem)
        }
    }
    generated++
} else {
    // 2. Fallback: ระบบเดิม
    for _, kw := range allKWs { ... }
}
```

- เพิ่ม `focusQueueRepo` ใน Scheduler struct (บรรทัด 18-30)
- เพิ่ม parameter ใน New() function (บรรทัด 32-57)

**2. `backend/cmd/api/main.go`** (หรือที่สร้าง scheduler)
- ส่ง `focusQueueRepo` ให้ scheduler.New()

**3. `backend/application/serviceimpl/article_service_impl.go`**

ปัจจุบัน Generate() เรียก AI Engine (บรรทัด 67-70):
```go
aiResp, err := s.aiEngine.GenerateArticle(ctx, map[string]any{
    "keyword": keyword.Keyword, "site_url": site.URL, "site_name": site.Name,
    "brand_voice": site.BrandVoice, "industry": site.Industry,
    "llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
})
```

เพิ่ม optional fields (backward compatible):
```go
reqMap := map[string]any{
    "keyword": keyword.Keyword, "site_url": site.URL, "site_name": site.Name,
    "brand_voice": site.BrandVoice, "industry": site.Industry,
    "llm_provider": site.LLMProvider, "llm_api_key": site.LLMApiKey,
}
if len(req.SecondaryKeywords) > 0 {
    reqMap["secondary_keywords"] = req.SecondaryKeywords
}
if req.PillarURL != "" {
    reqMap["pillar_url"] = req.PillarURL
}
aiResp, err := s.aiEngine.GenerateArticle(ctx, reqMap)
```

**4. `backend/domain/dto/article_dto.go`**

ปัจจุบัน (บรรทัด 11-14):
```go
type GenerateArticleRequest struct {
    SiteID    string `json:"siteId" validate:"required,uuid"`
    KeywordID string `json:"keywordId" validate:"required,uuid"`
}
```

เพิ่ม:
```go
type GenerateArticleRequest struct {
    SiteID            string   `json:"siteId" validate:"required,uuid"`
    KeywordID         string   `json:"keywordId" validate:"required,uuid"`
    SecondaryKeywords []string `json:"secondaryKeywords,omitempty"`
    PillarURL         string   `json:"pillarUrl,omitempty"`
}
```

### ทดสอบ
- [ ] เพิ่ม 3 keywords ใน Focus Queue ของ site
- [ ] รัน scheduler manually หรือรอตี 6
- [ ] เช็คว่าสร้างบทความจาก priority 1
- [ ] วันถัดไปสร้าง priority 2
- [ ] Simulate fail → retry_count เพิ่ม
- [ ] retry ครบ 3 → status เป็น skipped → หยิบ keyword ถัดไป
- [ ] ไม่มี queue → fallback ระบบเดิม (keyword table)

---

## Phase 4: Frontend UI

**เป้าหมาย**: Card แสดง queue + เพิ่ม/ลบ/import + progress bar + status

### สร้างใหม่ (1 ไฟล์)

**1. `frontend/src/features/sites/components/focus-queue-card.tsx`**
- แสดง queue เรียงตาม priority
- สถานะ: ✅ completed, ⏳ pending, ❌ failed, ⏭ skipped
- ปุ่ม: เพิ่ม, Import CSV, Skip, Retry, Reset, ลบ
- Progress bar: X/Y เสร็จ, เหลือ Z วัน
- Import Dialog: วาง TSV จาก Google Sheet → parse → preview → import

### แก้ไข (6 ไฟล์)

**2. `frontend/src/features/sites/types.ts`**
```typescript
export interface FocusQueueItem {
  id: string
  siteId: string
  priority: number
  pillarUrl: string
  primaryKeyword: string
  secondaryKeywords: string
  status: "pending" | "completed" | "failed" | "skipped"
  articleId?: string
  errorMessage?: string
  retryCount: number
  completedAt?: string
  createdAt: string
}

export interface FocusQueueStatus {
  total: number
  completed: number
  pending: number
  failed: number
  skipped: number
  progress: string
  nextKeyword?: { priority: number; primaryKeyword: string; secondaryKeywords: string }
  estimatedDaysLeft: number
  lastGenerated?: { keyword: string; date: string; articleTitle: string; articleId: string }
}
```

**3. `frontend/src/constants/api-routes.ts`**
```typescript
FOCUS_QUEUE: (id: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue`,
FOCUS_QUEUE_IMPORT: (id: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue/import`,
FOCUS_QUEUE_ITEM: (id: string, queueId: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue/${queueId}`,
FOCUS_QUEUE_SKIP: (id: string, queueId: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue/${queueId}/skip`,
FOCUS_QUEUE_RETRY: (id: string, queueId: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue/${queueId}/retry`,
FOCUS_QUEUE_RESET: (id: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue/reset`,
FOCUS_QUEUE_STATUS: (id: string) => `${API_BASE}/api/v1/sites/${id}/focus-queue/status`,
```

**4. `frontend/src/features/sites/service.ts`**
```typescript
// 8 methods:
getFocusQueue(siteId)
getFocusQueueStatus(siteId)
addFocusQueueItem(siteId, data)
importFocusQueue(siteId, keywords[])
updateFocusQueueItem(siteId, queueId, data)
deleteFocusQueueItem(siteId, queueId)
skipFocusQueueItem(siteId, queueId)
retryFocusQueueItem(siteId, queueId)
resetFocusQueue(siteId)
```

**5. `frontend/src/features/sites/hooks.ts`**
```typescript
focusQueueKeys = { all, list(siteId), status(siteId) }
useFocusQueue(siteId)
useFocusQueueStatus(siteId)
useAddFocusQueueItem(siteId)
useImportFocusQueue(siteId)
useDeleteFocusQueueItem(siteId)
useSkipFocusQueueItem(siteId)
useRetryFocusQueueItem(siteId)
useResetFocusQueue(siteId)
```

**6. `frontend/src/features/sites/index.ts`**
- เพิ่ม `export { FocusQueueCard } from "./components/focus-queue-card"`

**7. `frontend/src/app/dashboard/sites/[id]/page.tsx`**
- เพิ่ม `FocusQueueCard` (ไว้หลัง PipelineCard ก่อน PagesCard)
- import จาก `@/features/sites`

### CSV Import Logic (ใน frontend)
```typescript
// ลูกค้า copy จาก Google Sheet → paste ในช่อง → parse TSV
function parseTSV(text: string): FocusQueueItem[] {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const [priority, url, keyword, secondary] = line.split('\t')
    return {
      priority: parseInt(priority) || i + 1,
      pillarUrl: url?.trim() || '',
      primaryKeyword: keyword?.trim() || '',
      secondaryKeywords: secondary?.trim() || '',
    }
  })
}
```

### ทดสอบ
- [ ] เปิดหน้า site detail → เห็น Focus Queue Card
- [ ] กดเพิ่ม keyword → dialog → บันทึก → เห็นใน list
- [ ] Copy จาก Google Sheet → วาง → preview → import → เห็นทั้งหมด
- [ ] Progress bar แสดงถูกต้อง
- [ ] กด Skip → status เปลี่ยน
- [ ] กด Retry → status กลับ pending
- [ ] กด Reset → ทั้งหมดกลับ pending
- [ ] กดลบ → หายจาก list
- [ ] เมื่อ scheduler สร้างบทความ → status เปลี่ยนเป็น completed + link บทความ
- [ ] `npx next build` สำเร็จ

---

## สรุปทุก Phase

| Phase | ทำอะไร | ไฟล์ใหม่ | ไฟล์แก้ |
|-------|--------|---------|--------|
| **1. Backend CRUD** | DB + API สร้าง/ดู/แก้/ลบ queue | 4 | 3 |
| **2. AI Engine** | รับ secondary_keywords + pillar_url | 0 | 3 |
| **3. Scheduler** | เช็ค queue ก่อน + retry logic | 0 | 4 |
| **4. Frontend** | UI Card + Import + Status | 1 | 6 |
| **รวม** | | **5 ไฟล์** | **16 ไฟล์** |

### ลำดับที่ควรทำ
```
Phase 1 (Backend CRUD) → ทดสอบ API
  ↓
Phase 2 (AI Engine) → ทดสอบสร้างบทความด้วย secondary keywords
  ↓
Phase 3 (Scheduler) → ทดสอบ auto generate ตาม queue
  ↓
Phase 4 (Frontend) → ทดสอบ UI + build → deploy
```

แต่ละ phase ทำ + ทดสอบ + deploy แยกกันได้ ไม่ต้องรอทำทีเดียว
