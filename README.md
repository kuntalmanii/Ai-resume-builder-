# CareerOS AI

> AI-powered Resume Builder, Analyzer, ATS Checker, and Job Description Matcher.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Architecture

```
ai-resume-builder/
├── frontend/   # Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui
└── backend/    # Python · FastAPI · SQLAlchemy · Alembic · PostgreSQL
```

Frontend and backend communicate **exclusively** through documented HTTP REST APIs at `/api/v1`.

---

## Quick Start (Docker)

```bash
# 1. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Fill in your secrets (AI API key, SECRET_KEY, etc.)
# 3. Start everything
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `APP_ENV` | `development` or `production` |
| `DEBUG` | `true` / `false` |
| `SECRET_KEY` | Random 64-char string for JWT signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | JWT refresh token lifetime |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `AI_PROVIDER` | `gemini` or `openai` |
| `AI_API_KEY` | Your AI provider API key |
| `AI_MODEL` | Model name (e.g. `gemini-1.5-pro`) |
| `MAX_UPLOAD_SIZE_MB` | Max file upload size |
| `UPLOAD_DIR` | Directory for uploaded files |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 14 (App Router) |
| Frontend Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query |
| Backend Framework | FastAPI |
| Backend Language | Python 3.11+ |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens) |
| Password Hashing | bcrypt |
| PDF Parsing | PyMuPDF |
| DOCX Parsing | python-docx |
| PDF Export | WeasyPrint |
| AI Provider | Gemini / OpenAI (pluggable) |

---

## Security

- Passwords hashed with bcrypt
- JWT access tokens (short-lived) + refresh tokens (HTTP-only cookie)
- CORS configured to explicit allowlist
- Upload validation: extension + MIME type + file size
- Filenames sanitized (UUID-based storage)
- All LLM outputs schema-validated before use
- No PII logged
- User data deletion endpoint (GDPR)

---

## License

MIT
