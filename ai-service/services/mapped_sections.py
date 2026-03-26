from __future__ import annotations

import json
import re
from typing import Any
from uuid import uuid4


SKILL_BUCKETS = (
    "programming_languages",
    "frontend",
    "backend",
    "database",
    "tools",
    "soft_skills",
    "others",
)

DOCUMENT_TYPES = {"cv", "resume", "profile", "unknown"}
LEVELS = {"student", "intern", "fresher", "junior", "middle", "senior", "unknown"}
ROLES = {
    "frontend",
    "backend",
    "fullstack",
    "mobile",
    "tester",
    "devops",
    "data",
    "uiux",
    "software-engineer",
    "unknown",
}


def build_empty_mapped_sections() -> dict[str, Any]:
    return {
        "candidate": {
            "name": "",
            "job_title": "",
            "avatar_url": "",
        },
        "personal_info": {
            "email": "",
            "phone": "",
            "address": "",
            "current_school": "",
            "academic_year": "",
            "location": "",
            "links": [],
        },
        "summary": {"text": ""},
        "career_objective": {"text": ""},
        "education": [],
        "skills": {bucket: [] for bucket in SKILL_BUCKETS},
        "projects": [],
        "experience": [],
        "certificates": [],
        "hobbies": [],
        "languages": [],
        "awards": [],
        "others": [],
    }


def build_empty_document_analysis() -> dict[str, str]:
    return {
        "document_type": "unknown",
        "level": "unknown",
        "role": "unknown",
        "render_folder": "/cv/unknown/unknown/",
    }


def _render_folder(level: str, role: str) -> str:
    safe_level = level if level in LEVELS else "unknown"
    safe_role = role if role in ROLES else "unknown"
    return f"/cv/{safe_level}/{safe_role}/"


def mapped_sections_schema_json() -> str:
    return json.dumps(build_empty_mapped_sections(), ensure_ascii=False, indent=2)


def _string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value).strip()
    return ""


