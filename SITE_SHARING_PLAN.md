# Site Sharing — แผนพัฒนาระบบแชร์ Site ให้ทีมงาน

## สรุปฟีเจอร์

เจ้าของ Site สามารถเพิ่มอีเมลคนอื่นเข้ามาดูและจัดการ Site ที่เลือกได้
เมื่อคนที่ถูกเพิ่ม Login ด้วย Google จะเห็นเฉพาะ Site ที่ถูกแชร์มาให้
และสามารถจัดการได้ทุกอย่างเหมือนเจ้าของ (Pipeline, Keywords, Articles, Publish ฯลฯ)

---

## สิ่งที่ต้องทำ

### 1. Database — เพิ่มตาราง `site_members`

```sql
CREATE TABLE site_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,          -- อีเมลที่แชร์ให้
    user_id UUID REFERENCES users(id),    -- NULL ถ้ายังไม่เคย login, link ตอน login ครั้งแรก
    role VARCHAR(50) DEFAULT 'editor',    -- owner | editor (อนาคตแยก permission ได้)
    invited_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(site_id, email)                -- ไม่ซ้ำ email ต่อ site
);
```

### 2. Backend — Model + Repository + Service

**Model** `domain/models/site_member.go`:
```go
type SiteMember struct {
    ID        uuid.UUID
    SiteID    uuid.UUID
    Email     string
    UserID    *uuid.UUID  // nullable — link ตอน user login ครั้งแรก
    Role      string      // "owner" | "editor"
    InvitedBy uuid.UUID
    CreatedAt time.Time
}
```

**Repository** `domain/repositories/site_member_repository.go`:
- `GetBySiteID(siteID) → []SiteMember`
- `GetByEmail(email) → []SiteMember`
- `GetByUserID(userID) → []SiteMember`
- `Create(member) → error`
- `Delete(id) → error`
- `LinkUser(email, userID) → error` — อัปเดต user_id เมื่อ user login

**แก้ SiteService**:
- `GetByUserID()` → เพิ่ม query: ดึง site ที่เป็นเจ้าของ + site ที่ถูกแชร์มา
- `GetByID()` → เช็คว่า user เป็นเจ้าของ หรือ เป็น member

**แก้ AuthService**:
- `LoginOrRegisterWithGoogle()` → หลัง login สำเร็จ เรียก `LinkUser(email, userID)` เพื่อ link site_members ที่ invite ไว้ก่อนหน้า

### 3. Backend — API Endpoints ใหม่

| Method | Path | หน้าที่ |
|--------|------|--------|
| GET | `/api/v1/sites/:id/members` | ดู member ทั้งหมดของ site |
| POST | `/api/v1/sites/:id/members` | เพิ่ม member (ส่ง email) |
| DELETE | `/api/v1/sites/:id/members/:memberId` | ลบ member |

**Request Body (POST)**:
```json
{
  "email": "team@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "siteId": "uuid",
    "email": "team@example.com",
    "role": "editor",
    "joined": false
  }
}
```

### 4. Backend — แก้ Authorization

**ก่อน (ปัจจุบัน)**:
```go
// GetAll: ดึงแค่ site ที่ user_id = ตัวเอง
sites, _ := siteRepo.GetByUserID(ctx, userID)
```

**หลัง (ใหม่)**:
```go
// GetAll: ดึง site ที่เป็นเจ้าของ + site ที่ถูกแชร์มา
ownedSites, _ := siteRepo.GetByUserID(ctx, userID)
sharedSites, _ := siteMemberRepo.GetSharedSites(ctx, userID)
allSites := append(ownedSites, sharedSites...)
```

**เช็ค permission ก่อนจัดการ site**:
```go
func (s *siteServiceImpl) canAccess(ctx context.Context, siteID, userID uuid.UUID) bool {
    site, _ := s.siteRepo.GetByID(ctx, siteID)
    if site.UserID == userID {
        return true  // เจ้าของ
    }
    members, _ := s.memberRepo.GetBySiteID(ctx, siteID)
    for _, m := range members {
        if m.UserID != nil && *m.UserID == userID {
            return true  // member
        }
    }
    return false
}
```

### 5. Frontend — UI Components

**ที่ไหน**: เพิ่ม Card ใหม่ในหน้า Site Detail `sites/[id]/page.tsx`

**Component ใหม่**: `features/sites/components/members-card.tsx`

