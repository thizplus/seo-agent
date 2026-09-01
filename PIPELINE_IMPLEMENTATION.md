# Pipeline Refactor — Implementation Plan

> สรุปจากการ audit code ทั้งหมด: Backend (Go), AI Engine (Python), Frontend (Next.js)
> แบ่งเป็น 4 Phases ตามลำดับ dependency

---

## สิ่งที่มีอยู่แล้ว (ใช้ต่อได้)

- Site CRUD + Auth (Google OAuth + JWT)
- Keyword basic CRUD
- Article generation + publish to WordPress
- GSC OAuth flow (per-site)
- Scheduler cron infrastructure (robfig/cron)
- AI Engine: crawler, SERP analyzer, article writer, skill loader
- Frontend: site management, keyword list, article detail

---

## Phase 1 — Page Storage (Crawl + เก็บ pages + keywords ต่อ page)

### Backend (Go)

**New Models:**
| File | สร้างใหม่ |
|------|----------|
| `domain/models/site_page.go` | SitePage: id, site_id, url, title, h1, meta_description, page_type, word_count, last_crawled_at |

**Modify Models:**
| File | แก้ไข |
|------|------|
| `domain/models/keyword.go` | เพิ่ม `PageID *uuid.UUID` (FK to site_pages) |

**New Repositories:**
| File | สร้างใหม่ |
|------|----------|
| `domain/repositories/site_page_repository.go` | Interface: Create, GetBySiteID, GetByURL, Update |
| `infrastructure/postgres/site_page_repo.go` | Implementation |

**New DTOs:**
| File | สร้างใหม่ |
|------|----------|
| `domain/dto/site_page_dto.go` | SitePageResponse + mapper (รวม keywords ของ page) |

**Modify DTOs:**
| File | แก้ไข |
|------|------|
| `domain/dto/keyword_dto.go` | เพิ่ม `pageId`, `pageUrl` ใน KeywordResponse |

**New Handler + Routes:**
| File | สร้างใหม่ |
|------|----------|
| `interfaces/api/handlers/page_handler.go` | GetPages, GetPageDetail |
| Routes | `GET /sites/:id/pages`, `GET /sites/:id/pages/:pageId` |

**Modify:**
| File | แก้ไข |
|------|------|
| `infrastructure/postgres/db.go` | เพิ่ม AutoMigrate: SitePage |
| `pkg/di/container.go` | เพิ่ม SitePageRepo + PageHandler |
| `application/serviceimpl/site_service_impl.go` | แก้ RunPipeline ให้เก็บ pages + ผูก keywords กับ page |

### AI Engine (Python)

**New Endpoint:**
| Endpoint | สร้างใหม่ |
|----------|----------|
| `POST /crawl-pages` | Crawl เว็บ → return pages[] พร้อม keywords ต่อ page |

**Modify:**
| File | แก้ไข |
|------|------|
| `services/site_analyzer.py` | แก้ `_extract_seeds_with_llm` ให้ return keywords ผูกกับ page URL |
| `models/schemas.py` | เพิ่ม CrawlPagesRequest/Response |
| `main.py` | เพิ่ม `/crawl-pages` endpoint |

### Frontend

**New Feature: `features/pages/`**
| File | สร้างใหม่ |
|------|----------|
| `types.ts` | SitePage, OnPageAudit interfaces |
| `service.ts` | getPages(), getPageDetail() |
| `hooks.ts` | usePageList(), usePageDetail() |
| `index.ts` | barrel exports |

**New Components: `features/sites/components/`**
| File | สร้างใหม่ |
|------|----------|
| `pages-card.tsx` | แสดงทุก page + keywords ของแต่ละ page |

**Modify:**
| File | แก้ไข |
|------|------|
| `constants/api-routes.ts` | เพิ่ม PAGES routes |
| `app/dashboard/sites/[id]/page.tsx` | เพิ่ม PagesCard |
| `features/sites/index.ts` | export PagesCard |

---

## Phase 2 — SERP Tracking (คู่แข่ง top 10 ทุกวัน)

### Backend (Go)

**New Models:**
| File | สร้างใหม่ |
|------|----------|
| `domain/models/keyword_serp_history.go` | id, keyword_id, checked_at, our_position, avg_word_count, results (JSONB), changes (JSONB) |

**New Repositories:**
| File | สร้างใหม่ |
|------|----------|
| `domain/repositories/serp_history_repository.go` | Interface: Create, GetLatestByKeywordID, GetByDateRange |
| `infrastructure/postgres/serp_history_repo.go` | Implementation |

**New DTOs:**
| File | สร้างใหม่ |
|------|----------|
| `domain/dto/serp_history_dto.go` | SerpHistoryResponse + SerpCompetitor |

**New Service:**
| File | สร้างใหม่ |
|------|----------|
| `domain/services/page_analysis_service.go` | Interface: AnalyzeAllKeywords(siteID) |
| `application/serviceimpl/page_analysis_service_impl.go` | Implementation: loop keywords → SERP → save history |

**New Handler + Routes:**
| File | สร้างใหม่ |
|------|----------|
| `interfaces/api/handlers/serp_handler.go` | GetSerpHistory(keywordID) |
| Routes | `GET /keywords/:id/serp-history` |

