"""Pydantic schemas for Job Description requirements and fragments."""
from pydantic import BaseModel, Field


class JobDescriptionRequirement(BaseModel):
    id: str = Field(..., description="Unique ID for this requirement fragment")
    text: str = Field(..., description="Original raw text of the requirement")
    normalized_value: str | None = Field(None, description="Normalized skill name or keyword")
    requirement_type: str = Field(..., description="required_skill | preferred_skill | responsibility | required_experience | preferred_experience | education | certification | domain_keyword | tool | soft_skill")
    importance: str = Field(..., description="required | preferred | optional")
    source_excerpt: str = Field(..., description="Snippet from the job description raw text")
    confidence: float = Field(default=1.0, description="Extraction confidence (0.0 to 1.0)")
    extraction_method: str = Field(default="deterministic", description="deterministic | llm_structured | hybrid")

class JobDescriptionRequirements(BaseModel):
    job_title: str | None = Field(None, description="Extracted target job title")
    company: str | None = Field(None, description="Extracted hiring company name")
    seniority: str | None = Field(None, description="Extracted seniority level (e.g. Senior, Junior, Lead)")
    required_skills: list[str] = Field(default_factory=list, description="List of required skill keywords")
    preferred_skills: list[str] = Field(default_factory=list, description="List of preferred skill keywords")
    responsibilities: list[str] = Field(default_factory=list, description="List of responsibilities or tasks")
    required_experience: str | None = Field(None, description="Extracted required years of experience description")
    preferred_experience: str | None = Field(None, description="Extracted preferred years of experience description")
    education_requirements: list[str] = Field(default_factory=list, description="Education requirements (e.g. BS in CS)")
    certification_requirements: list[str] = Field(default_factory=list, description="Certification requirements (e.g. AWS Developer)")
    domain_keywords: list[str] = Field(default_factory=list, description="General industry domain keywords")
    tools_and_technologies: list[str] = Field(default_factory=list, description="Tools and technologies requested")
    soft_skills: list[str] = Field(default_factory=list, description="Soft skills requested")
    raw_requirement_fragments: list[JobDescriptionRequirement] = Field(default_factory=list, description="Flat list of all parsed requirement nodes")
