"""
Pydantic models for request/response validation.
Covers both /parse-cv and /match-job endpoints.
"""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ╔══════════════════════════════════════════════════════════════╗
# ║  /parse-cv  ─  Response models                              ║
# ╚══════════════════════════════════════════════════════════════╝


class ContactInfo(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    address: Optional[str] = None


class ExperienceEntry(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class EducationEntry(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None


class ProjectEntry(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    url: Optional[str] = None


class CertificationEntry(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    date_obtained: Optional[str] = None


class ParsedCV(BaseModel):
    """Structured representation of a parsed CV."""

    full_name: Optional[str] = None
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    projects: list[ProjectEntry] = Field(default_factory=list)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    raw_text: str = Field(
        default="",
        description="Full extracted text before structuring",
    )


class ExtractionMethod(str, Enum):
    TEXT = "text_extraction"
    OCR  = "ollama_qwen3_vl"  # qwen3-vl:4b via Ollama


class ParseCVResponse(BaseModel):
    success: bool
    extraction_method: ExtractionMethod
    data: ParsedCV
    page_count: int = 0
    warnings: list[str] = Field(default_factory=list)


# ╔══════════════════════════════════════════════════════════════╗
# ║  /match-job  ─  Request / Response models                   ║
# ╚══════════════════════════════════════════════════════════════╝


class MatchJobRequest(BaseModel):
    cv_text: str = Field(
        ...,
        min_length=20,
        description="Full text content of the candidate's CV",
        json_schema_extra={"example": "Python developer with 5 years of experience in Django, FastAPI, PostgreSQL..."},
    )
    job_description: str = Field(
        ...,
        min_length=20,
        description="Full text of the job description / posting",
        json_schema_extra={"example": "We are looking for a Senior Backend Engineer proficient in Python, AWS, Docker..."},
    )


class MatchJobResponse(BaseModel):
    success: bool
    match_percentage: float = Field(
        ...,
        ge=0,
        le=100,
        description="Cosine-similarity score scaled to 0–100 %",
    )
    missing_keywords: list[str] = Field(
        default_factory=list,
        description="Keywords present in the JD but absent from the CV",
    )
    common_keywords: list[str] = Field(
        default_factory=list,
        description="Keywords found in both CV and JD",
    )
    model_used: str = "ollama/qwen3:4b"


# ╔══════════════════════════════════════════════════════════════╗
# ║  Generic error envelope                                      ║
# ╚══════════════════════════════════════════════════════════════╝


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
