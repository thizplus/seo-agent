# Keyword Discovery Flow — Auto Seed from Site Analysis

## ปัญหาเดิม

```
Analyze Site → ได้ข้อมูลเว็บ แต่ไม่ส่งต่อ
Discover Keywords → ต้องใส่ seed เอง → ถ้าไม่มี seed = 0 results
```

User ต้อง "รู้อยู่แล้ว" ว่าเว็บขายอะไร แล้วพิมพ์ seed เอง → ไม่ autonomous

## Flow ใหม่

```
Analyze Site
    ↓ crawl 28-50 pages
    ↓ ดึง title, H1, H2s, meta_description จากทุกหน้า
    ↓
Extract Seeds (ใหม่)
    ↓ กรองเอาเฉพาะ product/service pages
    ↓ ดึงคำสำคัญจาก H1 + title
    ↓ ได้ seed keywords 5-15 คำ
    ↓
Discover Keywords
    ↓ ใช้ seeds อัตโนมัติ (ไม่ต้องพิมพ์เอง)
    ↓ Google Suggest × seed แต่ละตัว
    ↓ GSC keywords (ถ้ามี)
    ↓ SERP related searches
    ↓
Score + Sort
    ↓ intent detection + money keyword boost
    ↓
Return keyword opportunities
```

## แหล่งที่ดึง Seed Keywords

### จาก Crawl Data (ทุก page ที่ crawl ได้)

| แหล่ง | ลำดับความสำคัญ | ตัวอย่าง |
|--------|---------------|---------|
| **H1 ของ product/service pages** | สูงสุด | "ผ้าใบกันสาด", "โครงเหล็กพับได้" |
| **Title ของ product/service pages** | สูง | "ผ้าใบกันสาด ราคาโรงงาน - Adlite" |
| **H2s ของ product/service pages** | ปานกลาง | "ผ้าใบ PVC", "ผ้าใบ HDPE" |
| **H1 ของ home page** | ปานกลาง | "รับทำผ้าใบกันแดด ครบวงจร" |
| **Industry + Business Type จาก AI analysis** | ต่ำ (fallback) | "ผ้าใบ", "กันแดด" |

### กฎการกรอง

```
1. เอาเฉพาะ page_type = product | service | home (ไม่เอา contact, about, blog)
2. ดึง H1 → ตัดคำที่ไม่มีความหมาย (หน้าแรก, welcome, home)
3. ดึง Title → ตัดชื่อเว็บออก (เช่น " - Adlite and Fabric")
4. Deduplicate
5. จำกัด 15 seeds (เรียงตาม priority: H1 product > H1 service > Title > H2s)
```

### ตัวอย่างจริง (สมมติ crawl adliteandfavbric.com)

```
Crawl ได้ 28 pages:
├── home: H1="รับทำผ้าใบ กันสาด ครบวงจร"
├── product: H1="ผ้าใบกันสาด", H2s=["ผ้าใบ PVC", "ผ้าใบ HDPE"]
├── product: H1="โครงเหล็กพับได้"
├── service: H1="รับติดตั้งผ้าใบ"
├── service: H1="ออกแบบร้านค้า"
├── contact: H1="ติดต่อเรา"      ← ข้าม
├── about: H1="เกี่ยวกับเรา"     ← ข้าม
└── blog: H1="บทความ"            ← ข้าม

Auto Seeds ที่ได้:
1. ผ้าใบกันสาด         (H1 product - สูงสุด)
2. โครงเหล็กพับได้      (H1 product)
3. รับติดตั้งผ้าใบ       (H1 service)
4. ออกแบบร้านค้า        (H1 service)
5. รับทำผ้าใบ          (H1 home - ตัด "ครบวงจร")
6. ผ้าใบ PVC           (H2 product)
7. ผ้าใบ HDPE          (H2 product)
```

## สิ่งที่ต้องแก้ไข

### 1. Python: `site_analyzer.py` — เพิ่ม `extract_seeds()`

```python
def extract_seeds(self, crawl_data: dict) -> list[str]:
    """ดึง seed keywords จาก crawl data อัตโนมัติ"""
    seeds = []

    for page in crawl_data["pages"]:
        if page["page_type"] not in ("product", "service", "home"):
            continue

        # H1 (priority สูงสุด)
        if page["h1"]:
            cleaned = self._clean_seed(page["h1"])
            if cleaned:
                seeds.append(cleaned)

        # H2s (priority ต่ำกว่า)
        for h2 in page.get("h2s", [])[:3]:
            cleaned = self._clean_seed(h2)
            if cleaned:
                seeds.append(cleaned)

    # Deduplicate + limit 15
    seen = set()
    unique = []
    for s in seeds:
        if s.lower() not in seen:
            seen.add(s.lower())
            unique.append(s)

    return unique[:15]
```

### 2. Python: `main.py` — analyze-site endpoint คืน seeds ด้วย

Response เดิม:
```json
{ "businessType": "...", "brandVoice": "...", "seoScore": {...} }
```

Response ใหม่:
```json
{ "businessType": "...", "brandVoice": "...", "seoScore": {...}, "suggestedSeeds": ["ผ้าใบกันสาด", "โครงเหล็กพับได้", ...] }
```

### 3. Go: `site_service_impl.go` — AnalyzeSite เก็บ seeds ลง site

```go
// หลัง analyze เสร็จ → เก็บ seeds ไว้ใน site record
if seeds, ok := data["suggestedSeeds"].([]any); ok {
    site.SuggestedSeeds = seeds  // JSONB field ใหม่
}
```

### 4. Go: `site_service_impl.go` — DiscoverKeywords ใช้ seeds อัตโนมัติ

```go
// ถ้า user ไม่ส่ง seedKeywords → ใช้จาก site.SuggestedSeeds
if len(seedKeywords) == 0 && site.SuggestedSeeds != nil {
    seedKeywords = site.SuggestedSeeds
}
```

### 5. Frontend: ปุ่ม "Discover Keywords" ไม่ต้องเปลี่ยน

เพราะ backend จะ fallback ใช้ seeds จาก analysis อัตโนมัติ

## Flow สุดท้าย (User Experience)

```
User: กด "Add Site" → ใส่ URL + API Key
User: กด "Analyze" → รอ 10-30 วิ
System: crawl 28 pages → AI วิเคราะห์ → เก็บ seeds อัตโนมัติ
User: กด "Discover Keywords" (ไม่ต้องพิมพ์อะไร)
System: ใช้ seeds จาก analysis → Google Suggest → GSC → SERP
System: คืน 50-100 keywords พร้อม score
User: เลือก keyword → กด Generate → ได้บทความ EEAT
```
