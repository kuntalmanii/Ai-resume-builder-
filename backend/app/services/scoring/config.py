"""Scoring engine central configuration.

This is the single source of truth for:
- Scoring version
- Category maximum points
- All check codes and their point weights
- Thresholds for content analysis
- Action verb lexicon
- Weak phrase list
- Metric detection patterns

No magic numbers should appear elsewhere in the scoring engine.
"""

# ─── Scoring Version ──────────────────────────────────────────────────────────

ANALYSIS_VERSION = "ats-v1.0"

# ─── Category Maximums ────────────────────────────────────────────────────────

CATEGORY_MAX = {
    "ats": 20,
    "content": 20,
    "completeness": 10,
    "readability": 10,
    "grammar": 5,
    "evidence": 10,
}

RAW_MAX_SCORE = sum(CATEGORY_MAX.values())  # 75 for resume-only mode

# ─── ATS Compatibility Check Weights ─────────────────────────────────────────

ATS_WEIGHTS = {
    "ATS_CONTACT_INFO": 3,
    "ATS_SECTION_NAMING": 3,
    "ATS_SECTION_STRUCTURE": 3,
    "ATS_DATE_FORMAT": 2,
    "ATS_BULLET_STRUCTURE": 2,
    "ATS_SPECIAL_CHARS": 2,
    "ATS_CONTENT_DENSITY": 2,
    "ATS_TEMPLATE_SAFETY": 3,
}

# ─── Content Strength Check Weights ──────────────────────────────────────────

CONTENT_WEIGHTS = {
    "CONTENT_ACTION_VERBS": 4,
    "CONTENT_SPECIFICITY": 4,
    "CONTENT_MEASURABLE_IMPACT": 4,
    "CONTENT_CONCISENESS": 3,
    "CONTENT_REPETITION": 3,
    "CONTENT_WEAK_PHRASES": 2,
}

# ─── Completeness Check Weights ───────────────────────────────────────────────

COMPLETENESS_WEIGHTS = {
    "COMPLETE_PERSONAL_INFO": 2,
    "COMPLETE_FOUNDATION": 2,
    "COMPLETE_SKILLS": 2,
    "COMPLETE_EVIDENCE": 2,
    "COMPLETE_SUMMARY": 1,
    "COMPLETE_CREDIBILITY": 1,
}

# ─── Readability Check Weights ────────────────────────────────────────────────

READABILITY_WEIGHTS = {
    "READ_BULLET_LENGTH": 2,
    "READ_SENTENCE_COMPLEXITY": 2,
    "READ_EXCESSIVE_PARAGRAPHS": 2,
    "READ_REPETITION": 2,
    "READ_DENSITY_BALANCE": 2,
}

# ─── Grammar Check Weights ────────────────────────────────────────────────────

GRAMMAR_WEIGHTS = {
    "GRAM_REPEATED_PUNCT": 1,
    "GRAM_EXCESSIVE_CAPS": 1,
    "GRAM_MISSING_SPACES": 1,
    "GRAM_DUPLICATE_WORDS": 1,
    "GRAM_BULLET_ENDING": 1,
}

# ─── Evidence & Credibility Check Weights ────────────────────────────────────

EVIDENCE_WEIGHTS = {
    "EVID_INTERNAL_CONSISTENCY": 3,
    "EVID_TIMELINE_CONSISTENCY": 2,
    "EVID_NUMERIC_AWARENESS": 2,
    "EVID_PROFILE_CONSISTENCY": 2,
    "EVID_VERIFICATION_TRANSPARENCY": 1,
}

# ─── Content Thresholds ───────────────────────────────────────────────────────

# Bullet analysis
MAX_BULLET_WORDS = 35          # Bullets longer than this are flagged
MIN_BULLET_WORDS = 4           # Bullets shorter than this are too vague
IDEAL_BULLET_WORDS_MAX = 25    # Ideal range upper bound

# Section analysis
MIN_ENTRIES_FOR_FOUNDATION = 1  # Min experience or education entries
EXCESSIVE_SUMMARY_WORDS = 120   # Summary longer than this is a paragraph wall

