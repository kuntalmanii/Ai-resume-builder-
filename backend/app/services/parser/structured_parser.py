"""Structured resume parsing service containing deterministic and AI-assisted layers."""
import re
import logging
from typing import Tuple, Dict, Any, List

from app.schemas.resume import (
    ResumeDocument,
    PersonalInformation,
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    SkillGroup,
    CertificationEntry,
    AchievementEntry,
    PositionOfResponsibilityEntry,
    LanguageEntry,
    InterestEntry,
)
from app.services.parser.section_detector import segment_text_by_sections
from app.ai.factory import get_ai_provider
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Regular Expressions for Deterministic Extraction
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}')
URL_REGEX = re.compile(r'https?://[^\s/$.?#].[^\s]*')
DATE_RANGE_REGEX = re.compile(
    r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-.\s]?\d{4}|\d{4})\s*[-–—to\s]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-.\s]?\d{4}|\d{4}|Present|Current)\b',
    re.IGNORECASE
)
BULLET_PREFIXES = ('•', '-', '*', 'o', '▪', '◦', '■')


def extract_contact_info(text: str) -> Dict[str, str]:
    """Deterministically extract contact details from text using Regex."""
    emails = EMAIL_REGEX.findall(text)
    phones = PHONE_REGEX.findall(text)
    urls = URL_REGEX.findall(text)

    email = emails[0] if emails else ""
    phone = phones[0] if phones else ""

    linkedin = ""
    github = ""
    portfolio = ""

    for url in urls:
        url_lower = url.lower()
        if "linkedin.com" in url_lower and not linkedin:
            linkedin = url
        elif "github.com" in url_lower and not github:
            github = url
        elif not portfolio:
            portfolio = url

    return {
        "email": email,
        "phone": phone,
        "linkedin_url": linkedin,
        "github_url": github,
        "portfolio_url": portfolio
    }


