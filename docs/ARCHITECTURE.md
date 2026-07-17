# System Architecture & Design

This document details the system design, data flow, authentication, asynchronous jobs, and database architecture of the **CareerOS AI** platform.

---

## 🗺️ System Topology

CareerOS AI is designed with a service-oriented, containerized topology. The user interacts through a reverse proxy (Nginx) which directs requests to the Next.js frontend or the FastAPI backend.

```mermaid
graph TD
    User([User Web Browser])
    
    subgraph Edge & Proxy
        Nginx[Nginx Reverse Proxy]
    end
    
    subgraph Web App Layers
        Frontend[Next.js App Router]
        Backend[FastAPI Application]
    end
    
    subgraph Data & Storage Layers
        DB[(PostgreSQL 16)]
        Redis[(Redis Cache & Rate Limiting)]
        Storage[Local File Storage / Cloud Storage]
    end
    
    subgraph Asynchronous Tasks
        Worker[Python RQ Workers]
    end
    
    User -->|Port 80/443| Nginx
    Nginx -->|Proxy Port 3000| Frontend
    Nginx -->|Proxy Port 8000| Backend
    
    Backend -->|Async SQLAlchemy| DB
    Backend -->|Read/Write| Redis
    Backend -->|Enqueue Job| Redis
    Backend -->|Write upload/export| Storage
    
    Worker -->|Listen| Redis
    Worker -->|Fetch metadata| DB
    Worker -->|Compile PDF| Storage
```

---

## 🔑 Authentication Flow

CareerOS AI uses JWT (JSON Web Tokens) with a short-lived access token (30 minutes) and a long-lived refresh token (7 days). Refresh tokens are stored securely in HTTP-only, SameSite cookies.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Candidate/Recruiter
    participant Server as FastAPI Auth Service
    participant Redis as Redis Server
    participant DB as PostgreSQL Database
    
    Client->>Server: POST /api/v1/auth/login {email, password}
    Server->>DB: Query user records (verify password hash)
    DB-->>Server: Return User details
    Server->>Redis: Record active login session metadata
    Server-->>Client: HTTP Response: JSON {access_token} + Set HTTP-only Cookie {refresh_token}
    
    Note over Client, Server: Subsequent Requests
    Client->>Server: HTTP Request with Header: Authorization Bearer [access_token]
    Server->>Server: Decode and validate token signature
    Server-->>Client: Authorized Resource Access
```

---

## 📄 Resume PDF Compile & Export Pipeline

PDF rendering is processed asynchronously via background workers (Python RQ) utilizing headless Playwright.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Candidate Browser
    participant API as FastAPI Backend
    participant Redis as Redis Queue (RQ)
    participant Worker as Background Worker
    participant Browser as Playwright headless Chromium
    participant DB as PostgreSQL
    participant Storage as File Storage
    
    Client->>API: POST /api/v1/resumes/{id}/export
    API->>DB: Create ExportHistory log entry (Status: PENDING)
    API->>Redis: Enqueue PDF compilation job
    API-->>Client: HTTP 202 Accepted {job_id}
    
    Note over Worker: Worker retrieves queued task
    Worker->>DB: Update ExportHistory status (Status: PROCESSING)
    Worker->>Browser: Start headless Chromium
    Worker->>Browser: Render resume HTML layout (templates)
    Worker->>Browser: Print page to PDF format (A4 margins)
    Worker->>Storage: Save generated .pdf file
    Worker->>DB: Update ExportHistory status (Status: COMPLETED, file_path)
    
    Note over Client, API: Client Polls Liveness
    Client->>API: GET /api/v1/resumes/{id}/export/status
    API-->>Client: Returns export status and download URL
```

---

## 🛡️ Grounded Credibility & Evidence Mode

To verify resume claims and generate trust scores, CareerOS AI employs an exclusive **Evidence Mode** pipeline:

```mermaid
graph TD
    Resume[Resume Version Snapshot] -->|Extract| Claims[ClaimExtractorService]
    Claims -->|Analyze| Audit[CredibilityEngineService]
    Audit -->|Compute| Score[Credibility Score]
    
    subgraph Evidence Mode Database Linkage
        EvidenceSource -->|One-to-One| AISuggestion
        EvidenceSource -->|One-to-One| ResumeClaim
    end
    
    Audit -->|Audit Report| EvidenceSource
```

*   **ClaimExtractorService:** Uses NLP to extract verifiable claims (e.g. "Increased sales by 40%").
*   **CredibilityEngineService:** Analyzes claim properties, checking for exaggerations, missing data, and links matching claims to verify credibility.
*   **CheckConstraint Enforcer:** Enforces `(ai_suggestion_id IS NULL) <> (resume_claim_id IS NULL)` ensuring that a source is exclusively linked to either a claim or a suggestion, but never both.