# Special character density
MAX_SPECIAL_CHAR_RATIO = 0.05   # >5% special chars in a section is flagged

# Content density
MIN_TOTAL_WORDS = 150           # Fewer than this = very sparse resume
MAX_TOTAL_WORDS = 1200          # More than this = too dense

# Action verb coverage
ACTION_VERB_COVERAGE_THRESHOLD = 0.5  # >50% of bullets should start with action verb

# Weak phrase coverage
WEAK_PHRASE_THRESHOLD = 0.2    # >20% of bullets with weak phrases = warning

# Date format
DATE_FORMAT_PATTERNS = [
    r"^\d{4}$",                          # 2024
    r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$",  # Jan 2024
    r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$",
    r"^\d{2}/\d{4}$",                    # 01/2024
    r"^\d{4}-\d{2}$",                    # 2024-01
    r"^(Present|Current|present|current|Now|now)$",
]

# ─── Action Verb Lexicon ──────────────────────────────────────────────────────

ACTION_VERBS = {
    # Engineering & technical
    "built", "developed", "designed", "implemented", "architected", "engineered",
    "deployed", "automated", "optimized", "refactored", "migrated", "integrated",
    "debugged", "maintained", "tested", "documented", "configured", "provisioned",
    "containerized", "modularized", "instrumented", "monitored", "scaled",
    # Leadership & management
    "led", "managed", "mentored", "coached", "directed", "coordinated",
    "supervised", "oversaw", "facilitated", "organized", "delegated",
    "established", "championed", "drove", "spearheaded", "pioneered",
    # Creation & innovation
    "created", "launched", "initiated", "introduced", "innovated", "ideated",
    "prototyped", "founded", "proposed", "conceptualized", "formulated",
    # Analysis & research
    "analyzed", "researched", "evaluated", "assessed", "investigated",
    "identified", "diagnosed", "audited", "reviewed", "benchmarked",
    # Improvement & optimization
    "improved", "enhanced", "increased", "reduced", "decreased", "accelerated",
    "streamlined", "simplified", "consolidated", "eliminated", "revamped",
    # Communication & collaboration
    "collaborated", "partnered", "presented", "negotiated", "advised",
    "consulted", "trained", "taught", "guided", "communicated",
    # Achievement
    "achieved", "delivered", "completed", "exceeded", "surpassed", "secured",
    "generated", "produced", "contributed", "supported", "enabled",
}

# ─── Weak Phrase Lexicon ─────────────────────────────────────────────────────

WEAK_PHRASES = [
    "responsible for",
    "worked on",
    "helped with",
    "involved in",
    "participated in",
    "assisted with",
    "assisted in",
    "was responsible",
    "duties included",
    "my job was",
    "i was in charge of",
    "tasked with",
    "part of a team",
    "worked as part",
    "contributed to the",
]

# ─── Metric Detection Patterns ────────────────────────────────────────────────

METRIC_PATTERNS = [
    r"\d+\s*%",                          # percentages: 40%, 15 %
    r"\$\s*\d[\d,\.]*\s*(k|m|b|million|billion|thousand)?",  # currency: $50k, $1.2M
    r"\d[\d,]*\s*(k|m|b|million|billion|thousand)\b",        # scale: 1M, 500k
    r"\b\d+x\b",                         # multipliers: 3x, 10x
    r"\b\d+\s*(users?|customers?|clients?|people|employees?|members?|teams?)\b",
    r"\b\d+\s*(requests?|queries|transactions?|calls?)\s*(per|\/)\s*(second|minute|hour|day)",
    r"\b(increased|decreased|reduced|improved|grew|boosted|cut|saved)\s+by\s+\d",
    r"\bfrom\s+\d.*\bto\s+\d",          # from X to Y improvements
]

# ─── Special Characters ───────────────────────────────────────────────────────

BENIGN_SPECIAL_CHARS = set(".,;:!?-–—()[]{}\"'`@#&+*/\\|<>~^%$")
PROBLEMATIC_SPECIAL_CHARS = set("█▌▐▄▀■□●○◆◇★☆✓✗→←↑↓⟶⟵")  # common resume decoration
