from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from services.ocr_service import OCRBlock, OCRPageResult, extract_full_text


@dataclass
class OCRLine:
    id: str
    page: int
    text: str
    x: float
    y: float
    width: float
    height: float
    font_size: float
    block_indices: list[int] = field(default_factory=list)


@dataclass
class CVSection:
    type: str
    title: str
    lines: list[OCRLine] = field(default_factory=list)

    @property
    def content(self) -> str:
        return "\n".join(line.text for line in self.lines).strip()


HEADING_KEYWORDS: list[tuple[str, str, re.Pattern[str]]] = [
    ("career_objective", "Muc tieu nghe nghiep", re.compile(r"MUC TIEU|OBJECTIVE|CAREER OBJECTIVE|GIOI THIEU|VE BAN THAN", re.I)),
    ("work_experience", "Kinh nghiem lam viec", re.compile(r"KINH NGHIEM|WORK EXPERIENCE|EXPERIENCE|CONG TAC", re.I)),
    ("projects", "Du an", re.compile(r"DU AN|PROJECTS|DO AN", re.I)),
    ("skills", "Ky nang", re.compile(r"KY NANG|SKILLS|NANG LUC", re.I)),
    ("education", "Hoc van", re.compile(r"HOC VAN|EDUCATION|TRINH DO", re.I)),
    ("contact", "Thong tin lien he", re.compile(r"LIEN HE|CONTACT|THONG TIN CA NHAN", re.I)),
    ("certifications", "Chung chi", re.compile(r"CHUNG CHI|CERTIF|GIAY CHUNG NHAN", re.I)),
    ("activities", "Hoat dong", re.compile(r"HOAT DONG|ACTIVIT|NGOAI KHOA", re.I)),
    ("interests", "So thich", re.compile(r"SO THICH|INTEREST|HOBBY", re.I)),
]

TECH_KEYWORDS = {
    "react", "reactjs", "vue", "angular", "nextjs", "nuxt", "node", "nodejs",
    "express", "nestjs", "java", "javafx", "spring", "python", "django", "flask",
    "php", "laravel", "mysql", "postgresql", "mongodb", "redis", "docker",
    "kubernetes", "aws", "gcp", "azure", "tailwind", "tailwindcss", "typescript",
    "javascript", "html", "css", "sass", "bootstrap", "graphql", "rest", "api",
    "c#", "c++", ".net", "golang", "go", "figma", "photoshop", "illustrator",
}

