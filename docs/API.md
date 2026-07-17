# API Endpoint Reference

This document summarizes the core REST API endpoints exposed by the **FastAPI Backend Server** (`/api/v1`).

---

## 🔑 Authentication

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user (default role: candidate) | No |
| `POST` | `/auth/login` | Login user, returns access token + sets refresh cookie | No |
| `POST` | `/auth/refresh` | Refresh access token using rotation token cookie | No |
| `POST` | `/auth/logout` | Revoke active refresh token and clear cookies | Yes |
| `GET` | `/auth/me` | Return currently authenticated user profile data | Yes |

---

## 📄 Resume & Templates Management

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/resumes` | List all resumes belonging to the authenticated user | Yes |
| `POST` | `/resumes` | Create a new resume (schema validation, default version) | Yes |
| `GET` | `/resumes/{id}` | Get specific resume details by ID | Yes |
| `PUT` | `/resumes/{id}` | Update resume details with optimistic concurrency check | Yes |
| `DELETE` | `/resumes/{id}` | Delete resume (removes associated versions and claims) | Yes |
| `POST` | `/resumes/{id}/version` | Commit a new frozen resume version snapshot | Yes |
| `GET` | `/resumes/{id}/versions` | Get the revision history log of a resume | Yes |

---

## 🔍 ATS Analysis & JD Matcher

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/analyzer/analyze` | Perform complete explainable ATS scan of a resume | Yes |
| `POST` | `/analyzer/match-jd` | Match resume version against a job description | Yes |
| `POST` | `/analyzer/suggest` | Generate grounded AI improvement suggestion lists | Yes |

---

## 🛡️ Evidence & Credibility

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/evidence/claims/{resume_id}`| Get NLP-extracted claims for a resume | Yes |
| `GET` | `/evidence/sources` | Get all evidence sources (URLs/docs) | Yes |
| `POST` | `/evidence/sources` | Link a new verification source to a claim/suggestion | Yes |
| `GET` | `/evidence/credibility/{id}` | Retrieve dynamic credibility trust score | Yes |

---

## 💼 Career Intelligence Suite

### Job Applications Tracker
*   `GET /applications` - List tracking board applications
*   `POST /applications` - Create a tracked application (company, role, stage)
*   `PUT /applications/{id}` - Update stage (e.g. wishlist, applied, interview, offer)

### Cover Letter Builder
*   `POST /cover-letters/generate` - Generate cover letter matching a resume version
*   `GET /cover-letters` - Retrieve all generated cover letters

### LinkedIn Profile Optimizer
*   `POST /linkedin/optimize` - Scan profile text and get optimized headline/about sections
*   `GET /linkedin/history` - Retrieve history of optimization recommendations

### Interactive Interview Prep
*   `POST /interviews/sessions` - Start an interactive interview practice session
*   `POST /interviews/sessions/{id}/answer` - Submit answer (audio transcript or text) for grading
*   `GET /interviews/sessions/{id}` - Get feedback scorecard

### Career Roadmap
*   `GET /roadmap` - Get current milestone progression checklist
*   `POST /roadmap/milestone` - Add milestone checkpoint

### Recruiter Workspace
*   `GET /recruiter/candidates` - Search and filter candidate database
*   `POST /recruiter/screen` - Run candidate resume verification screening audit

---

## 🔔 Notifications & Health

### Notifications
*   `GET /notifications` - Retrieve list of unread alerts
*   `PUT /notifications/read` - Mark all notifications as read
*   `DELETE /notifications/clear` - Delete notification alerts history

### Health Diagnostics
*   `GET /health` - Liveness check (instant)
*   `GET /api/v1/ready` - Readiness check (verifies PostgreSQL + Redis connections)
*   `GET /api/v1/health` - Complete telemetry metadata (latency, system uptime)
