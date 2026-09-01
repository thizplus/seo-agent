# Google OAuth Setup Guide

## 1. สร้าง Google Cloud Project

1. ไปที่ https://console.cloud.google.com/
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. ตั้งชื่อ เช่น `SEO Agents`

## 2. เปิด OAuth Consent Screen

1. ไปที่ **APIs & Services > OAuth consent screen**
2. เลือก **External**
3. กรอกข้อมูล:
   - App name: `SEO Agents`
   - User support email: email ของคุณ
   - Developer contact: email ของคุณ
4. Scopes: เพิ่ม `email`, `profile`, `openid`
5. Test users: เพิ่ม email ที่จะใช้ทดสอบ

## 3. สร้าง OAuth Client ID

1. ไปที่ **APIs & Services > Credentials**
2. กด **+ CREATE CREDENTIALS > OAuth client ID**
3. Application type: **Web application**
4. ตั้งชื่อ: `SEO Agents Web`

### Authorized JavaScript origins

```
http://localhost:3000
http://localhost:3001
```

### Authorized redirect URIs

```
http://localhost:3001/api/v1/auth/google/callback
```

6. กด **CREATE**
7. Copy **Client ID** และ **Client Secret**

## 4. ตั้งค่า Environment Variables

### Backend (.env)

```env
# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URL=http://localhost:3001/api/v1/auth/google/callback

# JWT
JWT_SECRET=ใส่-secret-key-ยาวๆ-สุ่มเอา

# Frontend URL (สำหรับ redirect หลัง login)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 5. OAuth Flow

```
1. User กด "Sign in with Google"
2. Frontend redirect ไป: GET /api/v1/auth/google (backend)
3. Backend redirect ไป: Google OAuth consent screen
4. User login กับ Google
5. Google redirect กลับ: GET /api/v1/auth/google/callback (backend)
6. Backend exchange code -> token -> get user info
7. Backend สร้าง/login user + generate JWT
8. Backend redirect ไป: /auth/google/callback?token=JWT&user_id=UUID (frontend)
9. Frontend เก็บ token ใน localStorage
10. Redirect ไป /dashboard
```

## 6. ทดสอบ

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start backend
cd backend && air

# 3. Start frontend
cd frontend && npm run dev

# 4. เปิด http://localhost:3000
# 5. จะ redirect ไป /login
# 6. กด "Sign in with Google"
# 7. เลือก Google account
# 8. จะ redirect กลับมา /dashboard
```

## Troubleshooting

| ปัญหา | แก้ไข |
|-------|-------|
| `redirect_uri_mismatch` | ตรวจ Authorized redirect URIs ใน Google Console ต้องตรงกับ `GOOGLE_REDIRECT_URL` |
| `invalid_client` | ตรวจ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` |
| redirect ไป /login?error=token_exchange_failed | ตรวจ `GOOGLE_CLIENT_SECRET` ถูกต้อง |
| redirect ไป /login?error=invalid_state | ลอง clear cookies แล้ว login ใหม่ |
