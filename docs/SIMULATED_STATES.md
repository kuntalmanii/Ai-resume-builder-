# Simulated States Audit

This document lists all mock/simulated states currently implemented in the frontend, along with their location and how they will be connected to real backend services in future phases.

---

## 1. Resume Document Upload & Parsing [RESOLVED]

- **Route:** `/upload` and `/upload/[importId]/review`
- **Components:** 
  - `ResumeUploadPage` in [`frontend/app/(dashboard)/upload/page.tsx`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/app/%28dashboard%29/upload/page.tsx)
  - `ResumeImportReviewPage` in [`frontend/app/(dashboard)/upload/[importId]/review/page.tsx`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/app/%28dashboard%29/upload/%5BimportId%5D/review/page.tsx)
- **Backend Endpoints:**
  - `POST /api/v1/resume-imports` (Upload/Parse)
  - `GET /api/v1/resume-imports/{id}` (Get Session)
  - `PATCH /api/v1/resume-imports/{id}/document` (Save Draft)
  - `POST /api/v1/resume-imports/{id}/finalize` (Finalize and Import)
- **Status:** Completed and integrated with production backend services.

---

## 2. ATS Score Card & Score Breakdown

- **Route:** `/resumes/[id]/analyze`
- **Component:** `ResumeAnalysisPage` in [`frontend/app/(dashboard)/resumes/[id]/analyze/page.tsx`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/app/%28dashboard%29/resumes/%5Bid%5D/analyze/page.tsx)
- **Mock Data File:** `mockAnalysisResults` in [`frontend/lib/mock-data/index.ts`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/lib/mock-data/index.ts)
- **Current Simulation:** Visualizes static pre-calculated scorecard structures (ATS Compatibility, Content Strength, Completeness, etc.) and category criteria warnings.
- **Backend Replacement:** `POST /api/v1/resumes/{id}/analyze` and `GET /api/v1/resumes/{id}/analyses/latest`
- **Replaced in:** Phase 8 (ATS Scorecard Calculation & Detailed Check Checks)

---

## 3. Job Description Semantic & Keyword Matching

- **Route:** `/resumes/[id]/match`
- **Component:** `JobMatchPage` in [`frontend/app/(dashboard)/resumes/[id]/match/page.tsx`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/app/%28dashboard%29/resumes/%5Bid%5D/match/page.tsx)
- **Mock Data File:** `mockJobMatchResults` in [`frontend/lib/mock-data/index.ts`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/lib/mock-data/index.ts)
- **Current Simulation:** Shows static keyword gaps, semantic similarity percentages, and experience mapping listings.
- **Backend Replacement:** `POST /api/v1/resumes/{id}/match` returning a typed `JobMatchResultResponse`
- **Replaced in:** Phase 9 (Job Description Semantic & Keyword Matching)

---

## 4. AI Improvement Suggestions & Verification

- **Route:** `/resumes/[id]/improve`
- **Component:** `ImproveResumePage` in [`frontend/app/(dashboard)/resumes/[id]/improve/page.tsx`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/app/%28dashboard%29/resumes/%5Bid%5D/improve/page.tsx)
- **Mock Data File:** `mockAISuggestions` in [`frontend/lib/mock-data/index.ts`](file:///Users/manishkuntal/Desktop/Projects/Ai%20resume%20builder/ai-resume-builder/frontend/lib/mock-data/index.ts)
- **Current Simulation:** Allows auditing improvements, showing side-by-side phrasing changes and mock evidence sources.
- **Backend Replacement:** `GET /api/v1/resumes/{id}/suggestions` and `POST /api/v1/resumes/{id}/suggestions/{suggestion_id}/accept`
- **Replaced in:** Phase 10 (AI suggestions, verification mechanism, and feedback loop)
