# Interactive Demo & Presentation Guide

This guide describes how to run a 5 to 10-minute presentation or product walkthrough of **CareerOS AI** using the preloaded seed data.

---

## 🎤 Elevator Pitch

> "Traditional resume tools focus strictly on formatting. But passing modern Applicant Tracking Systems requires strategic alignment, credibility, and verified authority. **CareerOS AI** is the ultimate career intelligence platform. It scans resumes for ATS formatting and keyword metrics, uses NLP to verify claims in 'Evidence Mode', autogenerates targeted cover letters, practices voice-enabled interviews with candidates, and links candidate resumes straight into recruiter pipelines. It is the end-to-end OS for the modern job hunt."

---

## ⏱️ 5-Minute Product Walkthrough

### Step 1: Secure Login & Dashboard Intro (1 Minute)
1.  Navigate to the login portal: `http://localhost:3000/login`.
2.  Login as the demo candidate:
    *   **Email:** `demo@careeros.ai`
    *   **Password:** `Demo1234!`
3.  Walk through the dashboard home screen showing career analytics (ATS scores, application pipelines, and target skill completion progress).

### Step 2: The Interactive Resume Builder & ATS Scorer (1.5 Minutes)
1.  Click **My Resumes** and select **"Tech Lead Resume"**.
2.  Showcase the side-by-side editing pane. Edit any section and demonstrate the live PDF layout compilation.
3.  Click **Run ATS Analysis** to highlight the explainable scanner. Point out the spelling recommendations, keyword match density, and structural suggestions.

### Step 3: Evidence Mode & Claim Auditing (1.5 Minutes)
1.  Toggle on **Evidence Mode** on the top menu.
2.  Point out the underlined statements in the resume body. Show the claims extracted by the NLP service.
3.  Click on the **"increased pipeline execution speed by 40%"** claim. Show how it connects directly to a verified GitHub pull-request URL source.
4.  Highlight the **Credibility Score (Excellent)**. Explain that this prevents recruiter skepticism and builds maximum candidate trust.

### Step 4: The Career Suite (1 Minute)
1.  Go to **Applications Tracker** to view the Kanban board. Move a tracked card (e.g. Google - Tech Lead) from "Applied" to "Interview".
2.  Navigate to **Interview Prep** and click **"Practice Session"**. Answer a question and show the AI grading and rating response feedback.
3.  Show the **Career Roadmap** skill milestone checkpoint checklist.

---

## ⏱️ 10-Minute Extended Recruiter Walkthrough

1.  Log out of the candidate portal and sign in as the Recruiter:
    *   **Email:** `recruiter@careeros.ai`
    *   **Password:** `Recruiter1234!`
2.  Go to **Recruiter Workspace**. Explain that this allows hiring managers to search candidate databases.
3.  Search for **"React"** or **"Tech Lead"** to find the candidate profile `demo@careeros.ai`.
4.  Click **Screen Profile** to run the credibility audit verification, showcasing the candidate's claims and linked sources from the recruiter's viewpoint.

---

## ❓ Developer FAQ

#### Q: How does the system handle real-time PDF generation?
**A:** We use a Redis Queue (RQ) worker. When a compile is requested, a worker spins up a headless Chromium browser using Playwright to render the HTML resume structure, prints it to PDF with exact A4 margins, and stores the snapshot.

#### Q: What prevents parallel edits from overwriting each other?
**A:** We enforce Optimistic Concurrency Control (OCC) at the DB level. Each resume record has a `version` count. If a client attempts to save an edit on an outdated version, a database check blocks the operation, raising an error.

#### Q: How are AI suggestions grounded?
**A:** The `ClaimExtractorService` processes resume content before sending prompts. The suggestions are strictly matched to claims and verified sources to ensure AI doesn't invent fake achievements.