```
┌─────────────────────────────────────────┐
│ 👥 สมาชิก                    + เพิ่มสมาชิก │
│ จัดการสมาชิกที่เข้าถึง Site นี้ได้         │
├─────────────────────────────────────────┤
│                                         │
│ 📧 owner@gmail.com        เจ้าของ       │
│ 📧 team1@gmail.com        เข้าร่วมแล้ว  🗑 │
│ 📧 team2@gmail.com        รอเข้าร่วม    🗑 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ พิมพ์อีเมล...              [เพิ่ม]  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**สถานะ**:
- `เจ้าของ` — ไม่มีปุ่มลบ
- `เข้าร่วมแล้ว` (joined: true) — user login แล้ว, ลบได้
- `รอเข้าร่วม` (joined: false) — invite แล้วแต่ยังไม่ login, ลบได้

**แสดงเฉพาะเจ้าของ**: Card นี้แสดงเฉพาะเมื่อ user เป็นเจ้าของ site (member ไม่เห็น)

### 6. Frontend — Service + Hooks

**Service** `features/sites/service.ts`:
```typescript
getMembers(siteId: string): Promise<SiteMember[]>
addMember(siteId: string, email: string): Promise<SiteMember>
removeMember(siteId: string, memberId: string): Promise<void>
```

**Hooks** `features/sites/hooks.ts`:
```typescript
useSiteMembers(siteId)
useAddMember(siteId)
useRemoveMember(siteId)
```

**Types** `features/sites/types.ts`:
```typescript
interface SiteMember {
  id: string
  siteId: string
  email: string
  role: 'owner' | 'editor'
  joined: boolean
  createdAt: string
}
```

### 7. API Routes

**Constants** `constants/api-routes.ts`:
```typescript
MEMBERS: (siteId: string) => `/api/v1/sites/${siteId}/members`,
REMOVE_MEMBER: (siteId: string, memberId: string) => `/api/v1/sites/${siteId}/members/${memberId}`,
```

---

## Flow การทำงาน

```
1. เจ้าของ site กดเพิ่มสมาชิก → พิมพ์ email "team@example.com"
   ↓
2. Backend สร้าง site_members record (user_id = NULL, email = team@example.com)
   ↓
3. team@example.com Login ด้วย Google เข้ามาในระบบ
   ↓
4. Backend เช็ค site_members ที่ email ตรง → link user_id
   ↓
5. team@example.com เห็น site ที่ถูกแชร์มาในหน้า Dashboard
   ↓
6. จัดการได้ทุกอย่าง: Pipeline, Keywords, Articles, Publish, GSC ฯลฯ
```

---

## ไฟล์ที่ต้องสร้าง/แก้ไข

### สร้างใหม่ (6 ไฟล์)
| ไฟล์ | หน้าที่ |
|------|--------|
| `backend/domain/models/site_member.go` | Model |
| `backend/domain/repositories/site_member_repository.go` | Interface |
| `backend/infrastructure/postgres/site_member_repo.go` | Implementation |
| `backend/interfaces/api/handlers/member_handler.go` | API Handler |
| `frontend/src/features/sites/components/members-card.tsx` | UI Component |

### แก้ไข (7 ไฟล์)
| ไฟล์ | แก้อะไร |
|------|--------|
| `backend/infrastructure/postgres/db.go` | เพิ่ม AutoMigrate SiteMember |
| `backend/pkg/di/container.go` | เพิ่ม SiteMemberRepo + MemberHandler |
| `backend/interfaces/api/routes/routes.go` | เพิ่ม member routes |
| `backend/application/serviceimpl/site_service_impl.go` | แก้ GetByUserID ให้รวม shared sites |
| `backend/application/serviceimpl/auth_service_impl.go` | เพิ่ม LinkUser หลัง login |
| `frontend/src/features/sites/types.ts` | เพิ่ม SiteMember type |
| `frontend/src/features/sites/service.ts` | เพิ่ม member service methods |
| `frontend/src/features/sites/hooks.ts` | เพิ่ม member hooks |
| `frontend/src/constants/api-routes.ts` | เพิ่ม MEMBERS routes |
| `frontend/src/app/dashboard/sites/[id]/page.tsx` | เพิ่ม MembersCard |

---

## ประมาณเวลา

| ส่วน | งาน |
|------|-----|
| Backend (Model + Repo + Handler + แก้ Auth) | หลัก |
| Frontend (Card + Hooks + Service) | รอง |
| Test + Deploy | ปิดท้าย |

## หมายเหตุ
- ไม่ต้องส่ง email invite — แค่เพิ่ม email ไว้ พอคนนั้น login ก็เห็นเลย
- อนาคตสามารถแยก role (viewer / editor / admin) ได้ แต่ตอนนี้ให้ทุกคนจัดการได้เท่ากัน
- เฉพาะเจ้าของ site เท่านั้นที่เห็น Members Card และเพิ่ม/ลบสมาชิกได้
