from __future__ import annotations

from html import escape
from typing import Any


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _first_non_empty(*values: Any) -> str:
    for value in values:
        text = _clean_text(value)
        if text:
            return text
    return ""


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def _dedupe_texts(values: list[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = _clean_text(value)
        if not cleaned:
            continue
        normalized = "".join(char.lower() for char in cleaned if char.isalnum())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        output.append(cleaned)
    return output


def _render_list(items: list[str]) -> str:
    if not items:
        return ""
    body = "".join(f"<li>{escape(item)}</li>" for item in items)
    return f"<ul>{body}</ul>"


def _render_experience(items: list[dict[str, Any]]) -> str:
    if not items:
        return ""

    chunks: list[str] = []
    for item in items:
        company = _first_non_empty(item.get("company"), item.get("organization"))
        role = _first_non_empty(item.get("title"), item.get("role"), item.get("position"))
        start_date = _clean_text(item.get("start_date"))
        end_date = _clean_text(item.get("end_date"))
        date_label = " - ".join(part for part in [start_date, end_date] if part)

        description = _clean_text(item.get("description"))
        bullets = _dedupe_texts([segment.strip("- ") for segment in description.replace("\r", "").split("\n") if segment.strip()])
        if not bullets and description:
            bullets = _dedupe_texts([segment.strip() for segment in description.split(";") if segment.strip()])

        parts: list[str] = ["<article>"]
        title_line = " - ".join(part for part in [role, company] if part)
        if title_line:
            parts.append(f"<h3>{escape(title_line)}</h3>")
        if date_label:
            parts.append(f"<p>{escape(date_label)}</p>")
        if bullets:
            parts.append(_render_list(bullets))
        elif description:
            parts.append(f"<p>{escape(description)}</p>")
        parts.append("</article>")
        chunks.append("".join(parts))

    return "".join(chunks)


def _render_education(items: list[dict[str, Any]]) -> str:
    if not items:
        return ""

    chunks: list[str] = []
    for item in items:
        school = _first_non_empty(item.get("institution"), item.get("school"))
        degree = _first_non_empty(item.get("degree"), item.get("major"), item.get("field_of_study"))
        start_date = _clean_text(item.get("start_date"))
        end_date = _clean_text(item.get("end_date"))
        gpa = _clean_text(item.get("gpa"))

        details = [part for part in [" - ".join(part for part in [start_date, end_date] if part), f"GPA: {gpa}" if gpa else ""] if part]
        parts: list[str] = ["<article>"]
        title_line = " - ".join(part for part in [school, degree] if part)
        if title_line:
            parts.append(f"<h3>{escape(title_line)}</h3>")
        if details:
            parts.append(f"<p>{escape(' | '.join(details))}</p>")
        parts.append("</article>")
        chunks.append("".join(parts))

    return "".join(chunks)


def _render_projects(items: list[dict[str, Any]]) -> str:
    if not items:
        return ""

    chunks: list[str] = []
    for item in items:
        name = _first_non_empty(item.get("name"), item.get("title"))
        role = _first_non_empty(item.get("role"))
        description = _clean_text(item.get("description"))
        technologies = item.get("technologies")
        if isinstance(technologies, list):
            tech_list = _dedupe_texts([str(tech) for tech in technologies])
        else:
            tech_list = []

        parts: list[str] = ["<article>"]
        heading = " - ".join(part for part in [name, role] if part)
        if heading:
            parts.append(f"<h3>{escape(heading)}</h3>")
        if description:
            parts.append(f"<p>{escape(description)}</p>")
        if tech_list:
            parts.append(f"<p><strong>Technologies:</strong> {escape(', '.join(tech_list))}</p>")
        parts.append("</article>")
        chunks.append("".join(parts))

    return "".join(chunks)


def _coerce_skills(structured_data: dict[str, Any], mapped_sections: dict[str, Any]) -> list[str]:
    flat_skills: list[str] = []

    for raw in _as_list(structured_data.get("skills")):
        if isinstance(raw, str):
            flat_skills.append(raw)
        elif isinstance(raw, dict):
            for value in raw.values():
                if isinstance(value, list):
                    flat_skills.extend(str(item) for item in value)
                elif isinstance(value, str):
                    flat_skills.append(value)

    mapped_skills = mapped_sections.get("skills") if isinstance(mapped_sections, dict) else None
    if isinstance(mapped_skills, dict):
        for value in mapped_skills.values():
            if isinstance(value, list):
                flat_skills.extend(str(item) for item in value)

    return _dedupe_texts(flat_skills)


def _coerce_contacts(structured_data: dict[str, Any], mapped_sections: dict[str, Any]) -> list[str]:
    contacts = structured_data.get("contact") if isinstance(structured_data.get("contact"), dict) else {}
    personal = mapped_sections.get("personal_info") if isinstance(mapped_sections, dict) and isinstance(mapped_sections.get("personal_info"), dict) else {}

    first_link = ""
    links_value = personal.get("links")
    if isinstance(links_value, list):
        for item in links_value:
            if isinstance(item, str) and item.strip():
                first_link = item.strip()
                break
            if isinstance(item, dict):
                candidate = _first_non_empty(item.get("url"), item.get("label"))
                if candidate:
                    first_link = candidate
                    break
    elif isinstance(links_value, str):
        first_link = links_value.strip()

    contact_values = [
        _first_non_empty(contacts.get("email"), personal.get("email")),
        _first_non_empty(contacts.get("phone"), personal.get("phone")),
        _first_non_empty(contacts.get("linkedin"), first_link),
        _first_non_empty(contacts.get("address"), personal.get("address"), personal.get("location")),
    ]

    return _dedupe_texts([value for value in contact_values if value])


def _render_raw_text_fallback(raw_text: str) -> str:
    lines = _dedupe_texts([line.strip() for line in str(raw_text or "").splitlines() if line.strip()])
    if not lines:
        return ""
    return "".join(f"<p>{escape(line)}</p>" for line in lines)


def render_clean_cv_html(
    *,
    structured_data: dict[str, Any] | None,
    mapped_sections: dict[str, Any] | None,
    raw_text: str,
) -> str:
    data = structured_data if isinstance(structured_data, dict) else {}
    mapped = mapped_sections if isinstance(mapped_sections, dict) else {}

    profile = data.get("profile") if isinstance(data.get("profile"), dict) else {}
    candidate = mapped.get("candidate") if isinstance(mapped.get("candidate"), dict) else {}

    full_name = _first_non_empty(data.get("full_name"), profile.get("full_name"), candidate.get("name"))
    job_title = _first_non_empty(data.get("job_title"), profile.get("job_title"), candidate.get("job_title"))

    summary = _first_non_empty(data.get("summary"), profile.get("summary"), (mapped.get("summary") or {}).get("text") if isinstance(mapped.get("summary"), dict) else "")
    objective = _first_non_empty(data.get("career_objective"), profile.get("career_objective"), (mapped.get("career_objective") or {}).get("text") if isinstance(mapped.get("career_objective"), dict) else "")

    skills = _coerce_skills(data, mapped)
    contacts = _coerce_contacts(data, mapped)

    experience_items = [item for item in _as_list(data.get("experience")) if isinstance(item, dict)]
    education_items = [item for item in _as_list(data.get("education")) if isinstance(item, dict)]
    project_items = [item for item in _as_list(data.get("projects")) if isinstance(item, dict)]

    sections: list[str] = []
    if summary:
        sections.append(f"<section><h2>Summary</h2><p>{escape(summary)}</p></section>")
    if objective:
        sections.append(f"<section><h2>Career Objective</h2><p>{escape(objective)}</p></section>")
    if skills:
        sections.append(f"<section><h2>Skills</h2>{_render_list(skills)}</section>")

    experience_html = _render_experience(experience_items)
    if experience_html:
        sections.append(f"<section><h2>Experience</h2>{experience_html}</section>")

    education_html = _render_education(education_items)
    if education_html:
        sections.append(f"<section><h2>Education</h2>{education_html}</section>")

    projects_html = _render_projects(project_items)
    if projects_html:
        sections.append(f"<section><h2>Projects</h2>{projects_html}</section>")

    if not sections:
        fallback = _render_raw_text_fallback(raw_text)
        if fallback:
            sections.append(f"<section><h2>Extracted Content</h2>{fallback}</section>")

    contacts_html = _render_list(contacts)
    header_parts = []
    if full_name:
        header_parts.append(f"<h1>{escape(full_name)}</h1>")
    if job_title:
        header_parts.append(f"<p>{escape(job_title)}</p>")
    if contacts_html:
        header_parts.append(contacts_html)

    header_html = "".join(header_parts)

    return (
        "<article class=\"cv-document\">"
        f"<header>{header_html}</header>"
        f"<main>{''.join(sections)}</main>"
        "</article>"
    )