def parse_deterministic_fallback(text: str, segments: Dict[str, List[str]]) -> Tuple[ResumeDocument, List[str], Dict[str, float]]:
    """Deterministic parser layer (Layer 1) to build a partial ResumeDocument when AI is unavailable."""
    warnings = ["AI parser was unavailable or failed. Downgraded to rule-based fallback parser."]
    
    # 1. Personal Info
    contact = extract_contact_info(text)
    personal_lines = segments.get("personal_information", [])
    
    # Candidate name is usually the first non-empty line
    name = ""
    for line in personal_lines:
        cleaned = line.strip()
        # Ensure it's not contact info
        if cleaned and "@" not in cleaned and not any(kw in cleaned.lower() for kw in ["linkedin", "github", "http"]):
            name = cleaned
            break

    # Title is usually the next short line
    title = ""
    for line in personal_lines:
        cleaned = line.strip()
        if cleaned and cleaned != name and len(cleaned) < 50 and "@" not in cleaned and not any(kw in cleaned.lower() for kw in ["linkedin", "github", "http"]):
            title = cleaned
            break

    # Location heuristic (lines containing state abbreviations or zipcodes/cities)
    location = ""
    for line in personal_lines:
        cleaned = line.strip()
        if cleaned and cleaned != name and cleaned != title:
            if re.search(r'\b[A-Z]{2}\b|\b\d{5}\b', cleaned) or any(k in cleaned.lower() for k in ["city", "street", "road", "state", "country"]):
                location = cleaned
                break

    personal = PersonalInformation(
        full_name=name,
        email=contact["email"],
        phone=contact["phone"],
        location=location,
        professional_title=title,
        linkedin_url=contact["linkedin_url"],
        github_url=contact["github_url"],
        portfolio_url=contact["portfolio_url"],
    )

    # 2. Professional Summary
    summary = "\n".join(segments.get("professional_summary", []))

    # 3. Education Heuristic
    education = []
    edu_lines = segments.get("education", [])
    current_edu = None
    
    for line in edu_lines:
        line_clean = line.strip()
        # Look for institution keywords
        inst_match = any(kw in line_clean.lower() for kw in ["university", "college", "school", "institute", "academy"])
        # Look for degree keywords
        deg_match = any(kw in line_clean.lower() for kw in ["bachelor", "master", "phd", "b.s", "m.s", "b.tech", "m.tech", "degree", "diploma", "associate"])
        
        date_range = DATE_RANGE_REGEX.search(line_clean)
        
        if inst_match or deg_match or date_range:
            if current_edu:
                education.append(current_edu)
            
            inst = line_clean if inst_match else ""
            deg = line_clean if deg_match else "Degree"
            start_d, end_d = "", ""
            if date_range:
                start_d, end_d = date_range.groups()
                
            current_edu = EducationEntry(
                institution=inst or "Unknown Institution",
                degree=deg,
                start_date=start_d,
                end_date=end_d,
                is_current=(end_d.lower() in ["present", "current"]),
                order=len(education) + 1
            )
        elif current_edu:
            # Append description/details
            if current_edu.description:
                current_edu.description += "\n" + line_clean
            else:
                current_edu.description = line_clean

    if current_edu:
        education.append(current_edu)

    # 4. Experience Heuristic
    experience = []
    exp_lines = segments.get("experience", [])
    current_job = None

    for line in exp_lines:
        line_clean = line.strip()
        date_range = DATE_RANGE_REGEX.search(line_clean)
        is_bullet = line_clean.startswith(BULLET_PREFIXES)

        if not is_bullet and (date_range or any(kw in line_clean.lower() for kw in ["engineer", "developer", "manager", "lead", "analyst", "intern", "associate", "consultant"])):
            if current_job:
                experience.append(current_job)
                
            start_d, end_d = "", ""
            if date_range:
                start_d, end_d = date_range.groups()

            # Clean job title/company candidate
            parts = [p.strip() for p in re.split(r'[-–—|@,]', line_clean) if p.strip()]
            pos = parts[0] if parts else "Employee"
            comp = parts[1] if len(parts) > 1 else "Company"

            current_job = ExperienceEntry(
                company=comp,
                position=pos,
                start_date=start_d,
                end_date=end_d,
                is_current=(end_d.lower() in ["present", "current"]),
                order=len(experience) + 1
            )
        elif is_bullet and current_job:
            bullet_text = re.sub(r'^[\s\*\-•▪◦o■]+', '', line_clean).strip()
            current_job.bullets.append(bullet_text)
        elif current_job:
            # Just some additional text, maybe description or tech stack
            if "technologies" in line_clean.lower() or "skills" in line_clean.lower():
                techs = [t.strip() for t in re.split(r'[,|/]', re.sub(r'(?i)technologies:|skills:', '', line_clean)) if t.strip()]
                current_job.technologies.extend(techs)

    if current_job:
        experience.append(current_job)

    # 5. Skills Heuristic
    skills = []
    skills_lines = segments.get("skills", [])
    all_skills = []
    for line in skills_lines:
        line_clean = line.strip()
        if line_clean.startswith(BULLET_PREFIXES):
            line_clean = re.sub(r'^[\s\*\-•▪◦o■]+', '', line_clean).strip()
        # Split by comma or semicolon
        items = [s.strip() for s in re.split(r'[,;]', line_clean) if s.strip()]
        all_skills.extend(items)
        
    if all_skills:
        skills.append(SkillGroup(category="Skills", skills=all_skills, order=1))

    # 6. Projects Heuristic
    projects = []
    proj_lines = segments.get("projects", [])
    current_proj = None

    for line in proj_lines:
        line_clean = line.strip()
        is_bullet = line_clean.startswith(BULLET_PREFIXES)
        date_range = DATE_RANGE_REGEX.search(line_clean)

        if not is_bullet and (date_range or len(line_clean) < 40):
            if current_proj:
                projects.append(current_proj)
            start_d, end_d = "", ""
            if date_range:
                start_d, end_d = date_range.groups()
            current_proj = ProjectEntry(
                name=re.sub(r'https?://[^\s]+', '', line_clean).strip() or "Project",
                start_date=start_d,
                end_date=end_d,
                order=len(projects) + 1
            )
        elif is_bullet and current_proj:
            bullet_text = re.sub(r'^[\s\*\-•▪◦o■]+', '', line_clean).strip()
            current_proj.bullets.append(bullet_text)

    if current_proj:
        projects.append(current_proj)

    # 7. Other simple sections
    certifications = []
    for line in segments.get("certifications", []):
        line_clean = line.strip()
        if line_clean:
            certifications.append(CertificationEntry(name=line_clean, order=len(certifications) + 1))

    achievements = []
    for line in segments.get("achievements", []):
        line_clean = line.strip()
        if line_clean:
            achievements.append(AchievementEntry(title=line_clean, order=len(achievements) + 1))

    positions = []
    for line in segments.get("positions_of_responsibility", []):
        line_clean = line.strip()
        if line_clean:
            positions.append(PositionOfResponsibilityEntry(
                organization="Organization",
                position=line_clean,
                order=len(positions) + 1
            ))

    languages = []
    for line in segments.get("languages", []):
        line_clean = line.strip()
        if line_clean:
            languages.append(LanguageEntry(language=line_clean, order=len(languages) + 1))

    interests = []
    for line in segments.get("interests", []):
        line_clean = line.strip()
        if line_clean:
            interests.append(InterestEntry(name=line_clean, order=len(interests) + 1))

    doc = ResumeDocument(
        personal_information=personal,
        professional_summary=summary,
        education=education,
        experience=experience,
        projects=projects,
        skills=skills,
        certifications=certifications,
        achievements=achievements,
        positions_of_responsibility=positions,
        languages=languages,
        interests=interests,
        section_order=[
            "personal_information",
            "professional_summary",
            "education",
            "experience",
            "projects",
            "skills",
            "certifications",
            "achievements",
            "positions_of_responsibility",
            "languages",
            "interests",
        ]
    )

    confidence = {
        "personal_information": 0.85,
        "professional_summary": 0.70,
        "education": 0.50,
        "experience": 0.50,
        "projects": 0.45,
        "skills": 0.60,
        "certifications": 0.40,
        "achievements": 0.40,
        "positions_of_responsibility": 0.40,
        "languages": 0.50,
        "interests": 0.50,
    }

    return doc, warnings, confidence


