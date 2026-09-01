# Production Deployment Guide

## Requirements
- Ubuntu 22.04+ VPS (recommended: 4GB RAM, 2 CPU)
- Domain name pointing to server IP
- Docker + Docker Compose installed

---

## Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

## Step 2: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/thizplus/seo-agent.git
sudo chown -R $USER:$USER seo-agent
cd seo-agent
```

## Step 3: Configure Environment

```bash
cp .env.example .env
nano .env
```

**แก้ไขค่าเหล่านี้ (สำคัญมาก):**

```env
# Database - เปลี่ยน password ให้แข็งแรง
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD_HERE

# JWT - ใช้ random string 64 ตัว
JWT_SECRET=YOUR_RANDOM_64_CHAR_STRING

# Google OAuth - เปลี่ยน redirect URL เป็น domain จริง
GOOGLE_REDIRECT_URL=https://YOUR_DOMAIN.com/api/v1/auth/google/callback

# Frontend URL - domain จริง
FRONTEND_URL=https://YOUR_DOMAIN.com

# Backend public URL (สำหรับ frontend เรียก API)
BACKEND_PUBLIC_URL=https://YOUR_DOMAIN.com
```

**เพิ่ม env สำหรับ production:**
```env
# Redis password
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD
```

## Step 4: Configure Nginx

```bash
# แก้ domain ใน nginx config
sed -i 's/YOUR_DOMAIN.com/your-actual-domain.com/g' nginx/nginx.conf

# สร้าง SSL directory
mkdir -p nginx/ssl
```

## Step 5: SSL Certificate (Let's Encrypt)

```bash
# ครั้งแรก - รัน nginx แบบ HTTP only ก่อน
# Comment out SSL server block ใน nginx.conf ชั่วคราว
# แล้วเปิด HTTP server ให้ serve /.well-known/

# Get certificate
docker run --rm -v ./nginx/ssl:/etc/letsencrypt -v certbot_data:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d YOUR_DOMAIN.com --email YOUR_EMAIL --agree-tos --no-eff-email

# แล้ว uncomment SSL block กลับมา
```

## Step 6: Update Google OAuth

ไปที่ [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. เปิด OAuth 2.0 Client ID ที่ใช้อยู่
2. เพิ่ม **Authorized redirect URIs**:
   - `https://YOUR_DOMAIN.com/api/v1/auth/google/callback`
3. เพิ่ม **Authorized JavaScript origins**:
   - `https://YOUR_DOMAIN.com`

## Step 7: Deploy

```bash
# Build & start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Check individual service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f ai-engine
```

## Step 8: Verify

```bash
# Health checks
curl https://YOUR_DOMAIN.com/api/v1/health
# Should return: {"success":true,"data":"OK"}

# Frontend
curl -I https://YOUR_DOMAIN.com
# Should return: HTTP/2 200
```

---

## Maintenance

### Update Code
```bash
cd /opt/seo-agent
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Backup
```bash
# Backup
docker exec seo_agents_db pg_dump -U seo_agents seo_agents > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i seo_agents_db psql -U seo_agents seo_agents < backup_20260901.sql
```

### SSL Renew (Auto)
Certbot container auto-renews every 12 hours. Manual renew:
```bash
docker compose -f docker-compose.prod.yml exec certbot certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend
docker compose -f docker-compose.prod.yml logs -f --tail=100 ai-engine
```

### Restart Service
```bash
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart ai-engine
```

---

## Security Checklist

- [ ] Change `DB_PASSWORD` to strong password (32+ chars)
- [ ] Change `JWT_SECRET` to random string (64 chars)
- [ ] Change `REDIS_PASSWORD` to strong password
- [ ] Update Google OAuth redirect URLs to production domain
- [ ] All internal ports bind to `127.0.0.1` only (done in docker-compose.prod.yml)
- [ ] Nginx SSL enabled with Let's Encrypt
- [ ] Security headers configured (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Rate limiting on API endpoints (30 req/min)
- [ ] AI Engine port (8000) not exposed externally
- [ ] Firewall: allow only 80, 443, 22 (SSH)

### Firewall Setup
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Recommended VPS Specs

| Tier | RAM | CPU | Storage | Cost/month |
|------|-----|-----|---------|------------|
| Minimum | 2GB | 1 vCPU | 40GB SSD | ~$12 |
| Recommended | 4GB | 2 vCPU | 80GB SSD | ~$24 |
| Production | 8GB | 4 vCPU | 160GB SSD | ~$48 |

Providers: DigitalOcean, Vultr, Hetzner, Linode