DATE_RANGE_RE = re.compile(
    r"(?P<start>(?:0?[1-9]|1[0-2])/\d{4}|\d{4})\s*[-–—]\s*(?P<end>(?:0?[1-9]|1[0-2])/\d{4}|\d{4}|Hien tai|Hientai|Present|Now)",
    re.I,
)


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text or "")
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def _normalize_heading_text(text: str) -> str:
    cleaned = _strip_accents(text).upper()
    cleaned = cleaned.replace("Đ", "D").replace("đ", "d")
    cleaned = re.sub(r"[^A-Z0-9\s]", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _clean_line_text(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"^CURRENT:\s*", "", text, flags=re.I)
    text = re.sub(r"^PREV:\s*", "", text, flags=re.I)
    text = re.sub(r"^NEXT:\s*", "", text, flags=re.I)
    text = re.sub(r"\.\s*\.\s*\.\s*\(not provided in the user's message\)", "", text, flags=re.I)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([,.;:!?])(?![\s\n]|$)", r"\1 ", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def _looks_like_email(text: str) -> bool:
    return bool(re.search(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", text, re.I))


def _looks_like_phone(text: str) -> bool:
    digits = re.sub(r"\D", "", text)
    return 9 <= len(digits) <= 12


def _looks_like_url(text: str) -> bool:
    return bool(re.search(r"https?://|www\.|linkedin|github|facebook", text, re.I))


def _looks_like_address(text: str) -> bool:
    return bool(re.search(r"\b(tp\.?|hcm|ha noi|ho chi minh|quan|district|ward|duong|street|phuong)\b", _strip_accents(text), re.I))


def _is_probable_heading(line: OCRLine, median_font_size: float, prev_gap: float) -> tuple[bool, tuple[str, str] | None]:
    normalized = _normalize_heading_text(line.text)
    matched: tuple[str, str] | None = None
    for section_type, title, pattern in HEADING_KEYWORDS:
        if pattern.search(normalized):
            matched = (section_type, title)
            break

    is_short = len(line.text) <= 48
    word_count = len(line.text.split())
    no_sentence_punct = not re.search(r"[.!?,:;]", line.text)
    gap_hint = prev_gap >= max(1.0, line.height * 0.6)
    font_hint = line.font_size >= max(median_font_size * 1.12, median_font_size + 0.15)
    upper_ratio = sum(1 for char in line.text if char.isupper()) / max(1, sum(1 for char in line.text if char.isalpha()))
    style_hint = upper_ratio > 0.45 or font_hint

    keyword_heading = matched and is_short and word_count <= 6 and no_sentence_punct
    return bool(keyword_heading and (style_hint or gap_hint or matched is not None)), matched


def _group_page_blocks_into_lines(page: OCRPageResult, block_offset: int) -> list[OCRLine]:
    lines: list[OCRLine] = []

    for local_index, block in enumerate(page.blocks):
        text = _clean_line_text(block.text)
        if not text:
            continue

        x = block.rect_x
        y = block.rect_y
        width = block.rect_w
        height = block.rect_h
        center_y = y + height / 2

        matched_line: OCRLine | None = None
        for existing in reversed(lines):
            existing_center_y = existing.y + existing.height / 2
            horizontal_gap = max(
                x - (existing.x + existing.width),
                existing.x - (x + width),
                0.0,
            )
            if (
                abs(center_y - existing_center_y) <= max(existing.height, height) * 0.55
                and horizontal_gap <= 5.0
            ):
                matched_line = existing
                break

        block_index = block_offset + local_index
        if matched_line is None:
            lines.append(
                OCRLine(
                    id=f"{page.page}-{block_index}",
                    page=page.page,
                    text=text,
                    x=x,
                    y=y,
                    width=width,
                    height=height,
                    font_size=height,
                    block_indices=[block_index],
                )
            )
            continue

        matched_line.text = _clean_line_text(f"{matched_line.text} {text}")
        matched_line.x = min(matched_line.x, x)
        matched_line.y = min(matched_line.y, y)
        matched_line.width = max(matched_line.x + matched_line.width, x + width) - matched_line.x
        matched_line.height = max(matched_line.y + matched_line.height, y + height) - matched_line.y
        matched_line.font_size = max(matched_line.font_size, height)
        matched_line.block_indices.append(block_index)

    return sorted(lines, key=lambda line: (line.page, line.y, line.x))


def group_ocr_blocks_into_lines(page_results: list[OCRPageResult]) -> list[OCRLine]:
    lines: list[OCRLine] = []
    block_offset = 0
    for page in page_results:
        lines.extend(_group_page_blocks_into_lines(page, block_offset))
        block_offset += len(page.blocks)
    return lines


def detect_cv_sections(page_results: list[OCRPageResult]) -> list[CVSection]:
    lines = group_ocr_blocks_into_lines(page_results)
    if not lines:
        return []

    median_font_size = sorted(line.font_size for line in lines)[len(lines) // 2]
    heading_entries: list[tuple[int, OCRLine, str, str]] = []
    preamble = CVSection(type="header", title="Header")

    for index, line in enumerate(lines):
        prev_line = lines[index - 1] if index > 0 else None
        prev_bottom = (prev_line.y + prev_line.height) if prev_line else 0.0
        prev_gap = max(0.0, line.y - prev_bottom)
        is_heading, heading_meta = _is_probable_heading(line, median_font_size, prev_gap)
        if is_heading and heading_meta:
            heading_entries.append((index, line, heading_meta[0], line.text))

    if not heading_entries:
        preamble.lines = lines
        return [preamble]

    sections = [
        CVSection(type=section_type, title=title)
        for _, _, section_type, title in heading_entries
    ]

    for line_index, line in enumerate(lines):
        if any(line is heading_line for _, heading_line, _, _ in heading_entries):
            continue

        candidate_scores: list[tuple[float, int]] = []
        for section_index, (_, heading_line, _, _) in enumerate(heading_entries):
            if (heading_line.page, heading_line.y) > (line.page, line.y + 0.01):
                continue
            vertical_gap = max(0.0, line.y - heading_line.y)
            horizontal_gap = abs(line.x - heading_line.x)
            page_penalty = (line.page - heading_line.page) * 1000
            score = page_penalty + vertical_gap * 1.5 + horizontal_gap * 1.2
            candidate_scores.append((score, section_index))

        if not candidate_scores:
            preamble.lines.append(line)
            continue

        _, best_section_index = min(candidate_scores, key=lambda item: item[0])
        sections[best_section_index].lines.append(line)

    ordered_sections: list[CVSection] = []
    if preamble.lines:
        ordered_sections.append(preamble)
    ordered_sections.extend(section for section in sections if section.lines or section.type in {"skills", "education", "work_experience", "projects", "career_objective"})
    return ordered_sections


def _extract_date_range(text: str) -> tuple[str | None, str | None]:
    match = DATE_RANGE_RE.search(_strip_accents(text))
    if not match:
        return None, None
    return match.group("start"), match.group("end")


def _uppercase_ratio(text: str) -> float:
    letters = [char for char in text if char.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for char in letters if char.isupper()) / len(letters)


def _looks_like_company(text: str) -> bool:
    normalized = _strip_accents(text).upper()
    return (
        "CONG TY" in normalized
        or "JSC" in normalized
        or "CO., LTD" in normalized
        or _uppercase_ratio(text) > 0.62
    )


def _looks_like_position(text: str) -> bool:
    normalized = _strip_accents(text).lower()
    return bool(
        re.search(
            r"developer|engineer|intern|thuc tap|lap trinh vien|backend|frontend|fullstack|designer|tester|nhan vien|tro giang|assistant",
            normalized,
        )
    )


def _split_entries_by_dates(lines: list[OCRLine]) -> list[list[OCRLine]]:
    entries: list[list[OCRLine]] = []
    current: list[OCRLine] = []

    for line in lines:
        has_date = bool(_extract_date_range(line.text)[0])
        if has_date and current:
            entries.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        entries.append(current)

    return entries


def parse_work_experience(lines: list[OCRLine]) -> list[dict[str, Any]]:
    entries = _split_entries_by_dates(lines)
    parsed: list[dict[str, Any]] = []

    for entry in entries:
        item = {
            "company": "",
            "title": "",
            "start_date": "",
            "end_date": "",
            "description": "",
        }
        description_lines: list[str] = []

        for line in entry:
            start_date, end_date = _extract_date_range(line.text)
            if start_date and not item["start_date"]:
                item["start_date"] = start_date
                item["end_date"] = end_date or ""
                remaining = DATE_RANGE_RE.sub("", line.text).strip(" -|")
                if remaining:
                    description_lines.append(remaining)
                continue

            if not item["company"] and _looks_like_company(line.text):
                item["company"] = line.text
                continue

            if not item["title"] and _looks_like_position(line.text):
                item["title"] = line.text
                continue

            description_lines.append(line.text)

        if not item["company"] and description_lines:
            item["company"] = description_lines.pop(0)
        if not item["title"] and description_lines:
            item["title"] = description_lines.pop(0)

        item["description"] = "\n".join(description_lines).strip()
        if any(item.values()):
            parsed.append(item)

    return parsed


def _extract_technologies(text: str) -> list[str]:
    candidates = re.split(r"[,/|]| - |\n", text)
    techs: list[str] = []
    for candidate in candidates:
        cleaned = candidate.strip(" .:-")
        if not cleaned:
            continue
        normalized = _strip_accents(cleaned).lower()
        compact = normalized.replace(" ", "")
        if compact in TECH_KEYWORDS or any(keyword in compact for keyword in TECH_KEYWORDS):
            techs.append(cleaned)
    return list(dict.fromkeys(techs))


def parse_projects(lines: list[OCRLine]) -> list[dict[str, Any]]:
    projects: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in lines:
        techs = _extract_technologies(line.text)
        has_date = bool(_extract_date_range(line.text)[0])
        looks_title = len(line.text) <= 96 and not techs and not has_date and not _looks_like_url(line.text)

        if current is None or (looks_title and (current["technologies"] or current["description"])):
            if current:
                projects.append(current)
            current = {
                "name": line.text,
                "description": "",
                "technologies": [],
                "url": "",
            }
            continue

        if techs:
            current["technologies"].extend(techs)
            current["technologies"] = list(dict.fromkeys(current["technologies"]))
            continue

        if _looks_like_url(line.text):
            current["url"] = line.text
            continue

        current["description"] = "\n".join(filter(None, [current["description"], line.text])).strip()

    if current:
        projects.append(current)

    return [project for project in projects if project["name"]]


def parse_skills(lines: list[OCRLine]) -> list[str]:
    skills: list[str] = []
    for line in lines:
        text = re.sub(r"^[•\-\*]+\s*", "", line.text).strip()
        if not text or len(text) <= 1:
            continue
        chunks = re.split(r"[,/|]\s*|\s{2,}", text)
        if len(chunks) > 1:
            for chunk in chunks:
                cleaned = chunk.strip(" .:-")
                if cleaned:
                    skills.append(cleaned)
        else:
            skills.append(text)
    return list(dict.fromkeys(skills))


def parse_education(lines: list[OCRLine]) -> list[dict[str, Any]]:
    entries = _split_entries_by_dates(lines)
    parsed: list[dict[str, Any]] = []

    for entry in entries:
        item = {
            "institution": "",
            "degree": "",
            "field_of_study": "",
            "start_date": "",
            "end_date": "",
            "gpa": "",
        }
        description_pool: list[str] = []
        for line in entry:
            start_date, end_date = _extract_date_range(line.text)
            if start_date and not item["start_date"]:
                item["start_date"] = start_date
                item["end_date"] = end_date or ""
                continue
            if not item["institution"] and (re.search(r"dai hoc|cao dang|university|college|school", _strip_accents(line.text), re.I) or _looks_like_company(line.text)):
                item["institution"] = line.text
                continue
            if not item["degree"]:
                item["degree"] = line.text
                continue
            if "gpa" in _strip_accents(line.text).lower():
                item["gpa"] = line.text
                continue
            description_pool.append(line.text)

        if not item["field_of_study"] and description_pool:
            item["field_of_study"] = description_pool[0]

        if any(item.values()):
            parsed.append(item)

    return parsed


def parse_certifications(lines: list[OCRLine]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line in lines:
        if current is None or len(line.text) <= 64:
            if current:
                items.append(current)
            current = {"name": line.text, "issuer": "", "date_obtained": ""}
            continue
        if current and not current["issuer"]:
            current["issuer"] = line.text
        elif current:
            current["date_obtained"] = line.text
    if current:
        items.append(current)
    return items


def _build_outline_nodes(lines: list[OCRLine]) -> list[dict[str, Any]]:
    if not lines:
        return []

    min_x = min(line.x for line in lines)
    offsets = sorted(offset for offset in (line.x - min_x for line in lines) if offset > 1.2)
    indent_step = max(2.4, min(offsets[0] if offsets else 4.5, 8.0))
    roots: list[dict[str, Any]] = []
    stack: list[tuple[int, dict[str, Any]]] = []

    for line in lines:
        level = max(0, min(5, round((line.x - min_x) / indent_step)))
        stripped = re.sub(r"^[•\-\*]+\s*", "", line.text).strip()
        node = {
            "id": str(uuid4()),
            "text": stripped,
            "kind": "bullet" if stripped != line.text else ("heading" if level == 0 and len(stripped) <= 72 else "paragraph"),
            "children": [],
        }

        while stack and stack[-1][0] >= level:
            stack.pop()

        if stack:
            stack[-1][1]["children"].append(node)
        else:
            roots.append(node)

        stack.append((level, node))

    return roots


def _create_builder_section(section_type: str, title: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "type": section_type,
        "title": title,
        "isVisible": True,
        "containerId": "main-column",
        "data": data,
    }


def _infer_header_and_contact(sections: list[CVSection]) -> tuple[str, str, dict[str, str | list[dict[str, str]]]]:
    preamble_lines = sections[0].lines if sections and sections[0].type == "header" else []
    name = ""
    title = ""
    contact = {"email": "", "phone": "", "address": "", "socials": []}

    for line in preamble_lines:
        if not name and not _looks_like_email(line.text) and not _looks_like_phone(line.text) and not _looks_like_url(line.text) and len(line.text) <= 48:
            name = line.text
            continue
        if not title and not _looks_like_email(line.text) and not _looks_like_phone(line.text) and len(line.text) <= 72:
            title = line.text
            continue
        if not contact["email"] and _looks_like_email(line.text):
            contact["email"] = line.text
            continue
        if not contact["phone"] and _looks_like_phone(line.text):
            contact["phone"] = line.text
            continue
        if _looks_like_url(line.text):
            network = "LinkedIn" if "linkedin" in line.text.lower() else "Link"
            contact["socials"].append({"network": network, "url": line.text})
            continue
        if not contact["address"] and _looks_like_address(line.text):
            contact["address"] = line.text

    return name, title, contact


def parse_structured_cv_from_ocr(page_results: list[OCRPageResult]) -> dict[str, Any]:
    sections = detect_cv_sections(page_results)
    raw_text = extract_full_text(page_results)
    full_name, job_title, contact = _infer_header_and_contact(sections)

    structured = {
        "full_name": full_name or None,
        "job_title": job_title or None,
        "contact": {
            "email": contact["email"] or None,
            "phone": contact["phone"] or None,
            "linkedin": next((item["url"] for item in contact["socials"] if item["network"] == "LinkedIn"), None),
            "address": contact["address"] or None,
        },
        "summary": None,
        "skills": [],
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "languages": [],
        "raw_text": raw_text,
    }

    detected_sections: list[dict[str, Any]] = []
    builder_sections: list[dict[str, Any]] = [
        _create_builder_section(
            "header",
            "",
            {"fullName": full_name, "title": job_title},
        ),
        _create_builder_section(
            "personal_info",
            "",
            {
                "email": contact["email"],
                "phone": contact["phone"],
                "address": contact["address"],
                "socials": contact["socials"],
            },
        ),
    ]

    for section in sections:
        if section.type == "header":
            continue

        section_payload: dict[str, Any] = {
            "type": section.type,
            "title": section.title,
            "content": section.content,
            "items": [],
            "line_ids": [line.id for line in section.lines],
            "block_indices": [idx for line in section.lines for idx in line.block_indices],
        }

        if section.type == "career_objective":
            structured["summary"] = section.content or None
            builder_sections.append(
                _create_builder_section("summary", section.title, {"text": section.content})
            )
        elif section.type == "work_experience":
            items = parse_work_experience(section.lines)
            structured["experience"] = items
            section_payload["items"] = items
            builder_sections.append(
                _create_builder_section(
                    "experience_list",
                    section.title,
                    {
                        "items": [
                            {
                                "id": str(uuid4()),
                                "company": item["company"],
                                "position": item["title"],
                                "startDate": item["start_date"],
                                "endDate": item["end_date"],
                                "description": item["description"],
                            }
                            for item in items
                        ],
                    },
                )
            )
        elif section.type == "projects":
            items = parse_projects(section.lines)
            structured["projects"] = items
            section_payload["items"] = items
            builder_sections.append(
                _create_builder_section(
                    "project_list",
                    section.title,
                    {
                        "items": [
                            {
                                "id": str(uuid4()),
                                "name": item["name"],
                                "role": "",
                                "startDate": "",
                                "endDate": "",
                                "description": item["description"],
                                "technologies": ", ".join(item["technologies"]),
                                "link": item["url"],
                            }
                            for item in items
                        ],
                    },
                )
            )
        elif section.type == "skills":
            items = parse_skills(section.lines)
            structured["skills"] = items
            section_payload["items"] = items
            builder_sections.append(
                _create_builder_section(
                    "skill_list",
                    section.title,
                    {
                        "items": [
                            {"id": str(uuid4()), "name": item, "level": 70}
                            for item in items
                        ],
                    },
                )
            )
        elif section.type == "education":
            items = parse_education(section.lines)
            structured["education"] = items
            section_payload["items"] = items
            builder_sections.append(
                _create_builder_section(
                    "education_list",
                    section.title,
                    {
                        "items": [
                            {
                                "id": str(uuid4()),
                                "institution": item["institution"],
                                "degree": item["degree"] or item["field_of_study"],
                                "startDate": item["start_date"],
                                "endDate": item["end_date"],
                            }
                            for item in items
                        ],
                    },
                )
            )
        elif section.type == "certifications":
            items = parse_certifications(section.lines)
            structured["certifications"] = items
            section_payload["items"] = items
            builder_sections.append(
                _create_builder_section(
                    "certificate_list",
                    section.title,
                    {
                        "items": [
                            {
                                "id": str(uuid4()),
                                "name": item["name"],
                                "issuer": item["issuer"],
                                "date": item["date_obtained"],
                            }
                            for item in items
                        ],
                    },
                )
            )
        else:
            builder_sections.append(
                _create_builder_section(
                    "rich_outline",
                    section.title,
                    {"nodes": _build_outline_nodes(section.lines)},
                )
            )

        detected_sections.append(section_payload)

    return {
        "data": structured,
        "detected_sections": detected_sections,
        "builder_sections": builder_sections,
        "raw_text": raw_text,
    }