async def parse_resume_text(text: str) -> Tuple[ResumeDocument, List[str], Dict[str, float]]:
    """Parse text using two layers (AI first, fallback to deterministic regex/rules).

    Returns:
        Tuple[ResumeDocument, List[str], Dict[str, float]]: (document, warnings, confidence_scores)
    """
    segments = segment_text_by_sections(text)
    
    # Check if AI provider settings are available
    settings = get_settings()
    has_ai = settings.AI_PROVIDER and settings.AI_API_KEY and settings.AI_API_KEY != "your-ai-api-key-here"

    if has_ai:
        try:
            provider = get_ai_provider()
            prompt = (
                "You are a professional resume parser. Segment and map the provided resume text into a structured JSON "
                "schema matching the ResumeDocument structure.\n"
                "Rules:\n"
                "1. NEVER fabricate or hallucinate any facts. Only extract what is present in the text.\n"
                "2. Do not enhance phrasing or add achievements.\n"
                "3. If any field like start_date, degree, company is missing, set it to empty string or null. Do not guess.\n"
                "4. Make sure to populate the `section_order` list with keys that represent sections present in the resume.\n\n"
                f"Resume text to parse:\n{text}"
            )
            
            result: ResumeDocument = await provider.complete(
                prompt=prompt,
                system_prompt=(
                    "You are a precise, deterministic resume data parser. Extract structured entities (education, "
                    "experience, projects, skills) and map them accurately. Never invent certifications, credentials, "
                    "or bullet points. Be faithful to the source text."
                ),
                response_schema=ResumeDocument,
            )

            # Verification of personal details using local regex
            # (Just in case the LLM misses basic contact info, we merge local regex results)
            contact = extract_contact_info(text)
            if not result.personal_information.email and contact["email"]:
                result.personal_information.email = contact["email"]
            if not result.personal_information.phone and contact["phone"]:
                result.personal_information.phone = contact["phone"]
            if not result.personal_information.linkedin_url and contact["linkedin_url"]:
                result.personal_information.linkedin_url = contact["linkedin_url"]
            if not result.personal_information.github_url and contact["github_url"]:
                result.personal_information.github_url = contact["github_url"]
            if not result.personal_information.portfolio_url and contact["portfolio_url"]:
                result.personal_information.portfolio_url = contact["portfolio_url"]

            # Calculate rule-based confidence for AI parse (90% basic confidence, 95% if contact details found)
            confidence = {}
            for field in ResumeDocument.model_fields.keys():
                val = getattr(result, field)
                if field == "personal_information":
                    has_contact = val.email or val.phone
                    confidence[field] = 0.95 if has_contact else 0.85
                elif isinstance(val, list):
                    confidence[field] = 0.90 if len(val) > 0 else 0.80
                else:
                    confidence[field] = 0.90 if val else 0.80

            return result, [], confidence

        except Exception as e:
            logger.exception("AI parsing failed. Falling back to deterministic parser.")
            # Call deterministic fallback on failure

    # Deterministic fallback when AI is missing/fails
    return parse_deterministic_fallback(text, segments)
