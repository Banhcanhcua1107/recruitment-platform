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
    column: str = "full_width"
    block_indices: list[int] = field(default_factory=list)


@dataclass
class CVSection:
    type: str
    title: str
    lines: list[OCRLine] = field(default_factory=list)

    @property
    def content(self) -> str:
        return "\n".join(line.text for line in self.lines).strip()


@dataclass
class OCRLayoutBlock:
    index: int
    page: int
    text: str
    x: float
    y: float
    width: float
    height: float
    center_x: float
    center_y: float
    column: str = "full_width"


@dataclass
class PageColumnLayout:
    page: int
    split_x: float | None
    mode: str = "single_column"
    blocks: list[OCRLayoutBlock] = field(default_factory=list)


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

MIN_COLUMN_BLOCKS = 6
MIN_COLUMN_GAP = 12.0
MAX_FULL_WIDTH_BLOCK_RATIO = 0.62
MIN_CLUSTER_SHARE = 0.18


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


def _run_1d_kmeans(values: list[float], iterations: int = 12) -> tuple[float, float]:
    if not values:
        return (0.0, 0.0)
    if len(values) == 1:
        return (values[0], values[0])

    sorted_values = sorted(values)
    left_center = sorted_values[max(0, len(sorted_values) // 4)]
    right_center = sorted_values[min(len(sorted_values) - 1, (len(sorted_values) * 3) // 4)]

    for _ in range(iterations):
        left_bucket: list[float] = []
        right_bucket: list[float] = []
        for value in values:
            if abs(value - left_center) <= abs(value - right_center):
                left_bucket.append(value)
            else:
                right_bucket.append(value)

        if not left_bucket or not right_bucket:
            midpoint = sum(sorted_values) / len(sorted_values)
            left_bucket = [value for value in values if value <= midpoint]
            right_bucket = [value for value in values if value > midpoint]
            if not left_bucket or not right_bucket:
                return (sorted_values[0], sorted_values[-1])

        new_left = sum(left_bucket) / len(left_bucket)
        new_right = sum(right_bucket) / len(right_bucket)
        if abs(new_left - left_center) < 0.01 and abs(new_right - right_center) < 0.01:
            break
        left_center, right_center = new_left, new_right

    return tuple(sorted((left_center, right_center)))


def _build_page_layout(page: OCRPageResult, block_offset: int) -> PageColumnLayout:
    blocks: list[OCRLayoutBlock] = []
    for local_index, block in enumerate(page.blocks):
        text = _clean_line_text(block.text)
        if not text:
            continue
        x = block.rect_x
        y = block.rect_y
        width = block.rect_w
        height = block.rect_h
        blocks.append(
            OCRLayoutBlock(
                index=block_offset + local_index,
                page=page.page,
                text=text,
                x=x,
                y=y,
                width=width,
                height=height,
                center_x=x + width / 2,
                center_y=y + height / 2,
            )
        )

    if len(blocks) < MIN_COLUMN_BLOCKS:
        return PageColumnLayout(page=page.page, split_x=None, mode="single_column", blocks=blocks)

    left_center, right_center = _run_1d_kmeans([block.center_x for block in blocks])
    if (right_center - left_center) < MIN_COLUMN_GAP:
        return PageColumnLayout(page=page.page, split_x=None, mode="single_column", blocks=blocks)

    split_x = (left_center + right_center) / 2
    left_cluster = [block for block in blocks if block.center_x <= split_x]
    right_cluster = [block for block in blocks if block.center_x > split_x]
    if (
        not left_cluster
        or not right_cluster
        or min(len(left_cluster), len(right_cluster)) / len(blocks) < MIN_CLUSTER_SHARE
    ):
        return PageColumnLayout(page=page.page, split_x=None, mode="single_column", blocks=blocks)

    for block in blocks:
        overlaps_split = block.x < split_x < (block.x + block.width)
        if overlaps_split and block.width >= MAX_FULL_WIDTH_BLOCK_RATIO * 100:
            block.column = "full_width"
        elif block.center_x < split_x:
            block.column = "left"
        else:
            block.column = "right"

    full_width_blocks = [block for block in blocks if block.column == "full_width"]
    if not full_width_blocks:
        mode = "two_column"
    else:
        column_blocks = [block for block in blocks if block.column in {"left", "right"}]
        if not column_blocks:
            mode = "single_column"
        else:
            top_column_y = min(block.y for block in column_blocks)
            bottom_column_y = max(block.y + block.height for block in column_blocks)
            top_full = [block for block in full_width_blocks if block.y + block.height <= top_column_y + 0.5]
            bottom_full = [block for block in full_width_blocks if block.y >= bottom_column_y - 0.5]
            if top_full and bottom_full:
                mode = "header_two_columns_footer"
            elif top_full:
                mode = "header_two_columns"
            elif bottom_full:
                mode = "two_columns_footer"
            else:
                mode = "hybrid"

    return PageColumnLayout(page=page.page, split_x=split_x, mode=mode, blocks=blocks)


def detect_columns(page_results: list[OCRPageResult]) -> list[PageColumnLayout]:
    layouts: list[PageColumnLayout] = []
    block_offset = 0
    for page in page_results:
        layouts.append(_build_page_layout(page, block_offset))
        block_offset += len(page.blocks)
    return layouts


def _merge_blocks_into_lines(blocks: list[OCRLayoutBlock]) -> list[OCRLine]:
    lines: list[OCRLine] = []

    for block in sorted(blocks, key=lambda item: (item.y, item.x)):
        matched_line: OCRLine | None = None
        for existing in reversed(lines):
            existing_center_y = existing.y + existing.height / 2
            horizontal_gap = max(
                block.x - (existing.x + existing.width),
                existing.x - (block.x + block.width),
                0.0,
            )
            if (
                abs(block.center_y - existing_center_y) <= max(existing.height, block.height) * 0.55
                and horizontal_gap <= 6.0
            ):
                matched_line = existing
                break

        if matched_line is None:
            lines.append(
                OCRLine(
                    id=f"{block.page}-{block.index}",
                    page=block.page,
                    text=block.text,
                    x=block.x,
                    y=block.y,
                    width=block.width,
                    height=block.height,
                    font_size=block.height,
                    column=block.column,
                    block_indices=[block.index],
                )
            )
            continue

        matched_line.text = _clean_line_text(f"{matched_line.text} {block.text}")
        right_edge = max(matched_line.x + matched_line.width, block.x + block.width)
        bottom_edge = max(matched_line.y + matched_line.height, block.y + block.height)
        matched_line.x = min(matched_line.x, block.x)
        matched_line.y = min(matched_line.y, block.y)
        matched_line.width = right_edge - matched_line.x
        matched_line.height = bottom_edge - matched_line.y
        matched_line.font_size = max(matched_line.font_size, block.height)
        matched_line.block_indices.append(block.index)

    return sorted(lines, key=lambda line: (line.y, line.x))


def _order_page_lines(layout: PageColumnLayout) -> list[OCRLine]:
    if layout.split_x is None:
        return _merge_blocks_into_lines(layout.blocks)

    blocks_by_column = {
        "full_width": [block for block in layout.blocks if block.column == "full_width"],
        "left": [block for block in layout.blocks if block.column == "left"],
        "right": [block for block in layout.blocks if block.column == "right"],
    }
    left_lines = _merge_blocks_into_lines(blocks_by_column["left"])
    right_lines = _merge_blocks_into_lines(blocks_by_column["right"])
    full_width_lines = _merge_blocks_into_lines(blocks_by_column["full_width"])

    column_lines = left_lines + right_lines
    if not column_lines:
        return full_width_lines

    top_column_y = min(line.y for line in column_lines)
    bottom_column_y = max(line.y + line.height for line in column_lines)
    top_full_width = [line for line in full_width_lines if line.y + line.height <= top_column_y + 0.5]
    middle_full_width = [
        line
        for line in full_width_lines
        if line not in top_full_width and line.y < bottom_column_y and (line.y + line.height) > top_column_y
    ]
    bottom_full_width = [line for line in full_width_lines if line not in top_full_width and line not in middle_full_width]

    return (
        sorted(top_full_width, key=lambda line: (line.y, line.x))
        + sorted(left_lines, key=lambda line: (line.y, line.x))
        + sorted(right_lines, key=lambda line: (line.y, line.x))
        + sorted(middle_full_width + bottom_full_width, key=lambda line: (line.y, line.x))
    )


def _split_layout_streams(layout: PageColumnLayout) -> list[list[OCRLine]]:
    if layout.split_x is None:
        single_stream = _merge_blocks_into_lines(layout.blocks)
        return [single_stream] if single_stream else []

    blocks_by_column = {
        "full_width": [block for block in layout.blocks if block.column == "full_width"],
        "left": [block for block in layout.blocks if block.column == "left"],
        "right": [block for block in layout.blocks if block.column == "right"],
    }
    left_lines = _merge_blocks_into_lines(blocks_by_column["left"])
    right_lines = _merge_blocks_into_lines(blocks_by_column["right"])
    full_width_lines = _merge_blocks_into_lines(blocks_by_column["full_width"])
    column_lines = left_lines + right_lines

    if not column_lines:
        return [full_width_lines] if full_width_lines else []

    top_column_y = min(line.y for line in column_lines)
    bottom_column_y = max(line.y + line.height for line in column_lines)
    top_full_width = [line for line in full_width_lines if line.y + line.height <= top_column_y + 0.5]
    middle_full_width = [
        line
        for line in full_width_lines
        if line not in top_full_width and line.y < bottom_column_y and (line.y + line.height) > top_column_y
    ]
    bottom_full_width = [line for line in full_width_lines if line not in top_full_width and line not in middle_full_width]

    streams: list[list[OCRLine]] = []
    for stream in (
        sorted(top_full_width, key=lambda line: (line.y, line.x)),
        sorted(left_lines, key=lambda line: (line.y, line.x)),
        sorted(right_lines, key=lambda line: (line.y, line.x)),
        sorted(middle_full_width + bottom_full_width, key=lambda line: (line.y, line.x)),
    ):
        if stream:
            streams.append(stream)
    return streams


def group_ocr_blocks_into_lines(page_results: list[OCRPageResult]) -> list[OCRLine]:
    lines: list[OCRLine] = []
    for layout in detect_columns(page_results):
        lines.extend(_order_page_lines(layout))
    return lines


def detect_cv_sections(page_results: list[OCRPageResult]) -> list[CVSection]:
    layouts = detect_columns(page_results)
    lines = [line for layout in layouts for stream in _split_layout_streams(layout) for line in stream]
    if not lines:
        return []

    median_font_size = sorted(line.font_size for line in lines)[len(lines) // 2]
    preamble = CVSection(type="header", title="Header")
    sections: list[CVSection] = []

    for layout in layouts:
        for stream in _split_layout_streams(layout):
            current_section: CVSection | None = None
            for index, line in enumerate(stream):
                prev_line = stream[index - 1] if index > 0 else None
                prev_bottom = (prev_line.y + prev_line.height) if prev_line else 0.0
                prev_gap = max(0.0, line.y - prev_bottom)
                is_heading, heading_meta = _is_probable_heading(line, median_font_size, prev_gap)

                if is_heading and heading_meta:
                    current_section = CVSection(type=heading_meta[0], title=line.text)
                    sections.append(current_section)
                    continue

                if current_section is None:
                    preamble.lines.append(line)
                    continue

                current_section.lines.append(line)

    ordered_sections: list[CVSection] = []
    if preamble.lines:
        ordered_sections.append(preamble)
    ordered_sections.extend(section for section in sections if section.lines or section.type in {"skills", "education", "work_experience", "projects", "career_objective"})
    return ordered_sections


def _build_layout_profile(layouts: list[PageColumnLayout]) -> dict[str, Any]:
    if not layouts:
        return {"document_mode": "unknown", "pages": []}

    page_modes = [layout.mode for layout in layouts]
    if any(mode in {"header_two_columns", "header_two_columns_footer", "hybrid"} for mode in page_modes):
        document_mode = "mixed_columns"
    elif any(mode in {"two_column", "two_columns_footer"} for mode in page_modes):
        document_mode = "two_column"
    else:
        document_mode = "single_column"

    return {
        "document_mode": document_mode,
        "pages": [
            {
                "page": layout.page,
                "mode": layout.mode,
                "split_x": round(layout.split_x, 3) if layout.split_x is not None else None,
            }
            for layout in layouts
        ],
    }


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


def _serialize_layout(layouts: list[PageColumnLayout]) -> dict[str, Any]:
    serialized_pages: list[dict[str, Any]] = []
    merged_columns: dict[str, list[dict[str, Any]]] = {"left": [], "right": [], "full_width": []}
    reading_order: list[dict[str, Any]] = []
    layout_profile = _build_layout_profile(layouts)

    for layout in layouts:
        page_columns: dict[str, list[dict[str, Any]]] = {"left": [], "right": [], "full_width": []}
        ordered_lines = _order_page_lines(layout)

        for block in sorted(layout.blocks, key=lambda item: (item.y, item.x)):
            payload = {
                "id": f"{block.page}-{block.index}",
                "page": block.page,
                "text": block.text,
                "column": block.column,
                "bbox": [block.x, block.y, block.x + block.width, block.y + block.height],
                "rect": {
                    "x": round(block.x, 3),
                    "y": round(block.y, 3),
                    "width": round(block.width, 3),
                    "height": round(block.height, 3),
                },
                "center_x": round(block.center_x, 3),
                "center_y": round(block.center_y, 3),
            }
            page_columns[block.column].append(payload)
            merged_columns[block.column].append(payload)

        for index, line in enumerate(ordered_lines):
            reading_order.append(
                {
                    "id": line.id,
                    "page": line.page,
                    "text": line.text,
                    "column": line.column,
                    "order": index,
                    "bbox": [line.x, line.y, line.x + line.width, line.y + line.height],
                    "block_indices": line.block_indices,
                }
            )

        serialized_pages.append(
            {
                "page": layout.page,
                "split_x": round(layout.split_x, 3) if layout.split_x is not None else None,
                "layout_mode": layout.mode,
                "columns": page_columns,
            }
        )

    return {
        "profile": layout_profile,
        "pages": serialized_pages,
        "columns": merged_columns,
        "reading_order": reading_order,
    }


def parse_structured_cv_from_ocr(page_results: list[OCRPageResult]) -> dict[str, Any]:
    sections = detect_cv_sections(page_results)
    layout = _serialize_layout(detect_columns(page_results))
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
    ]
    personal_info_title = "Thông tin liên hệ"
    personal_info_data = {
        "email": contact["email"],
        "phone": contact["phone"],
        "address": contact["address"],
        "socials": contact["socials"],
    }

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
        elif section.type == "contact":
            personal_info_title = section.title or personal_info_title
            contact_items: list[dict[str, str]] = []
            for line in section.lines:
                value = line.text.strip()
                if not value:
                    continue
                if _looks_like_email(value):
                    personal_info_data["email"] = value
                    structured["contact"]["email"] = value
                    contact_items.append({"kind": "email", "value": value})
                elif _looks_like_phone(value):
                    personal_info_data["phone"] = value
                    structured["contact"]["phone"] = value
                    contact_items.append({"kind": "phone", "value": value})
                elif _looks_like_url(value):
                    network = "LinkedIn" if "linkedin" in value.lower() else "Link"
                    socials = personal_info_data.setdefault("socials", [])
                    if not any(item["url"] == value for item in socials):
                        socials.append({"network": network, "url": value})
                    if network == "LinkedIn":
                        structured["contact"]["linkedin"] = value
                    contact_items.append({"kind": network.lower(), "value": value})
                elif _looks_like_address(value):
                    personal_info_data["address"] = value
                    structured["contact"]["address"] = value
                    contact_items.append({"kind": "address", "value": value})
                else:
                    contact_items.append({"kind": "text", "value": value})

            section_payload["items"] = contact_items
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

    builder_sections.insert(
        1,
        _create_builder_section(
            "personal_info",
            personal_info_title,
            personal_info_data,
        ),
    )

    return {
        "data": structured,
        "detected_sections": detected_sections,
        "builder_sections": builder_sections,
        "layout": layout,
        "raw_text": raw_text,
    }
