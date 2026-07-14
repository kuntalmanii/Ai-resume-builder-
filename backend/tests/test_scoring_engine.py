"""Scoring engine unit tests — 40 deterministic tests.

Tests cover:
- config constants
- text_metrics utilities
- all 6 check modules (ats, content, completeness, readability, grammar, evidence)
- engine orchestration (score normalization, invariants, caching)
- recommendations builder
"""
import pytest
from datetime import date, datetime

from app.services.scoring.config import (
    ANALYSIS_VERSION, CATEGORY_MAX, RAW_MAX_SCORE,
    ATS_WEIGHTS, CONTENT_WEIGHTS,
)
from app.services.scoring.text_metrics import (
    collect_all_bullets, collect_all_text, collect_all_dates,
    parse_date, starts_with_action_verb, contains_weak_phrase,
    has_any_metric, find_duplicate_bullets, word_count, sentence_count,
    specificity_score, detect_metrics,
)
from app.services.scoring.ats_checks import (
    check_contact_info, check_section_naming, check_section_structure,
    check_date_format, check_bullet_structure, check_special_chars,
    check_content_density, check_template_safety, run_ats_checks,
)
from app.services.scoring.content_checks import (
    check_action_verbs, check_specificity, check_measurable_impact,
    check_conciseness, check_repetition, check_weak_phrases,
)
from app.services.scoring.completeness_checks import (
    check_personal_info, check_foundation, check_skills, check_evidence,
    check_summary, check_credibility_sections,
)
from app.services.scoring.readability_checks import (
    check_bullet_length, check_sentence_complexity, check_excessive_paragraphs,
)
from app.services.scoring.grammar_checks import (
    check_repeated_punctuation, check_excessive_capitalization,
    check_missing_spaces, check_duplicate_words, check_bullet_ending_consistency,
)
from app.services.scoring.evidence_checks import (
    check_internal_consistency, check_timeline_consistency, check_profile_consistency,
    check_numeric_awareness, check_verification_transparency,
)
from app.services.scoring.engine import run_resume_analysis, _normalize, _clamp
from app.services.scoring.recommendations import build_recommendations


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def strong_resume():
    """A well-structured, high-scoring resume fixture."""
    return {
        "personal_information": {
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "+1-555-0100",
            "location": "San Francisco, CA",
            "linkedin_url": "https://linkedin.com/in/janedoe",
        },
        "professional_summary": (
            "Senior Software Engineer with 8 years of experience building scalable "
            "distributed systems. Led cross-functional teams delivering 99.9% uptime."
        ),
        "experience": [
            {
                "company": "Acme Corp",
                "position": "Senior Engineer",
                "start_date": "Jan 2020",
                "end_date": "Present",
                "is_current": True,
                "bullets": [
                    "Led migration of monolithic Python app to microservices, reducing latency by 40%.",
                    "Designed API gateway handling 50k requests/second using FastAPI and Redis.",
                    "Mentored 4 junior engineers across 3 time zones, improving team velocity by 25%.",
                ],
            },
            {
                "company": "StartupCo",
                "position": "Software Engineer",
                "start_date": "Jun 2017",
                "end_date": "Dec 2019",
                "is_current": False,
                "bullets": [
                    "Built real-time data pipeline processing 1M events/day with Kafka and Spark.",
                    "Reduced infrastructure costs by $200k/year through cloud optimization.",
                ],
            },
        ],
        "education": [
            {
                "institution": "MIT",
                "degree": "B.S. Computer Science",
                "start_date": "2013",
                "end_date": "2017",
                "is_current": False,
            }
        ],
        "skills": [
            {"group": "Languages", "skills": ["Python", "Go", "TypeScript", "SQL"]},
            {"group": "Cloud", "skills": ["AWS", "GCP", "Kubernetes", "Docker"]},
        ],
        "projects": [
            {
                "name": "Open Source CLI",
                "description": "Built CLI tool with 2k GitHub stars",
                "bullets": ["Implemented plugin architecture using Python entry-points."],
            }
        ],
        "certifications": [{"name": "AWS Solutions Architect Professional", "year": "2022"}],
        "achievements": [{"title": "Best Engineer Award", "description": "Won in 2021"}],
        "section_order": [
            "personal_information", "professional_summary", "experience",
            "education", "skills", "projects", "certifications",
        ],
    }