**Modify:**
| File | แก้ไข |
|------|------|
| `infrastructure/postgres/db.go` | เพิ่ม AutoMigrate: KeywordSerpHistory |
| `pkg/scheduler/scheduler.go` | เพิ่ม Step 2 job (ทุกวัน 03:00): `runPageAnalysis()` |
| `pkg/di/container.go` | เพิ่ม SerpHistoryRepo + PageAnalysisService |

### AI Engine (Python)

**Modify:**
| File | แก้ไข |
|------|------|
| `services/serp_analyzer.py` | เพิ่ม method: analyze ที่ return `our_position` ด้วย (เทียบ site_url) |
| `main.py` | แก้ `/analyze-serp` ให้รับ `site_url` เพื่อหาว่าเราอันดับเท่าไหร่ |

### Frontend

**New Components:**
| File | สร้างใหม่ |
|------|----------|
| `features/pages/components/serp-history-card.tsx` | แสดงคู่แข่ง top 10 + changes จากเมื่อวาน |

**Modify:**
| File | แก้ไข |
|------|------|
| `features/keywords/types.ts` | เพิ่ม SerpSnapshot, SerpCompetitor |
| `constants/api-routes.ts` | เพิ่ม SERP routes |

---

## Phase 3 — Content Generation (ใช้ SERP data)

### Backend (Go)

**Modify:**
| File | แก้ไข |
|------|------|
| `pkg/scheduler/scheduler.go` | เพิ่ม Step 3 job (ทุกวัน 06:00): `runContentGeneration()` — ดึง SERP data จาก DB แล้วส่งให้ article writer |
| `application/serviceimpl/article_service_impl.go` | แก้ Generate ให้ใส่ SERP competitor data ใน prompt |

### AI Engine (Python)

**Modify:**
| File | แก้ไข |
|------|------|
| `services/article_writer.py` | รับ `competitor_data` parameter → ใส่ใน prompt ว่าคู่แข่ง top 10 เป็นยังไง |

### Frontend

ไม่ต้องแก้ — ใช้ UI เดิม (articles card + article detail page)

---

## Phase 4 — Ranking Tracker (GSC + history + graph)

### Backend (Go)

**New Models:**
| File | สร้างใหม่ |
|------|----------|
| `domain/models/keyword_ranking.go` | id, keyword_id, page_id, recorded_at, position, impressions, clicks, ctr |

**New Repositories:**
| File | สร้างใหม่ |
|------|----------|
| `domain/repositories/ranking_repository.go` | Interface: Create, GetByKeywordIDAndDateRange, GetLatest |
| `infrastructure/postgres/ranking_repo.go` | Implementation |

**New DTOs:**
| File | สร้างใหม่ |
|------|----------|
| `domain/dto/ranking_dto.go` | RankingTrendResponse + RankingDataPoint |

**New Handler + Routes:**
| File | สร้างใหม่ |
|------|----------|
| `interfaces/api/handlers/ranking_handler.go` | GetRankingTrend(keywordID) |
| Routes | `GET /keywords/:id/rankings` |

**Modify:**
| File | แก้ไข |
|------|------|
| `infrastructure/postgres/db.go` | เพิ่ม AutoMigrate: KeywordRanking |
| `pkg/scheduler/scheduler.go` | แก้ Step 4 (ทุก 12 ชม.): เก็บ ranking history ลง DB แทนแค่ optimize |
| `pkg/di/container.go` | เพิ่ม RankingRepo + RankingHandler |

### Frontend

**New Feature: `features/rankings/`**
| File | สร้างใหม่ |
|------|----------|
| `types.ts` | RankingDataPoint, RankingTrend |
| `service.ts` | getRankingTrend(keywordId) |
| `hooks.ts` | useRankingTrend() |
| `index.ts` | barrel exports |

**New Components:**
| File | สร้างใหม่ |
|------|----------|
| `features/rankings/components/ranking-chart.tsx` | กราฟ position/CTR/clicks over time |

**Modify:**
| File | แก้ไข |
|------|------|
| `constants/api-routes.ts` | เพิ่ม RANKINGS routes |
| `app/dashboard/sites/[id]/page.tsx` | เพิ่ม RankingChart component |

---

## สรุปจำนวนไฟล์

| Phase | ไฟล์ใหม่ | ไฟล์แก้ไข | รวม |
|-------|---------|----------|-----|
| **Phase 1** (Pages) | 10 | 8 | 18 |
| **Phase 2** (SERP) | 7 | 5 | 12 |
| **Phase 3** (Content) | 0 | 3 | 3 |
| **Phase 4** (Rankings) | 8 | 4 | 12 |
| **รวม** | **25 ไฟล์ใหม่** | **20 ไฟล์แก้ไข** | **45** |

---

## Implementation Order

```
Phase 1 ← ทำก่อน (foundation)
  ↓
Phase 2 ← ต่อเนื่อง (ใช้ pages จาก Phase 1)
  ↓
Phase 3 ← ต่อเนื่อง (ใช้ SERP data จาก Phase 2)
  ↓
Phase 4 ← สุดท้าย (ต้องมี GSC connected)
```

ทุก Phase มี: **Backend → AI Engine → Frontend** ครบ 3 layers
