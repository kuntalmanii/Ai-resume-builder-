#!/usr/bin/env python
"""Seed database with demo candidate and recruiter data for presentation and demo use."""
import asyncio
import logging

# Add backend directory to python path if run directly
import os
import sys
import uuid
from datetime import UTC, datetime

from sqlalchemy import select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.models import (
    AISuggestion,
    AnalysisCheck,
    AnalyticsSnapshot,
    Application,
    CareerEntry,
    CareerProfile,
    CoverLetter,
    EvidenceAudit,
    EvidenceSource,
    Interview,
    InterviewSession,
    JobDescription,
    JobMatchResult,
    LinkedInOptimization,
    Notification,
    Portfolio,
    Resume,
    ResumeAnalysis,
    ResumeClaim,
    ResumeVersion,
    Roadmap,
    User,
)
from app.db.session import AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_demo")


async def seed_data():
    settings = get_settings()
    logger.info("Connecting to database...")
    async with AsyncSessionLocal() as db:
        # 1. Clean existing seed data
        logger.info("Cleaning up existing demo data...")
        for email in ["demo@careeros.ai", "recruiter@careeros.ai"]:
            result = await db.execute(select(User).where(User.email == email))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                await db.delete(existing_user)
        await db.commit()

        # 2. Create Users
        logger.info("Creating demo users...")
        candidate = User(
            id=uuid.uuid4(),
            email="demo@careeros.ai",
            hashed_password=hash_password("Demo1234!"),
            full_name="Alex Mercer",
            role="user",
            is_active=True,
            is_verified=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        recruiter = User(
            id=uuid.uuid4(),
            email="recruiter@careeros.ai",
            hashed_password=hash_password("Recruiter1234!"),
            full_name="Sarah Jenkins",
            role="recruiter",
            is_active=True,
            is_verified=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add_all([candidate, recruiter])
        await db.flush()

        # 3. Create Career Profile
        logger.info("Creating career profile...")
        profile = CareerProfile(
            id=uuid.uuid4(),
            user_id=candidate.id,
            professional_summary="Senior Software Engineer with 6+ years of experience specialized in React, Next.js, and high-throughput Python backends.",
            professional_title="Senior Full Stack Engineer",
            phone="+1 (555) 019-2834",
            location="Boston, MA",
            linkedin_url="https://linkedin.com/in/alex-mercer-dev",
            github_url="https://github.com/alexmercer",
            portfolio_url="https://alexmercer.dev",
            skills={"languages": ["TypeScript", "Python", "Go", "SQL"], "frameworks": ["React", "Next.js", "FastAPI", "TailwindCSS"], "cloud": ["AWS", "Docker", "Terraform"]},
            experience=[],
            education=[],
            projects=[],
            certifications=[],
            achievements=[],
            positions_of_responsibility=[],
            languages=[],
            interests=["Open Source", "System Design", "Cloud Architecture"],
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(profile)
        await db.flush()

        # 4. Create Career Entries
        logger.info("Creating career entries...")
        entry_work = CareerEntry(
            id=uuid.uuid4(),
            user_id=candidate.id,
            entry_type="work",
            title="Senior Software Engineer",
            organization="SaaSify Inc.",
            start_date="2022-05",
            end_date=None,
            is_current=True,
            data={
                "description": "Leading development of the core microservices architecture. Designed real-time websocket synchronization framework increasing reliability by 40%. Led a team of 4 engineers.",
                "location": "Boston, MA",
                "skills": ["TypeScript", "Next.js", "Python", "FastAPI", "Docker"]
            },
            verification_status="unverified",
            source_type="manual",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        entry_edu = CareerEntry(
            id=uuid.uuid4(),
            user_id=candidate.id,
            entry_type="education",
            title="Bachelor of Science in Computer Science",
            organization="Northeastern University",
            start_date="2016-09",
            end_date="2020-05",
            is_current=False,
            data={
                "description": "Graduated Magna Cum Laude. Specialization in Distributed Systems.",
                "location": "Boston, MA"
            },
            verification_status="unverified",
            source_type="manual",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add_all([entry_work, entry_edu])
        await db.flush()

        # 5. Create Resume & Resume Version
        logger.info("Creating resume...")
        resume = Resume(
            id=uuid.uuid4(),
            user_id=candidate.id,
            title="Alex Mercer - Core Resume v1",
            content={
                "basics": {
                    "name": "Alex Mercer",
                    "label": "Senior Software Engineer",
                    "email": "alex.mercer@careeros.ai",
                    "phone": "+1 (555) 019-2834",
                    "summary": "Senior Software Engineer with 6+ years of experience specializing in React, Next.js, and high-performance Python backends.",
                },
                "work": [
                    {
                        "company": "SaaSify Inc.",
                        "position": "Senior Software Engineer",
                        "startDate": "2022-05",
                        "summary": "Led development of core microservices. Designed websocket synchronization protocol to support 10k concurrent users.",
                    }
                ],
                "skills": ["TypeScript", "Next.js", "Python", "FastAPI", "SQL", "Docker"],
            },
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(resume)
        await db.flush()

        resume_version = ResumeVersion(
            id=uuid.uuid4(),
            resume_id=resume.id,
            version_number=1,
            content_snapshot=resume.content,
            change_reason="Initial parsing validation and seed.",
            created_at=datetime.now(UTC),
        )
        db.add(resume_version)
        await db.flush()

        # 6. Create Job Description
        logger.info("Creating job description...")
        jd = JobDescription(
            id=uuid.uuid4(),
            user_id=candidate.id,
            title="Senior Full-Stack Developer",
            company="TechGrowth Solutions",
            raw_text="Looking for a Senior Full-Stack Developer with experience building scalable Next.js interfaces and FastAPI python backends. Experience with websocket optimization is highly preferred.",
            source_type="manual",
            parsed_requirements={"requirements": ["6+ years software experience", "TypeScript", "Next.js", "FastAPI", "Docker"]},
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(jd)
        await db.flush()

        # 7. Create ATS Analysis & Checks
        logger.info("Creating ATS analysis...")
        ats = ResumeAnalysis(
            id=uuid.uuid4(),
            resume_id=resume.id,
            user_id=candidate.id,
            job_description_id=jd.id,
            overall_score=85,
            ats_score=20,
            content_strength_score=18,
            jd_match_score=22,
            completeness_score=10,
            readability_score=9,
            grammar_score=4,
            evidence_credibility_score=8,
            resume_version=1,
            raw_score=83,
            raw_max_score=100,
            status="completed",
            analysis_version="ats-v1.0",
            created_at=datetime.now(UTC),
        )
        db.add(ats)
        await db.flush()

        check_1 = AnalysisCheck(
            id=uuid.uuid4(),
            analysis_id=ats.id,
            category="formatting",
            check_code="font-hierarchy",
            title="Font Sizes and Spacing",
            description="Clean font hierarchy and margins.",
            status="passed",
            points_possible=10,
            points_awarded=10,
            recommendation=None,
            evidence_data={"margin": "12mm", "fonts": ["Inter", "System"]},
        )
        check_2 = AnalysisCheck(
            id=uuid.uuid4(),
            analysis_id=ats.id,
            category="impact",
            check_code="quantifiable-impact",
            title="Quantifiable Impact",
            description="Some work experience bullet points lack metrics.",
            status="warning",
            points_possible=20,
            points_awarded=14,
            recommendation="Add specific numbers/percentages to express achievements.",
            evidence_data={"missing_metrics_count": 2},
        )
        db.add_all([check_1, check_2])
        await db.flush()

        # 8. Create Job Match Result
        logger.info("Creating job match result...")
        match_result = JobMatchResult(
            id=uuid.uuid4(),
            resume_id=resume.id,
            job_description_id=jd.id,
            resume_version=1,
            matching_version="jd-match-v1.0",
            overall_match_percentage=88,
            exact_keyword_matches=[{"keyword": "TypeScript"}, {"keyword": "Next.js"}],
            semantic_matches=[{"keyword": "FastAPI"}, {"keyword": "Docker"}],
            missing_keywords=[{"keyword": "Kubernetes"}],
            skill_gaps=[{"skill": "Kubernetes", "priority": "high"}],
            experience_gaps=[],
            matched_requirements=[{"req": "Next.js experience"}],
            missing_requirements=[{"req": "Kubernetes scaling"}],
            recommendations=["Add Go or Kubernetes to your target upskilling plan."],
            created_at=datetime.now(UTC),
        )
        db.add(match_result)
        await db.flush()

        # 9. Create AI Suggestions
        logger.info("Creating AI suggestion...")
        suggestion = AISuggestion(
            id=uuid.uuid4(),
            resume_id=resume.id,
            analysis_id=ats.id,
            job_description_id=jd.id,
            match_result_id=match_result.id,
            source_resume_version=1,
            suggestion_type="bullet_enhancement",
            target_section="work",
            target_entry_id="0",
            target_field="summary",
            target_index=0,
            original_text="Led development of core microservices. Designed websocket synchronization protocol to support 10k concurrent users.",
            suggested_text="Spearheaded microservices overhaul at SaaSify Inc., designing a customized WebSocket sync protocol that scaled system capacity to 10k concurrent connections and decreased delivery latency by 35%.",
            rationale="Quantifies impact and highlights technical leadership using powerful action verbs.",
            risk_level="low",
            claim_validation=[],
            expected_score_gain=12,
            provider_name="gemini",
            model_name="gemini-1.5-pro",
            status="applied",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(suggestion)
        await db.flush()

        # 10. Create Claims
        logger.info("Creating resume claims...")
        claim = ResumeClaim(
            id=uuid.uuid4(),
            resume_id=resume.id,
            claim_text="Designed websocket synchronization protocol to support 10k concurrent users.",
            claim_fingerprint="f39e382d61f1816e88226927a3c3065e8a719c8366a7b328a6f3bcf0719efcf2",
            source_section="work",
            source_entry_id="0",
            resume_version=1,
            claim_type="responsibility",
            normalized_value="Designed websocket sync protocol for 10k users",
            field_name="summary",
            bullet_index=0,
            original_text="Led development of core microservices. Designed websocket synchronization protocol to support 10k concurrent users.",
            verification_status="verified",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(claim)
        await db.flush()

        # 11. Create Evidence Source (Linked to the claim)
        logger.info("Creating evidence source...")
        evidence_src = EvidenceSource(
            id=uuid.uuid4(),
            resume_claim_id=claim.id,
            ai_suggestion_id=None,
            label="SaaSify WebSocket Synchronization Performance Report",
            source_type="career_profile_user_confirmed",
            source_id="saasify-perf-report-2025",
            source_section="work",
            source_entry_id="0",
            source_field="summary",
            excerpt="SaaSify websocket synchronization test logs show steady connection handling for 10,240 clients concurrently with 35% latency drop.",
            evidence_strength="direct",
            support_kind="factual_support",
            verification_status="source_verified",
            created_at=datetime.now(UTC),
        )
        db.add(evidence_src)
        await db.flush()

        # 12. Create Evidence Audit
        logger.info("Creating evidence audit...")
        audit = EvidenceAudit(
            id=uuid.uuid4(),
            resume_id=resume.id,
            resume_version=1,
            credibility_version="credibility-v1.0",
            evidence_state_fingerprint="state-fp-88226927a3c3065e8a719c8366a7b328a",
            overall_score=95,
            raw_score=9.5,
            raw_applicable_max=10.0,
            claim_support_score=9.5,
            internal_consistency_score=10.0,
            career_profile_score=9.5,
            high_risk_support_score=10.0,
            transparency_score=9.0,
            claim_count=1,
            contradiction_count=0,
            unsupported_count=0,
            status="completed",
            ai_fallback_active=False,
            summary="Strong factual alignment with confirmed enterprise reports.",
            created_at=datetime.now(UTC),
        )
        db.add(audit)
        await db.flush()

        # 13. Create Job Application
        logger.info("Creating application...")
        app = Application(
            id=uuid.uuid4(),
            user_id=candidate.id,
            resume_version_id=resume_version.id,
            job_description_id=jd.id,
            company="TechGrowth Solutions",
            role="Senior Full-Stack Developer",
            status="interviewing",
            salary_min=140000,
            salary_max=160000,
            currency="USD",
            location="Boston (Hybrid)",
            applied_at=datetime(2026, 7, 10, tzinfo=UTC),
            notes="Reached out via recruiter Sarah Jenkins. Excellent alignment with technical stack.",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(app)
        await db.flush()

        # 14. Create Interview
        logger.info("Creating interview...")
        interview = Interview(
            id=uuid.uuid4(),
            application_id=app.id,
            user_id=candidate.id,
            round_type="Technical Interview",
            scheduled_at=datetime(2026, 7, 20, 14, 0, tzinfo=UTC),
            duration_minutes=60,
            location="https://zoom.us/j/123456789",
            format="video",
            interviewer="Sarah Jenkins, John Doe",
            notes="Prepare to talk about Next.js and FastAPI architecture details.",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(interview)
        await db.flush()

        # 15. Create Cover Letter
        logger.info("Creating cover letter...")
        cover_letter = CoverLetter(
            id=uuid.uuid4(),
            user_id=candidate.id,
            application_id=app.id,
            resume_id=resume.id,
            job_description_id=jd.id,
            title="Cover Letter - TechGrowth Solutions",
            content="Dear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Full-Stack Developer role at TechGrowth Solutions. With over 6 years of experience building Next.js applications and FastAPI python backends, I am excited about the opportunity to optimize your services.\n\nAt SaaSify Inc., I designed a custom WebSocket sync protocol that scaled systems to 10k concurrent users. I look forward to bringing similar performance gains to your platform.\n\nSincerely,\nAlex Mercer",
            version=1,
            is_grounded=True,
            generation_metadata={"tone": "professional"},
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(cover_letter)
        await db.flush()

        # 16. Create LinkedIn Optimization
        logger.info("Creating LinkedIn optimization...")
        linkedin = LinkedInOptimization(
            id=uuid.uuid4(),
            user_id=candidate.id,
            resume_id=resume.id,
            original_profile={
                "headline": "Software Engineer at SaaSify",
                "about": "Full stack dev working with python and react.",
                "skills": ["Python", "React"]
            },
            optimized_profile={
                "headline": "Senior Full Stack Engineer | React & Next.js Expert | FastAPI & Python Backends",
                "about": "Senior Software Engineer passionate about crafting high-performance, real-time web applications. Proven track record of scaling microservices and websocket protocols to support 10k+ concurrent users."
            },
            optimization_score=92,
            recommendations={
                "checklist": [
                    {"rule": "headline-keywords", "title": "Add target skills to headline", "passed": True},
                    {"rule": "about-summary-length", "title": "Make your professional summary longer than 150 characters", "passed": True}
                ]
            },
            status="complete",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(linkedin)
        await db.flush()

        # 17. Create Portfolio Builder
        logger.info("Creating portfolio...")
        portfolio = Portfolio(
            id=uuid.uuid4(),
            user_id=candidate.id,
            theme="glassmorphism",
            config={
                "show_email": True,
                "show_phone": False,
                "color_palette": "slate",
            },
            content={
                "about": "Senior Full Stack Engineer focused on Next.js and FastAPI applications.",
                "skills": ["TypeScript", "Next.js", "Python", "FastAPI"],
                "projects": [
                    {"name": "WebSocket Sync Hub", "description": "Scaled websocket protocol to 10k connections."}
                ]
            },
            published_url="https://alexmercer.careeros.ai",
            status="ready",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(portfolio)
        await db.flush()

        # 18. Create Interview Prep Session
        logger.info("Creating interview session...")
        interview_session = InterviewSession(
            id=uuid.uuid4(),
            user_id=candidate.id,
            application_id=app.id,
            resume_id=resume.id,
            job_description_id=jd.id,
            question_bank={
                "items": [
                    {
                        "id": "q1",
                        "question": "Can you describe a time you scaled a real-time web application websocket server?",
                        "category": "technical",
                        "difficulty": "hard",
                    },
                    {
                        "id": "q2",
                        "question": "How do you handle conflict in engineering team roadmaps?",
                        "category": "behavioral",
                        "difficulty": "medium",
                    }
                ]
            },
            practice_log={
                "attempts": [
                    {
                        "question_id": "q1",
                        "user_answer": "At SaaSify, I replaced standard polling with WebSockets and added Redis backplane, scaling the node count to hold 10k connections with low latency.",
                        "score": 9,
                        "feedback": "Strong answer utilizing STAR method framework. Highlighting Redis backplane was excellent.",
                    }
                ]
            },
            focus_areas={
                "weaknesses": ["System Design diagramming", "Conflict resolution examples"]
            },
            overall_score=9.0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(interview_session)
        await db.flush()

        # 19. Create Career Roadmap
        logger.info("Creating roadmap...")
        roadmap = Roadmap(
            id=uuid.uuid4(),
            user_id=candidate.id,
            target_role="Software Architect",
            target_company="TechGrowth Solutions",
            current_skills={"skills": ["React", "Next.js", "FastAPI", "PostgreSQL"]},
            target_skills={"skills": ["Kubernetes", "GraphQL", "System Design", "AWS EKS"]},
            plan={
                "milestones": [
                    {
                        "id": "m1",
                        "title": "AWS Certified Solutions Architect",
                        "status": "in_progress",
                        "items": [
                            {"title": "Study AWS networking", "completed": True},
                            {"title": "Take mock exam", "completed": False}
                        ],
                    },
                    {
                        "id": "m2",
                        "title": "Learn Kubernetes Core concepts",
                        "status": "completed",
                        "items": [
                            {"title": "Deploy local cluster with KinD", "completed": True},
                            {"title": "Understand pods, services, and ingresses", "completed": True}
                        ],
                    }
                ]
            },
            progress={
                "completed_milestones": 1,
                "total_milestones": 2,
                "percentage": 50
            },
            status="active",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(roadmap)
        await db.flush()

        # 20. Create Notifications
        logger.info("Creating notifications...")
        notif_1 = Notification(
            id=uuid.uuid4(),
            user_id=candidate.id,
            title="Interview Invitation",
            body="Your Technical Interview round with TechGrowth Solutions has been scheduled for July 20th.",
            type="reminder",
            metadata_json={"application_id": str(app.id)},
            is_read=False,
            created_at=datetime.now(UTC),
        )
        notif_2 = Notification(
            id=uuid.uuid4(),
            user_id=candidate.id,
            title="Claim Verified",
            body="Your SaaSify Inc. work claim has been successfully verified by our Credibility Engine.",
            type="success",
            metadata_json={"claim_id": str(claim.id)},
            is_read=True,
            created_at=datetime.now(UTC),
        )
        db.add_all([notif_1, notif_2])
        await db.flush()

        # 21. Create Analytics Snapshot
        logger.info("Creating analytics snapshot...")
        analytics = AnalyticsSnapshot(
            id=uuid.uuid4(),
            user_id=candidate.id,
            snapshot_date=datetime.now(UTC).date(),
            metrics={
                "total_resumes": 1,
                "ats_average_score": 85,
                "jd_matches_count": 1,
                "applications_count": {
                    "applied": 0,
                    "interviewing": 1,
                    "offered": 0,
                    "rejected": 0,
                },
                "profile_completeness": 90,
                "verifications_ratio": 1.0,
            },
            created_at=datetime.now(UTC),
        )
        db.add(analytics)

        await db.commit()
        logger.info("Demo seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