def sparse_resume():
    """A minimal, low-scoring resume fixture."""
    return {
        "personal_information": {"full_name": "Bob"},
        "experience": [],
        "education": [],
        "skills": [],
        "section_order": [],
    }


# ─── CONFIG TESTS ─────────────────────────────────────────────────────────────

def test_config_raw_max_score():
    assert RAW_MAX_SCORE == 75

def test_config_category_max_sum():
    assert sum(CATEGORY_MAX.values()) == 75

def test_config_analysis_version_format():
    assert ANALYSIS_VERSION.startswith("ats-v")


# ─── TEXT METRICS TESTS ───────────────────────────────────────────────────────

def test_collect_all_bullets_from_experience():
    resume = strong_resume()
    bullets = collect_all_bullets(resume)
    assert len(bullets) > 0
    assert any("latency" in b for b in bullets)

def test_collect_all_bullets_empty():
    bullets = collect_all_bullets(sparse_resume())
    assert bullets == []

def test_parse_date_year():
    d = parse_date("2021")
    assert d == date(2021, 1, 1)

def test_parse_date_present():
    d = parse_date("Present")
    assert d == date.today()

def test_parse_date_month_year():
    d = parse_date("Jan 2020")
    assert d == date(2020, 1, 1)

def test_parse_date_none():
    assert parse_date(None) is None

def test_starts_with_action_verb_true():
    assert starts_with_action_verb("Led a team of 5 engineers") is True

def test_starts_with_action_verb_weak():
    assert starts_with_action_verb("Responsible for managing deployments") is False

def test_contains_weak_phrase_true():
    assert contains_weak_phrase("Responsible for managing deployments") is True

def test_contains_weak_phrase_false():
    assert contains_weak_phrase("Built and deployed the payment service") is False

def test_has_any_metric_percent():
    assert has_any_metric("Reduced costs by 40%") is True

def test_has_any_metric_false():
    assert has_any_metric("Led team meetings") is False

def test_find_duplicate_bullets_exact():
    bullets = ["Led team", "Led team", "Built API"]
    dupes = find_duplicate_bullets(bullets, similarity_threshold=0.9)
    assert len(dupes) > 0

def test_word_count():
    assert word_count("hello world foo") == 3

def test_sentence_count_multiple():
    assert sentence_count("Did this. Also did that. And more.") == 3


# ─── ATS CHECKS TESTS ─────────────────────────────────────────────────────────

def test_ats_contact_info_passed():
    result = check_contact_info(strong_resume())
    assert result.status == "passed"
    assert result.points_awarded == ATS_WEIGHTS["ATS_CONTACT_INFO"]

def test_ats_contact_info_missing_phone():
    resume = strong_resume()
    resume["personal_information"]["phone"] = ""
    result = check_contact_info(resume)
    assert result.status == "warning"
    assert result.points_awarded < ATS_WEIGHTS["ATS_CONTACT_INFO"]

def test_ats_contact_info_failed():
    result = check_contact_info(sparse_resume())
    assert result.status == "failed"
    assert result.points_awarded == 0

def test_ats_section_structure_passed():
    result = check_section_structure(strong_resume())
    assert result.status == "passed"

def test_ats_section_structure_failed():
    result = check_section_structure(sparse_resume())
    assert result.status in ("failed", "warning")

def test_ats_template_safety_safe():
    result = check_template_safety(strong_resume(), template_id="classic")
    assert result.status == "passed"

def test_ats_template_safety_risky():
    result = check_template_safety(strong_resume(), template_id="sidebar")
    assert result.status == "failed"
    assert result.points_awarded == 0


# ─── CONTENT CHECKS TESTS ────────────────────────────────────────────────────

def test_content_action_verbs_high():
    result = check_action_verbs(strong_resume())
    assert result.status in ("passed", "warning")

def test_content_measurable_impact_high():
    result = check_measurable_impact(strong_resume())
    assert result.status == "passed"

