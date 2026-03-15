"""
Pydantic models for request/response validation.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ╔══════════════════════════════════════════════════════════════╗
# ║  POST /parse-cv  ─  Response                                ║
# ╚══════════════════════════════════════════════════════════════╝

class ParseCVContactModel(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    address: Optional[str] = None


class ParseCVExperienceModel(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class ParseCVEducationModel(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None


class ParseCVProjectModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)
    url: Optional[str] = None


class ParseCVCertificationModel(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    date_obtained: Optional[str] = None


class ParseCVProfileModel(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    career_objective: Optional[str] = None
    summary: Optional[str] = None


class ParseCVDataModel(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    profile: ParseCVProfileModel = Field(default_factory=ParseCVProfileModel)
    contact: ParseCVContactModel = Field(default_factory=ParseCVContactModel)
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)
    experience: list[ParseCVExperienceModel] = Field(default_factory=list)
    education: list[ParseCVEducationModel] = Field(default_factory=list)
    projects: list[ParseCVProjectModel] = Field(default_factory=list)
    certifications: list[ParseCVCertificationModel] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    raw_text: str = ""


class ParseCVResponse(BaseModel):
    """Response returned by POST /parse-cv."""
    success: bool = True
    extraction_method: str = "unknown"
    data: ParseCVDataModel = Field(default_factory=ParseCVDataModel)
    page_count: int = 0
    warnings: list[str] = Field(default_factory=list)
    raw_text: str = Field(default="", description="Extracted text before normalization")
    clean_text: str = Field(default="", description="LLM-normalized text")
    cv_json: dict[str, Any] = Field(default_factory=dict, description="Structured CV data")
    avatar_url: Optional[str] = Field(default=None, description="Data-URI of avatar image if detected")


# ╔══════════════════════════════════════════════════════════════╗
# ║  /ocr/upload  ─  Request / Response models                   ║
# ╚══════════════════════════════════════════════════════════════╝

class OCRBlockModel(BaseModel):
    """Single detected text region returned by the OCR provider."""
    text: str
    bbox: list[list[int]]
    confidence: float
    page: int = 1
    column: Optional[str] = None
    rect: dict[str, float] = Field(
        default_factory=dict,
        description="{x, y, width, height} in 0–100 percent of image size",
    )


class OCRPageModel(BaseModel):
    page: int
    image_width: int
    image_height: int
    blocks: list[OCRBlockModel] = Field(default_factory=list)


class ParseOCRBlocksRequest(BaseModel):
    blocks: list[OCRBlockModel] = Field(default_factory=list)


class OCRUploadResponse(BaseModel):
    success: bool
    page_count: int
    total_blocks: int
    pages: list[OCRPageModel]
    elapsed_seconds: float
    warnings: list[str] = Field(default_factory=list)


class StructuredOCRBlockModel(BaseModel):
    type: str
    text: str
    bbox: list[int] = Field(default_factory=list, description="[x1, y1, x2, y2] in pixels")
    page: int = 1
    layout_type: Optional[str] = None


class OCRProcessingTimingsModel(BaseModel):
    ocr_seconds: float = 0.0
    layout_seconds: float = 0.0
    total_seconds: float = 0.0


class DetectedSectionModel(BaseModel):
    type: str
    title: str
    content: str = ""
    items: list[Any] = Field(default_factory=list)
    line_ids: list[str] = Field(default_factory=list)
    block_indices: list[int] = Field(default_factory=list)


class UploadCVResponse(BaseModel):
    success: bool = True
    document_type: str = "cv"
    document_confidence: float = 0.0
    document_signals: list[str] = Field(default_factory=list)
    extraction_method: str = "ocr_layout"
    ocr_provider: str = ""
    page_count: int = 0
    total_blocks: int = 0
    blocks: list[StructuredOCRBlockModel] = Field(default_factory=list)
    pages: list[OCRPageModel] = Field(default_factory=list)
    elapsed_seconds: float = 0.0
    timings: OCRProcessingTimingsModel = Field(default_factory=OCRProcessingTimingsModel)
    warnings: list[str] = Field(default_factory=list)
    data: ParseCVDataModel = Field(default_factory=ParseCVDataModel)
    detected_sections: list[DetectedSectionModel] = Field(default_factory=list)
    builder_sections: list[dict[str, Any]] = Field(default_factory=list)
    layout: dict[str, Any] = Field(default_factory=dict)
    markdown_pages: list[str] = Field(default_factory=list)
    raw_text: str = ""
    content: str = ""


# ╔══════════════════════════════════════════════════════════════╗
# ║  /match-job  ─  Request / Response                          ║
# ╚══════════════════════════════════════════════════════════════╝

class MatchJobRequest(BaseModel):
    cv_text: str = Field(..., min_length=20)
    job_description: str = Field(..., min_length=20)


class MatchJobResponse(BaseModel):
    success: bool
    match_percentage: float = Field(..., ge=0, le=100)
    missing_keywords: list[str] = Field(default_factory=list)
    common_keywords: list[str] = Field(default_factory=list)
    model_used: str = "ollama/qwen3:4b"


# ╔══════════════════════════════════════════════════════════════╗
# ║  Generic error                                               ║
# ╚══════════════════════════════════════════════════════════════╝

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
