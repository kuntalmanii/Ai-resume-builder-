# Production Deployment Guide

This guide details deployment options for **CareerOS AI** on cloud infrastructure.

---

## 🐋 Option 1: Docker Compose Production (Self-Hosted VPS)

Deploying to a single host (e.g. DigitalOcean droplet, AWS EC2, or Linode) with Docker Compose:

### 1. Configure production environment files

Create `/Users/manishkuntal/Desktop/Projects/Ai resume builder/ai-resume-builder/backend/.env.production`:
```env
APP_ENV=production
SECRET_KEY=<64-character-cryptographic-hex-string>
DATABASE_URL=postgresql+asyncpg://careeros:your_secure_password@postgres:5432/careeros
REDIS_URL=redis://:your_redis_password@redis:6379/0
REDIS_ENABLED=true
AI_API_KEY=<your-gemini-or-openai-api-key>
CORS_ORIGINS=https://careeros.yourdomain.com
STORAGE_PROVIDER=local
RATE_LIMIT_ENABLED=true
```

Create root `.env` config file:
```env
POSTGRES_USER=careeros
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=careeros
REDIS_PASSWORD=your_redis_password
NEXT_PUBLIC_API_URL=https://careeros.yourdomain.com/api/v1
```

### 2. Start the production stack

```bash
# Pull, build, and run the services detached
docker compose -f docker-compose.prod.yml up -d --build

# Run database migrations in the backend container
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## ⚡ Option 2: Split Cloud Deployment (Vercel + Fly.io)

For low-maintenance, fully-managed serverless hosting, deploy the frontend to Vercel and the backend to Fly.io.

### 1. Frontend (Vercel)
Vercel automatically reads the root `vercel.json` config.
*   **Build Command:** `npm run build`
*   **Output Directory:** `out` (static export) or default `.next`
*   **Environment Variables:**
    *   `NEXT_PUBLIC_API_URL`: `https://careeros-backend.fly.dev/api/v1`

### 2. Backend (Fly.io)
Fly.io reads the `backend/fly.toml` machine setup.
```bash
cd backend
fly launch --no-deploy
```
Set secrets on the Fly machine:
```bash
fly secrets set SECRET_KEY="your_secret_key" AI_API_KEY="your_api_key" DATABASE_URL="postgresql+asyncpg://..."
fly deploy
```

---

## 🩺 Post-Deployment Checkups

Verify target deployment endpoints:
*   **Liveness Probe:** `GET https://careeros.yourdomain.com/health` (Should return `{"status":"ok"}`)
*   **Readiness Check:** `GET https://careeros.yourdomain.com/api/v1/ready` (Verifies DB, Redis, and storage connectivity)
*   **System Diagnostics:** `GET https://careeros.yourdomain.com/api/v1/health` (Telemetry metrics)