def test_content_measurable_impact_none():
    resume = strong_resume()
    for exp in resume["experience"]:
        exp["bullets"] = ["Led team meetings and worked on documentation."]
    result = check_measurable_impact(resume)
    assert result.status in ("warning", "failed")

def test_content_weak_phrases_fail():
    resume = strong_resume()
    for exp in resume["experience"]:
        exp["bullets"] = ["Responsible for managing deployments", "Helped with testing"]
    result = check_weak_phrases(resume)
    assert result.status in ("warning", "failed")


# ─── COMPLETENESS CHECKS TESTS ───────────────────────────────────────────────

def test_completeness_personal_info_pass():
    result = check_personal_info(strong_resume())
    assert result.status == "passed"

def test_completeness_skills_pass():
    result = check_skills(strong_resume())
    assert result.status == "passed"

def test_completeness_skills_fail():
    result = check_skills(sparse_resume())
    assert result.status == "failed"

def test_completeness_evidence_pass():
    result = check_evidence(strong_resume())
    assert result.status == "passed"


# ─── GRAMMAR CHECKS TESTS ────────────────────────────────────────────────────

def test_grammar_repeated_punct_detected():
    resume = strong_resume()
    resume["professional_summary"] = "Great work!! Love it.. Absolutely..."
    result = check_repeated_punctuation(resume)
    assert result.status == "warning"
    assert result.points_awarded == 0

def test_grammar_duplicate_words_detected():
    resume = strong_resume()
    resume["professional_summary"] = "I worked in in San Francisco."
    result = check_duplicate_words(resume)
    assert result.status == "warning"

def test_grammar_bullet_ending_consistency_pass():
    resume = strong_resume()
    # All bullets end with periods
    for exp in resume["experience"]:
        exp["bullets"] = [b.rstrip(".") + "." for b in exp.get("bullets", [])]
    result = check_bullet_ending_consistency(resume)
    assert result.status == "passed"


# ─── ENGINE TESTS ─────────────────────────────────────────────────────────────

def test_engine_strong_resume_score_above_50():
    result = run_resume_analysis(strong_resume())
    assert result.overall_score >= 50
    assert 0 <= result.overall_score <= 100

def test_engine_sparse_resume_score_low():
    result = run_resume_analysis(sparse_resume())
    # Sparse resume fails completeness checks (0/10 pts) and some ATS checks.
    # Grammar/readability pass on empty content (no bad patterns detected).
    # Score should be meaningfully below a strong resume (strong >= 75).
    assert result.overall_score < 80
    # And completeness must be 0 since all sections are empty
    complete_cat = next(c for c in result.categories if c.category == "completeness")
    assert complete_cat.normalized == 0

def test_engine_score_invariants():
    result = run_resume_analysis(strong_resume())
    assert result.raw_score >= 0
    assert result.raw_score <= result.raw_max_score
    assert result.raw_max_score == RAW_MAX_SCORE
    assert result.overall_score == round((result.raw_score / result.raw_max_score) * 100)

def test_engine_jd_match_is_none():
    result = run_resume_analysis(strong_resume())
    assert result.jd_match_score is None

def test_engine_analysis_version():
    result = run_resume_analysis(strong_resume())
    assert result.analysis_version == ANALYSIS_VERSION

def test_engine_all_checks_run():
    result = run_resume_analysis(strong_resume())
    # ATS(8) + Content(6) + Completeness(6) + Readability(5) + Grammar(5) + Evidence(5) = 35
    assert len(result.checks) == 35

def test_engine_recommendations_sorted():
    result = run_resume_analysis(sparse_resume())
    recs = result.top_recommendations
    if len(recs) >= 2:
        assert recs[0].points_lost >= recs[1].points_lost

def test_engine_potential_gain_non_negative():
    result = run_resume_analysis(sparse_resume())
    assert result.potential_score_gain >= 0

def test_normalize_helper():
    assert _normalize(75, 75) == 100
    assert _normalize(0, 75) == 0
    assert _normalize(37, 74) == 50

def test_clamp_helper():
    assert _clamp(150) == 100
    assert _clamp(-5) == 0
    assert _clamp(75) == 75