def _split_items(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        items: list[str] = []
        for item in value:
            items.extend(_split_items(item))
        return items
    if isinstance(value, dict):
        if any(key in value for key in ("text", "value", "name", "title")):
            for key in ("text", "value", "name", "title"):
                if key in value:
                    return _split_items(value.get(key))
        items = []
        for key, item in value.items():
            for part in _split_items(item):
                items.append(f"{key}: {part}")
        return items

    text = _string(value)
    if not text:
        return []
    text = text.replace("•", "\n").replace("●", "\n")
    parts = re.split(r"(?:\r?\n|[;,|])", text)
    return [part.strip(" -*") for part in parts if part.strip(" -*")]


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        cleaned = re.sub(r"\s+", " ", item).strip()
        if not cleaned:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def _pick(source: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = _string(source.get(key))
        if value:
            return value
    return ""


def _normalize_text_object(value: Any) -> dict[str, str]:
    if isinstance(value, dict):
        return {"text": _pick(value, "text", "value", "content", "description")}
    return {"text": _string(value)}


def _bucket_skill(name: str) -> str:
    lowered = name.casefold()
    if lowered in {"javascript", "typescript", "python", "java", "php", "go", "golang", "ruby", "c#", "c++", "sql"}:
        return "programming_languages"
    if any(keyword in lowered for keyword in ("react", "next", "vue", "angular", "html", "css", "tailwind", "bootstrap")):
        return "frontend"
    if any(keyword in lowered for keyword in ("node", "express", "nest", "django", "flask", "laravel", "spring", ".net", "fastapi")):
        return "backend"
    if any(keyword in lowered for keyword in ("mysql", "postgres", "mongodb", "redis", "sqlite", "mariadb", "oracle")):
        return "database"
    if any(keyword in lowered for keyword in ("git", "docker", "kubernetes", "aws", "gcp", "azure", "postman", "jira", "linux")):
        return "tools"
    if any(keyword in lowered for keyword in ("communication", "teamwork", "leadership", "problem solving", "problem-solving", "collaboration")):
        return "soft_skills"
    return "others"


def _normalize_skill_buckets(value: Any) -> dict[str, list[str]]:
    buckets = {bucket: [] for bucket in SKILL_BUCKETS}
    if isinstance(value, dict):
        alias_map = {
            "programming_languages": "programming_languages",
            "languages": "programming_languages",
            "frontend": "frontend",
            "front_end": "frontend",
            "backend": "backend",
            "back_end": "backend",
            "database": "database",
            "databases": "database",
            "tools": "tools",
            "tooling": "tools",
            "soft_skills": "soft_skills",
            "softskills": "soft_skills",
            "others": "others",
        }
        for key, item in value.items():
            bucket = alias_map.get(str(key).casefold())
            parts = _split_items(item)
            if bucket:
                buckets[bucket].extend(parts)
            else:
                for part in parts:
                    buckets[_bucket_skill(part)].append(part)
    else:
        for item in _split_items(value):
            buckets[_bucket_skill(item)].append(item)

    for bucket in SKILL_BUCKETS:
        buckets[bucket] = _dedupe(buckets[bucket])
    return buckets


def _normalize_links(value: Any) -> list[dict[str, str]]:
    if isinstance(value, list):
        links = []
        for item in value:
            if isinstance(item, dict):
                url = _pick(item, "url", "link", "href", "value")
                label = _pick(item, "label", "network", "name", "type") or "Link"
                if url:
                    links.append({"label": label, "url": url})
            else:
                text = _string(item)
                if text:
                    links.append({"label": "Link", "url": text})
        return links
    if isinstance(value, dict):
        links: list[dict[str, str]] = []
        for key in ("linkedin", "github", "portfolio", "website", "facebook"):
            url = _string(value.get(key))
            if url:
                links.append({"label": key.title(), "url": url})
        if value.get("links") is not None:
            links.extend(_normalize_links(value.get("links")))
        return links
    text = _string(value)
    return [{"label": "Link", "url": text}] if text else []


def _normalize_named_list(value: Any, field_aliases: dict[str, str]) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        value = [value] if value else []

    items: list[dict[str, Any]] = []
    for entry in value:
        if isinstance(entry, dict):
            normalized = {target: _pick(entry, *aliases) for target, aliases in field_aliases.items()}
        else:
            normalized = {target: "" for target in field_aliases}
            if "name" in normalized:
                normalized["name"] = _string(entry)
            elif "school" in normalized:
                normalized["description"] = _string(entry)
            else:
                normalized[next(iter(normalized))] = _string(entry)
        if "technologies" in normalized:
            normalized["technologies"] = _dedupe(_split_items(entry.get("technologies") if isinstance(entry, dict) else []))
        if any(
            (item if isinstance(item, list) else _string(item))
            for item in normalized.values()
        ):
            items.append(normalized)
    return items


def normalize_mapped_sections(payload: Any, *, avatar_url: str | None = None) -> dict[str, Any]:
    normalized = build_empty_mapped_sections()
    if not isinstance(payload, dict):
        normalized["others"] = _dedupe(_split_items(payload))
        return normalized

    profile = payload.get("profile") if isinstance(payload.get("profile"), dict) else {}
    contact = payload.get("contact") if isinstance(payload.get("contact"), dict) else {}
    contacts = payload.get("contacts") if isinstance(payload.get("contacts"), dict) else {}
    personal_information = (
        payload.get("personal_information")
        if isinstance(payload.get("personal_information"), dict)
        else {}
    )

    normalized["candidate"] = {
        "name": _pick(
            payload.get("candidate") if isinstance(payload.get("candidate"), dict) else {},
            "name",
            "full_name",
        )
        or _string(payload.get("full_name"))
        or _pick(profile, "full_name")
        or _pick(personal_information, "name"),
        "job_title": _pick(
            payload.get("candidate") if isinstance(payload.get("candidate"), dict) else {},
            "job_title",
            "title",
            "position",
            "role",
        )
        or _string(payload.get("job_title"))
        or _pick(profile, "job_title"),
        "avatar_url": _pick(
            payload.get("candidate") if isinstance(payload.get("candidate"), dict) else {},
            "avatar_url",
            "avatar",
            "avatarUrl",
        )
        or _string(payload.get("avatar_url"))
        or (avatar_url or ""),
    }

    personal_info = (
        payload.get("personal_info") if isinstance(payload.get("personal_info"), dict) else {}
    )
    personal_source = {**personal_information, **contacts, **contact, **personal_info}
    normalized["personal_info"] = {
        "email": _pick(personal_source, "email", "mail"),
        "phone": _pick(personal_source, "phone", "mobile", "telephone"),
        "address": _pick(personal_source, "address"),
        "current_school": _pick(personal_source, "current_school", "school", "current_university"),
        "academic_year": _pick(personal_source, "academic_year", "school_year", "year_range"),
        "location": _pick(personal_source, "location", "city"),
        "links": _normalize_links(personal_source),
    }

    normalized["summary"] = _normalize_text_object(payload.get("summary") or profile.get("summary"))
    normalized["career_objective"] = _normalize_text_object(
        payload.get("career_objective") or profile.get("career_objective")
    )
    normalized["education"] = _normalize_named_list(
        payload.get("education"),
        {
            "school": ("school", "institution", "university", "college"),
            "degree": ("degree",),
            "major": ("major", "field_of_study", "specialization"),
            "gpa": ("gpa",),
            "start_date": ("start_date", "from"),
            "end_date": ("end_date", "to"),
            "description": ("description", "content", "details"),
        },
    )
    normalized["skills"] = _normalize_skill_buckets(payload.get("skills") or {})
    normalized["projects"] = _normalize_named_list(
        payload.get("projects"),
        {
            "name": ("name", "title"),
            "description": ("description", "content", "details"),
            "role": ("role", "position"),
            "start_date": ("start_date", "from"),
            "end_date": ("end_date", "to"),
            "github": ("github",),
            "url": ("url", "link"),
            "technologies": ("technologies", "tech_stack"),
        },
    )
    normalized["experience"] = _normalize_named_list(
        payload.get("experience"),
        {
            "company": ("company", "organization"),
            "role": ("role", "title", "position"),
            "description": ("description", "content", "details"),
            "start_date": ("start_date", "from"),
            "end_date": ("end_date", "to"),
        },
    )
    normalized["certificates"] = _normalize_named_list(
        payload.get("certificates") or payload.get("certifications"),
        {
            "name": ("name", "title"),
            "issuer": ("issuer", "organization"),
            "year": ("year", "date", "date_obtained"),
            "url": ("url", "link"),
        },
    )
    normalized["hobbies"] = _dedupe(_split_items(payload.get("hobbies") or payload.get("interests")))
    normalized["languages"] = _normalize_named_list(
        payload.get("languages"),
        {
            "name": ("name", "language", "title"),
            "proficiency": ("proficiency", "level", "score"),
        },
    )
    normalized["awards"] = _normalize_named_list(
        payload.get("awards"),
        {
            "name": ("name", "title"),
            "issuer": ("issuer", "organization"),
            "year": ("year", "date"),
            "description": ("description", "content", "details"),
        },
    )

    recognized = {
        "candidate",
        "personal_info",
        "summary",
        "career_objective",
        "education",
        "skills",
        "projects",
        "experience",
        "certificates",
        "certifications",
        "hobbies",
        "interests",
        "languages",
        "awards",
        "others",
        "profile",
        "contact",
        "contacts",
        "personal_information",
        "full_name",
        "job_title",
        "avatar_url",
    }
    residual = _split_items(payload.get("others"))
    for key, value in payload.items():
        if key in recognized:
            continue
        residual.extend(_split_items({key: value}))
    normalized["others"] = _dedupe(residual)
    return normalized


def has_meaningful_mapped_sections(mapped_sections: dict[str, Any]) -> bool:
    if not isinstance(mapped_sections, dict):
        return False
    candidate = mapped_sections.get("candidate") or {}
    personal = mapped_sections.get("personal_info") or {}
    summary = mapped_sections.get("summary") or {}
    objective = mapped_sections.get("career_objective") or {}
    skills = mapped_sections.get("skills") or {}
    if _string(candidate.get("name")) or _string(candidate.get("job_title")):
        return True
    if _string(personal.get("email")) or _string(personal.get("phone")):
        return True
    if _string(summary.get("text")) or _string(objective.get("text")):
        return True
    if any(skills.get(bucket) for bucket in SKILL_BUCKETS):
        return True
    return any(mapped_sections.get(key) for key in ("education", "projects", "experience", "certificates", "languages", "awards", "hobbies"))


def _analysis_text(mapped_sections: dict[str, Any]) -> str:
    mapped = normalize_mapped_sections(mapped_sections)
    fragments: list[str] = [
        mapped["candidate"]["name"],
        mapped["candidate"]["job_title"],
        mapped["summary"]["text"],
        mapped["career_objective"]["text"],
        mapped["personal_info"]["current_school"],
        mapped["personal_info"]["academic_year"],
        mapped["personal_info"]["location"],
    ]

    for bucket in SKILL_BUCKETS:
        fragments.extend(mapped["skills"].get(bucket) or [])

    for item in mapped["education"]:
        fragments.extend(
            [
                item["school"],
                item["degree"],
                item["major"],
                item["description"],
            ]
        )

    for item in mapped["projects"]:
        fragments.extend(
            [
                item["name"],
                item["description"],
                item["role"],
                *item["technologies"],
            ]
        )

    for item in mapped["experience"]:
        fragments.extend(
            [
                item["company"],
                item["role"],
                item["description"],
            ]
        )

    return " ".join(part for part in fragments if part).casefold()


def _count_keyword_hits(text: str, keywords: tuple[str, ...]) -> int:
    return sum(1 for keyword in keywords if keyword in text)


def infer_document_analysis(mapped_sections: dict[str, Any]) -> dict[str, str]:
    mapped = normalize_mapped_sections(mapped_sections)
    if not has_meaningful_mapped_sections(mapped):
        return build_empty_document_analysis()

    text = _analysis_text(mapped)
    experience_count = len(mapped["experience"])
    education_count = len(mapped["education"])
    project_count = len(mapped["projects"])

    document_type = "cv"
    if (
        mapped["summary"]["text"]
        and not experience_count
        and not education_count
        and not project_count
        and not any(mapped["skills"].get(bucket) for bucket in SKILL_BUCKETS)
    ):
        document_type = "profile"
    elif experience_count and not education_count and not project_count and not mapped["career_objective"]["text"]:
        document_type = "resume"

    level = "unknown"
    if any(keyword in text for keyword in ("intern", "internship", "thuc tap")):
        level = "intern"
    elif any(keyword in text for keyword in ("student", "sinh vien")):
        level = "student"
    elif any(keyword in text for keyword in ("fresher", "new graduate", "moi tot nghiep")):
        level = "fresher"
    else:
        year_matches = [
            int(match)
            for match in re.findall(r"(\d+)\+?\s*(?:years?|yrs?|nam)\b", text)
        ]
        max_years = max(year_matches) if year_matches else 0
        if max_years >= 5:
            level = "senior"
        elif max_years >= 3:
            level = "middle"
        elif max_years >= 1 or experience_count:
            level = "junior"
        elif mapped["personal_info"]["current_school"] or education_count:
            level = "student"
        elif project_count:
            level = "fresher"

    frontend_hits = _count_keyword_hits(
        text,
        ("frontend", "front-end", "react", "next.js", "vue", "angular", "html", "css", "tailwind"),
    )
    backend_hits = _count_keyword_hits(
        text,
        ("backend", "back-end", "node.js", "node", "express", "nestjs", "nest", "spring", "django", "api", "server"),
    )
    mobile_hits = _count_keyword_hits(
        text,
        ("mobile", "android", "ios", "flutter", "react native", "swift", "kotlin"),
    )
    tester_hits = _count_keyword_hits(
        text,
        ("tester", "qa", "quality assurance", "testing", "selenium", "cypress"),
    )
    devops_hits = _count_keyword_hits(
        text,
        ("devops", "docker", "kubernetes", "terraform", "ci/cd", "aws", "azure", "gcp"),
    )
    data_hits = _count_keyword_hits(
        text,
        ("data", "machine learning", "deep learning", "analytics", "power bi", "tableau", "pandas"),
    )
    uiux_hits = _count_keyword_hits(
        text,
        ("ui/ux", "ux/ui", "figma", "wireframe", "prototype", "product designer"),
    )

    role = "unknown"
    if "fullstack" in text or "full stack" in text or (frontend_hits and backend_hits):
        role = "fullstack"
    elif mobile_hits:
        role = "mobile"
    elif tester_hits:
        role = "tester"
    elif devops_hits:
        role = "devops"
    elif data_hits:
        role = "data"
    elif uiux_hits:
        role = "uiux"
    elif frontend_hits:
        role = "frontend"
    elif backend_hits:
        role = "backend"
    elif "software engineer" in text or "developer" in text or "engineer" in text:
        role = "software-engineer"

    return {
        "document_type": document_type,
        "level": level,
        "role": role,
        "render_folder": _render_folder(level, role),
    }


def normalize_document_analysis(
    payload: Any,
    *,
    mapped_sections: dict[str, Any] | None = None,
) -> dict[str, str]:
    inferred = infer_document_analysis(mapped_sections or {})
    if not isinstance(payload, dict):
        return inferred

    document_type = _string(payload.get("document_type")).casefold()
    level = _string(payload.get("level")).casefold()
    role = _string(payload.get("role")).casefold()

    normalized = {
        "document_type": document_type if document_type in DOCUMENT_TYPES else inferred["document_type"],
        "level": level if level in LEVELS else inferred["level"],
        "role": role if role in ROLES else inferred["role"],
    }
    normalized["render_folder"] = _render_folder(normalized["level"], normalized["role"])
    return normalized


def mapped_sections_to_structured_data(mapped_sections: dict[str, Any], *, raw_text: str) -> dict[str, Any]:
    mapped = normalize_mapped_sections(mapped_sections)
    candidate = mapped["candidate"]
    personal = mapped["personal_info"]
    links = personal.get("links") or []
    linkedin = next(
        (item.get("url") for item in links if str(item.get("label") or "").casefold() == "linkedin"),
        "",
    )

    flattened_skills = []
    for bucket in SKILL_BUCKETS:
        flattened_skills.extend(mapped["skills"].get(bucket) or [])

    return {
        "full_name": candidate["name"] or None,
        "job_title": candidate["job_title"] or None,
        "profile": {
            "full_name": candidate["name"] or None,
            "job_title": candidate["job_title"] or None,
            "summary": mapped["summary"]["text"] or None,
            "career_objective": mapped["career_objective"]["text"] or None,
        },
        "contact": {
            "email": personal["email"] or None,
            "phone": personal["phone"] or None,
            "linkedin": linkedin or None,
            "address": personal["address"] or personal["location"] or None,
            "current_school": personal["current_school"] or None,
            "academic_year": personal["academic_year"] or None,
            "location": personal["location"] or None,
            "links": links,
        },
        "summary": mapped["summary"]["text"] or None,
        "career_objective": mapped["career_objective"]["text"] or None,
        "skills": _dedupe(flattened_skills),
        "experience": [
            {
                "company": item["company"] or None,
                "title": item["role"] or None,
                "start_date": item["start_date"] or None,
                "end_date": item["end_date"] or None,
                "description": item["description"] or None,
            }
            for item in mapped["experience"]
        ],
        "education": [
            {
                "institution": item["school"] or None,
                "degree": item["degree"] or None,
                "field_of_study": item["major"] or None,
                "start_date": item["start_date"] or None,
                "end_date": item["end_date"] or None,
                "gpa": item["gpa"] or None,
                "description": item["description"] or None,
            }
            for item in mapped["education"]
        ],
        "projects": [
            {
                "name": item["name"] or None,
                "description": item["description"] or None,
                "technologies": item["technologies"] or [],
                "role": item["role"] or None,
                "start_date": item["start_date"] or None,
                "end_date": item["end_date"] or None,
                "url": item["url"] or item["github"] or None,
                "github": item["github"] or None,
            }
            for item in mapped["projects"]
        ],
        "certifications": [
            {
                "name": item["name"] or None,
                "issuer": item["issuer"] or None,
                "date_obtained": item["year"] or None,
                "url": item["url"] or None,
            }
            for item in mapped["certificates"]
        ],
        "languages": [
            item["name"] if not item["proficiency"] else f'{item["name"]} ({item["proficiency"]})'
            for item in mapped["languages"]
            if item["name"]
        ],
        "awards": mapped["awards"],
        "hobbies": mapped["hobbies"],
        "others": mapped["others"],
        "mapped_sections": mapped,
        "raw_text": raw_text,
    }


def _section(section_type: str, title: str, data: dict[str, Any], container_id: str) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "type": section_type,
        "title": title,
        "isVisible": True,
        "containerId": container_id,
        "data": data,
    }


def _outline_nodes(values: list[str], kind: str = "bullet") -> list[dict[str, Any]]:
    return [
        {
            "id": str(uuid4()),
            "text": value,
            "kind": kind,
            "children": [],
        }
        for value in values
        if value
    ]


def build_builder_sections_from_mapped_sections(mapped_sections: dict[str, Any]) -> list[dict[str, Any]]:
    mapped = normalize_mapped_sections(mapped_sections)
    candidate = mapped["candidate"]
    personal = mapped["personal_info"]
    sections: list[dict[str, Any]] = [
        _section(
            "header",
            "",
            {
                "fullName": candidate["name"],
                "title": candidate["job_title"],
                "avatarUrl": candidate["avatar_url"] or None,
            },
            "main-column",
        ),
        _section(
            "personal_info",
            "Thong tin ca nhan",
            {
                "email": personal["email"],
                "phone": personal["phone"],
                "address": personal["address"] or personal["location"],
                "socials": [
                    {"network": item["label"], "url": item["url"]}
                    for item in personal.get("links") or []
                ],
            },
            "sidebar-column",
        ),
    ]

    if mapped["summary"]["text"]:
        sections.append(_section("summary", "Tong quan", {"text": mapped["summary"]["text"]}, "main-column"))

    if mapped["career_objective"]["text"]:
        sections.append(
            _section(
                "summary",
                "Muc tieu nghe nghiep",
                {"text": mapped["career_objective"]["text"]},
                "main-column",
            )
        )

    if mapped["experience"]:
        sections.append(
            _section(
                "experience_list",
                "Kinh nghiem",
                {
                    "items": [
                        {
                            "id": str(uuid4()),
                            "company": item["company"],
                            "position": item["role"],
                            "startDate": item["start_date"],
                            "endDate": item["end_date"],
                            "description": item["description"],
                        }
                        for item in mapped["experience"]
                    ]
                },
                "main-column",
            )
        )

    if mapped["education"]:
        sections.append(
            _section(
                "education_list",
                "Hoc van",
                {
                    "items": [
                        {
                            "id": str(uuid4()),
                            "institution": item["school"],
                            "degree": " - ".join(
                                [value for value in (item["degree"], item["major"]) if value]
                            ),
                            "startDate": item["start_date"],
                            "endDate": item["end_date"],
                        }
                        for item in mapped["education"]
                    ]
                },
                "main-column",
            )
        )

    flattened_skills = []
    for bucket in SKILL_BUCKETS:
        flattened_skills.extend(mapped["skills"].get(bucket) or [])
    flattened_skills = _dedupe(flattened_skills)
    if flattened_skills:
        sections.append(
            _section(
                "skill_list",
                "Ky nang",
                {
                    "items": [
                        {"id": str(uuid4()), "name": item, "level": 70}
                        for item in flattened_skills
                    ]
                },
                "sidebar-column",
            )
        )

    if mapped["projects"]:
        sections.append(
            _section(
                "project_list",
                "Du an",
                {
                    "items": [
                        {
                            "id": str(uuid4()),
                            "name": item["name"],
                            "role": item["role"],
                            "startDate": item["start_date"],
                            "endDate": item["end_date"],
                            "description": item["description"],
                            "technologies": ", ".join(item["technologies"]),
                            "link": item["url"] or item["github"],
                        }
                        for item in mapped["projects"]
                    ]
                },
                "main-column",
            )
        )

    if mapped["certificates"]:
        sections.append(
            _section(
                "certificate_list",
                "Chung chi",
                {
                    "items": [
                        {
                            "id": str(uuid4()),
                            "name": item["name"],
                            "issuer": item["issuer"],
                            "date": item["year"],
                            "url": item["url"] or None,
                        }
                        for item in mapped["certificates"]
                    ]
                },
                "main-column",
            )
        )

    if mapped["awards"]:
        sections.append(
            _section(
                "award_list",
                "Giai thuong",
                {
                    "items": [
                        {
                            "id": str(uuid4()),
                            "title": item["name"],
                            "date": item["year"],
                            "issuer": item["issuer"],
                            "description": item["description"],
                        }
                        for item in mapped["awards"]
                    ]
                },
                "main-column",
            )
        )

    if mapped["languages"]:
        sections.append(
            _section(
                "rich_outline",
                "Ngon ngu",
                {
                    "nodes": _outline_nodes(
                        [
                            item["name"] if not item["proficiency"] else f'{item["name"]}: {item["proficiency"]}'
                            for item in mapped["languages"]
                            if item["name"]
                        ]
                    )
                },
                "main-column",
            )
        )

    if mapped["hobbies"]:
        sections.append(
            _section(
                "rich_outline",
                "So thich",
                {"nodes": _outline_nodes(mapped["hobbies"])},
                "main-column",
            )
        )

    personal_extras = _dedupe(
        [
            f'Truong hien tai: {personal["current_school"]}' if personal["current_school"] else "",
            f'Nien khoa: {personal["academic_year"]}' if personal["academic_year"] else "",
            f'Dia diem: {personal["location"]}' if personal["location"] else "",
        ]
    )
    if personal_extras:
        sections.append(
            _section(
                "rich_outline",
                "Thong tin bo sung",
                {"nodes": _outline_nodes(personal_extras)},
                "main-column",
            )
        )

    if mapped["others"]:
        sections.append(
            _section(
                "rich_outline",
                "Noi dung khac",
                {"nodes": _outline_nodes(mapped["others"], kind="paragraph")},
                "main-column",
            )
        )

    return sections
