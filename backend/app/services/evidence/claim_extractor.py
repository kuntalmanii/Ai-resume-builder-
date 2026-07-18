"""Evidence Claim Extractor Service."""

import asyncio
import hashlib
import re
import uuid
from typing import Any, cast

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.gemini_provider import GeminiProvider
from app.core.exceptions import ResourceNotFoundError
from app.db.models.resume import Resume
from app.db.models.resume_claim import ResumeClaim


class LLMResumeClaim(BaseModel):
    claim_text: str = Field(..., description="The factual atomic claim made in the resume")
    source_section: str = Field(
        ..., description="Section of the resume (e.g., experience, education, summary, projects)"
    )
    source_entry_id: str | None = Field(
        None,
        description="Optional ID of the entry (e.g. specific job "
        "experience ID) if provided in the input text",
    )
    claim_type: str = Field(
        ...,
        description="Type: metric, technology, scope, "
        "responsibility, role, certification, education",
    )


class LLMClaimExtractionOutput(BaseModel):
    claims: list[LLMResumeClaim] = Field(
        default_factory=list, description="List of atomic claims extracted from the resume content"
    )


class ClaimExtractorService:
    @staticmethod
    def normalize_value(val_str: str, claim_type: str) -> str:
        """Helper to normalize a claim value to its factual identity."""
        if not val_str:
            return ""
        val_lower = " ".join(val_str.lower().split())
        if claim_type == "employer":
            # Strip common suffixes (LLC, Inc., Corp., Co., etc.)
            val_lower = re.sub(
                r"\b(llc|inc|ltd|limited|corp|corporation|co|company)\b", "", val_lower
            )
            val_lower = re.sub(r"[^\w\s]", "", val_lower)
            return " ".join(val_lower.split())
        elif claim_type == "role":
            # SWE, SDE, Software Engineer equivalences
            val_lower = val_lower.replace("software development engineer", "software engineer")
            val_lower = val_lower.replace("sde", "software engineer")
            val_lower = val_lower.replace("swe", "software engineer")
            val_lower = re.sub(r"[^\w\s]", "", val_lower)
            return " ".join(val_lower.split())
        elif claim_type == "date":
            # Standardize spacing/punctuation for date matching
            val_lower = re.sub(r"[^\w\s]", " ", val_lower)
            return " ".join(val_lower.split())
        else:
            return val_lower

    @classmethod
    def _generate_fingerprint(
        cls, claim_type: str, normalized_val: str, source_section: str, source_entry_id: str | None
    ) -> str:
        """Generate a deterministic SHA-256 hash for a claim based on normalized factual
        identity."""
        entry_id_norm = source_entry_id or ""
        data = f"{claim_type}:{normalized_val}:{source_section}:{entry_id_norm}".encode()
        return hashlib.sha256(data).hexdigest()

    @classmethod
    def deterministic_extract_claims(cls, content: dict[str, Any]) -> list[dict[str, Any]]:
        """Deterministically extract common factual claims without relying on LLM."""
        claims: list[dict[str, Any]] = []

        # 1. Professional Summary / Summary
        summary = content.get("professional_summary") or content.get("summary")
        if summary and isinstance(summary, str):
            years_match = re.search(r"(\d+)\+?\s*years?", summary, re.IGNORECASE)
            if years_match:
                val = years_match.group(0)
                claims.append(
                    {
                        "claim_text": f"Has {val} of experience",
                        "claim_type": "metric",
                        "normalized_value": f"{years_match.group(1)} years",
                        "source_section": "professional_summary",
                        "source_entry_id": None,
                        "field_name": "professional_summary",
                        "bullet_index": None,
                        "original_text": summary,
                    }
                )

            claims.append(
                {
                    "claim_text": summary[:150],
                    "claim_type": "responsibility",
                    "normalized_value": cls.normalize_value(summary[:150], "responsibility"),
                    "source_section": "professional_summary",
                    "source_entry_id": None,
                    "field_name": "professional_summary",
                    "bullet_index": None,
                    "original_text": summary,
                }
            )

        # 2. Experience
        for exp in content.get("experience", []):
            if not isinstance(exp, dict):
                continue
            entry_id = str(exp.get("id") or "")
            company = exp.get("company")
            title = exp.get("position") or exp.get("title")
            start_date = exp.get("start_date")
            end_date = exp.get("end_date")
            is_current = exp.get("is_current") or False
            bullets = exp.get("bullets", [])
            technologies = exp.get("technologies", [])

            if company:
                claims.append(
                    {
                        "claim_text": f"Worked at {company}",
                        "claim_type": "employer",
                        "normalized_value": cls.normalize_value(company, "employer"),
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "company",
                        "bullet_index": None,
                        "original_text": company,
                    }
                )
            if title:
                claims.append(
                    {
                        "claim_text": f"Held role: {title}",
                        "claim_type": "role",
                        "normalized_value": cls.normalize_value(title, "role"),
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "title",
                        "bullet_index": None,
                        "original_text": title,
                    }
                )
            if start_date:
                claims.append(
                    {
                        "claim_text": f"Started role on {start_date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(start_date, "date"),
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "start_date",
                        "bullet_index": None,
                        "original_text": start_date,
                    }
                )
            if end_date:
                claims.append(
                    {
                        "claim_text": f"Ended role on {end_date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(end_date, "date"),
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "end_date",
                        "bullet_index": None,
                        "original_text": end_date,
                    }
                )
            if is_current:
                claims.append(
                    {
                        "claim_text": "Role is currently active",
                        "claim_type": "role",
                        "normalized_value": "current",
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "is_current",
                        "bullet_index": None,
                        "original_text": "true",
                    }
                )

            for s in technologies:
                claims.append(
                    {
                        "claim_text": f"Used technology: {s}",
                        "claim_type": "technology",
                        "normalized_value": cls.normalize_value(s, "technology"),
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "technologies",
                        "bullet_index": None,
                        "original_text": s,
                    }
                )

            for i, b in enumerate(bullets):
                if not isinstance(b, str):
                    continue
                claims.append(
                    {
                        "claim_text": b,
                        "claim_type": "responsibility",
                        "normalized_value": cls.normalize_value(b, "responsibility"),
                        "source_section": "experience",
                        "source_entry_id": entry_id,
                        "field_name": "bullets",
                        "bullet_index": i,
                        "original_text": b,
                    }
                )
                # Check for percentages
                pct_matches = re.findall(r"(\d+(?:\.\d+)?%)", b)
                for m in pct_matches:
                    claims.append(
                        {
                            "claim_text": f"Achieved metric: {m} improvement",
                            "claim_type": "metric",
                            "normalized_value": cls.normalize_value(m, "metric"),
                            "source_section": "experience",
                            "source_entry_id": entry_id,
                            "field_name": "bullets",
                            "bullet_index": i,
                            "original_text": b,
                        }
                    )
                # Check for currency
                cur_matches = re.findall(
                    r"(\$[0-9,]+[KkMmBbtT]?|\d+\s*(?:USD|INR|EUR|GBP|dollars))", b
                )
                for m in cur_matches:
                    claims.append(
                        {
                            "claim_text": f"Financial scope/achievement: {m}",
                            "claim_type": "metric",
                            "normalized_value": cls.normalize_value(m, "metric"),
                            "source_section": "experience",
                            "source_entry_id": entry_id,
                            "field_name": "bullets",
                            "bullet_index": i,
                            "original_text": b,
                        }
                    )
                # Check for leadership
                if re.search(
                    r"\b(led|lead|managed|supervised|directed|headed|coordinated|built|drove)\b",
                    b,
                    re.IGNORECASE,
                ):
                    claims.append(
                        {
                            "claim_text": "Demonstrated leadership responsibility",
                            "claim_type": "responsibility",
                            "normalized_value": "leadership",
                            "source_section": "experience",
                            "source_entry_id": entry_id,
                            "field_name": "bullets",
                            "bullet_index": i,
                            "original_text": b,
                        }
                    )

        # 3. Projects
        for proj in content.get("projects", []):
            if not isinstance(proj, dict):
                continue
            entry_id = str(proj.get("id") or "")
            name = proj.get("name") or proj.get("title")
            bullets = proj.get("bullets", [])
            start_date = proj.get("start_date")
            end_date = proj.get("end_date")
            technologies = proj.get("technologies", [])

            if name:
                claims.append(
                    {
                        "claim_text": f"Developed project: {name}",
                        "claim_type": "project",
                        "normalized_value": cls.normalize_value(name, "project"),
                        "source_section": "projects",
                        "source_entry_id": entry_id,
                        "field_name": "name",
                        "bullet_index": None,
                        "original_text": name,
                    }
                )
            if start_date:
                claims.append(
                    {
                        "claim_text": f"Started project on {start_date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(start_date, "date"),
                        "source_section": "projects",
                        "source_entry_id": entry_id,
                        "field_name": "start_date",
                        "bullet_index": None,
                        "original_text": start_date,
                    }
                )
            if end_date:
                claims.append(
                    {
                        "claim_text": f"Ended project on {end_date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(end_date, "date"),
                        "source_section": "projects",
                        "source_entry_id": entry_id,
                        "field_name": "end_date",
                        "bullet_index": None,
                        "original_text": end_date,
                    }
                )
            for s in technologies:
                claims.append(
                    {
                        "claim_text": f"Used project technology: {s}",
                        "claim_type": "technology",
                        "normalized_value": cls.normalize_value(s, "technology"),
                        "source_section": "projects",
                        "source_entry_id": entry_id,
                        "field_name": "technologies",
                        "bullet_index": None,
                        "original_text": s,
                    }
                )
            for i, b in enumerate(bullets):
                if not isinstance(b, str):
                    continue
                claims.append(
                    {
                        "claim_text": b,
                        "claim_type": "responsibility",
                        "normalized_value": cls.normalize_value(b, "responsibility"),
                        "source_section": "projects",
                        "source_entry_id": entry_id,
                        "field_name": "bullets",
                        "bullet_index": i,
                        "original_text": b,
                    }
                )
                # Check for percentages
                pct_matches = re.findall(r"(\d+(?:\.\d+)?%)", b)
                for m in pct_matches:
                    claims.append(
                        {
                            "claim_text": f"Project metric: {m}",
                            "claim_type": "metric",
                            "normalized_value": cls.normalize_value(m, "metric"),
                            "source_section": "projects",
                            "source_entry_id": entry_id,
                            "field_name": "bullets",
                            "bullet_index": i,
                            "original_text": b,
                        }
                    )

        # 4. Education
        for edu in content.get("education", []):
            if not isinstance(edu, dict):
                continue
            entry_id = str(edu.get("id") or "")
            inst = edu.get("institution") or edu.get("school")
            deg = edu.get("degree")
            gpa = edu.get("gpa") or edu.get("grade")
            start_date = edu.get("start_date")
            end_date = edu.get("end_date")

            if inst:
                claims.append(
                    {
                        "claim_text": f"Studied at {inst}",
                        "claim_type": "education",
                        "normalized_value": cls.normalize_value(inst, "education"),
                        "source_section": "education",
                        "source_entry_id": entry_id,
                        "field_name": "institution",
                        "bullet_index": None,
                        "original_text": inst,
                    }
                )
            if deg:
                claims.append(
                    {
                        "claim_text": f"Obtained degree: {deg}",
                        "claim_type": "education",
                        "normalized_value": cls.normalize_value(deg, "education"),
                        "source_section": "education",
                        "source_entry_id": entry_id,
                        "field_name": "degree",
                        "bullet_index": None,
                        "original_text": deg,
                    }
                )
            if gpa:
                claims.append(
                    {
                        "claim_text": f"Earned GPA: {gpa}",
                        "claim_type": "education",
                        "normalized_value": cls.normalize_value(gpa, "education"),
                        "source_section": "education",
                        "source_entry_id": entry_id,
                        "field_name": "gpa",
                        "bullet_index": None,
                        "original_text": gpa,
                    }
                )
            if start_date:
                claims.append(
                    {
                        "claim_text": f"Enrolled education on {start_date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(start_date, "date"),
                        "source_section": "education",
                        "source_entry_id": entry_id,
                        "field_name": "start_date",
                        "bullet_index": None,
                        "original_text": start_date,
                    }
                )
            if end_date:
                claims.append(
                    {
                        "claim_text": f"Graduated education on {end_date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(end_date, "date"),
                        "source_section": "education",
                        "source_entry_id": entry_id,
                        "field_name": "end_date",
                        "bullet_index": None,
                        "original_text": end_date,
                    }
                )

        # 5. Skills
        skills_data = content.get("skills", [])
        if isinstance(skills_data, list):
            for grp in skills_data:
                if not isinstance(grp, dict):
                    continue
                entry_id = str(grp.get("id") or "")
                items = grp.get("skills", [])
                for s in items:
                    if not isinstance(s, str):
                        continue
                    claims.append(
                        {
                            "claim_text": f"Skilled in {s}",
                            "claim_type": "technology",
                            "normalized_value": cls.normalize_value(s, "technology"),
                            "source_section": "skills",
                            "source_entry_id": entry_id,
                            "field_name": "skills",
                            "bullet_index": None,
                            "original_text": s,
                        }
                    )
        elif isinstance(skills_data, dict):
            for category, items in skills_data.items():
                if isinstance(items, list):
                    for s in items:
                        if not isinstance(s, str):
                            continue
                        claims.append(
                            {
                                "claim_text": f"Skilled in {s}",
                                "claim_type": "technology",
                                "normalized_value": cls.normalize_value(s, "technology"),
                                "source_section": "skills",
                                "source_entry_id": None,
                                "field_name": "skills",
                                "bullet_index": None,
                                "original_text": s,
                            }
                        )

        # 6. Certifications
        for cert in content.get("certifications", []):
            if not isinstance(cert, dict):
                continue
            entry_id = str(cert.get("id") or "")
            name = cert.get("name")
            issuer = cert.get("issuer")
            date = cert.get("issue_date") or cert.get("date")

            if name:
                claims.append(
                    {
                        "claim_text": f"Certified in {name}",
                        "claim_type": "certification",
                        "normalized_value": cls.normalize_value(name, "certification"),
                        "source_section": "certifications",
                        "source_entry_id": entry_id,
                        "field_name": "name",
                        "bullet_index": None,
                        "original_text": name,
                    }
                )
            if issuer:
                claims.append(
                    {
                        "claim_text": f"Certification issued by {issuer}",
                        "claim_type": "certification",
                        "normalized_value": cls.normalize_value(issuer, "certification"),
                        "source_section": "certifications",
                        "source_entry_id": entry_id,
                        "field_name": "issuer",
                        "bullet_index": None,
                        "original_text": issuer,
                    }
                )
            if date:
                claims.append(
                    {
                        "claim_text": f"Certified on {date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(date, "date"),
                        "source_section": "certifications",
                        "source_entry_id": entry_id,
                        "field_name": "issue_date",
                        "bullet_index": None,
                        "original_text": date,
                    }
                )

        # 7. Achievements
        for ach in content.get("achievements", []):
            if not isinstance(ach, dict):
                continue
            entry_id = str(ach.get("id") or "")
            title = ach.get("title")
            desc = ach.get("description")
            date = ach.get("date")

            if title:
                claims.append(
                    {
                        "claim_text": f"Achieved: {title}",
                        "claim_type": "responsibility",
                        "normalized_value": cls.normalize_value(title, "responsibility"),
                        "source_section": "achievements",
                        "source_entry_id": entry_id,
                        "field_name": "title",
                        "bullet_index": None,
                        "original_text": title,
                    }
                )
            if desc:
                claims.append(
                    {
                        "claim_text": desc,
                        "claim_type": "responsibility",
                        "normalized_value": cls.normalize_value(desc, "responsibility"),
                        "source_section": "achievements",
                        "source_entry_id": entry_id,
                        "field_name": "description",
                        "bullet_index": i,
                        "original_text": desc,
                    }
                )
            if date:
                claims.append(
                    {
                        "claim_text": f"Achieved on date: {date}",
                        "claim_type": "date",
                        "normalized_value": cls.normalize_value(date, "date"),
                        "source_section": "achievements",
                        "source_entry_id": entry_id,
                        "field_name": "date",
                        "bullet_index": None,
                        "original_text": date,
                    }
                )

        return claims

    @classmethod
    def _format_resume_for_extraction(cls, content: dict[str, Any]) -> str:
        """Format the resume content into a text representation that includes IDs for
        traceability."""
        lines = []

        summary = content.get("professional_summary") or content.get("summary")
        if summary:
            lines.append("Section: professional_summary")
            lines.append(f"Content: {summary}\n")

        for exp in content.get("experience", []):
            lines.append(f"Section: experience | Entry ID: {exp.get('id')}")
            lines.append(f"Role: {exp.get('title')} at {exp.get('company')}")
            for b in exp.get("bullets", []):
                lines.append(f"- {b}")
            lines.append("")

        for proj in content.get("projects", []):
            lines.append(f"Section: projects | Entry ID: {proj.get('id')}")
            lines.append(f"Project: {proj.get('name')}")
            for b in proj.get("bullets", []):
                lines.append(f"- {b}")
            lines.append("")

        for edu in content.get("education", []):
            lines.append(f"Section: education | Entry ID: {edu.get('id')}")
            lines.append(
                f"Degree: {edu.get('degree')} at {edu.get('institution')} "
                f"- GPA: {edu.get('gpa', 'N/A')}"
            )
            lines.append("")

        return "\n".join(lines)

    @classmethod
    async def extract_claims_for_resume(
        cls, db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[list[ResumeClaim], bool]:
        """
        Extract claims from a user's resume using deterministic parsing,
        optionally enhanced by LLM, and persist them. Returns (all_claims, ai_fallback_active).
        """
        # 1. Fetch Resume
        resume = await db.get(Resume, resume_id)
        if not resume or resume.user_id != user_id:
            raise ResourceNotFoundError("Resume not found")

        content = resume.content or {}

        # Deterministic extraction (always runs)
        det_claims = cls.deterministic_extract_claims(content)

        # Optional AI extraction (Gemini)
        ai_claims = []
        ai_fallback_active = False

        content_text = cls._format_resume_for_extraction(content)
        if content_text.strip():
            try:
                # Exclude full contact PII context by removing phone, location, linkedin
                # from summary context
                # and keeping strictly formatted content
                provider = GeminiProvider()

                # Check health first
                is_healthy = await provider.health_check()
                if not is_healthy:
                    ai_fallback_active = True
                else:
                    system_prompt = (
                        "You are an expert factual auditor. Your task is to "
                        "extract atomic, factual claims from a resume document.\n"
                        "An atomic claim is a single testable assertion, such as a specific "
                        "metric achieved, a tool used, a specific responsibility, "
                        "or an educational degree obtained.\n\n"
                        "CRITICAL INSTRUCTIONS:\n"
                        "1. Extract ONLY facts present in the text. Do "
                        "not hallucinate or infer missing details.\n"
                        "2. Ensure each claim is atomic.\n"
                        "3. Ignore subjective or purely qualitative statements.\n"
                        "4. Exclude personal contact PII like phone "
                        "numbers, exact email addresses, or street names."
                    )
                    user_prompt = (
                        f"Resume Content:\n{content_text}\n\nExtract all atomic factual claims."
                    )

                    # Run Gemini completion with a 15 second timeout wrapper
                    async def fetch_llm() -> LLMClaimExtractionOutput:
                        return cast(
                            LLMClaimExtractionOutput,
                            await provider.complete(
                                prompt=user_prompt,
                                system_prompt=system_prompt,
                                response_schema=LLMClaimExtractionOutput,
                                temperature=0.0,
                            ),
                        )

                    output = await asyncio.wait_for(fetch_llm(), timeout=15.0)
                    if isinstance(output, LLMClaimExtractionOutput):
                        for c in output.claims:
                            # Map to internal claim format
                            ai_claims.append(
                                {
                                    "claim_text": c.claim_text,
                                    "claim_type": c.claim_type,
                                    "normalized_value": cls.normalize_value(
                                        c.claim_text, c.claim_type
                                    ),
                                    "source_section": c.source_section,
                                    "source_entry_id": c.source_entry_id,
                                    "field_name": "bullets"
                                    if c.source_section in ["experience", "projects"]
                                    else c.source_section,
                                    "bullet_index": None,
                                    "original_text": c.claim_text,
                                }
                            )
            except Exception:
                ai_fallback_active = True

        # Combine claims
        all_raw_claims = det_claims + ai_claims

        # Deduplicate combined claims based on fingerprint
        # Fetch existing claims to avoid duplicate DB insertions
        existing_stmt = select(ResumeClaim).where(ResumeClaim.resume_id == resume_id)
        existing_claims_res = await db.scalars(existing_stmt)
        existing_claims = list(existing_claims_res)
        existing_fingerprints = {c.claim_fingerprint for c in existing_claims}

        new_claims = []
        for rc in all_raw_claims:
            claim_type = rc["claim_type"]
            normalized_val = rc["normalized_value"]
            section = rc["source_section"]
            entry_id = rc["source_entry_id"]

            fingerprint = cls._generate_fingerprint(claim_type, normalized_val, section, entry_id)
            if fingerprint not in existing_fingerprints:
                claim = ResumeClaim(
                    resume_id=resume_id,
                    claim_text=rc["claim_text"],
                    claim_fingerprint=fingerprint,
                    source_section=section,
                    source_entry_id=entry_id,
                    resume_version=resume.version,
                    claim_type=claim_type,
                    normalized_value=normalized_val,
                    field_name=rc["field_name"],
                    bullet_index=rc["bullet_index"],
                    original_text=rc["original_text"],
                    verification_status="unverified",
                )
                db.add(claim)
                new_claims.append(claim)
                existing_fingerprints.add(fingerprint)

        if new_claims:
            await db.commit()

        # Fetch all claims for this resume (latest active state)
        all_stmt = select(ResumeClaim).where(ResumeClaim.resume_id == resume_id)
        all_res = await db.scalars(all_stmt)

        return list(all_res), ai_fallback_active
