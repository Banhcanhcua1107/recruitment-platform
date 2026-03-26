import type {
  NormalizedOcrBlock,
  NormalizedOcrPage,
  NormalizedOcrResult,
  OcrBbox,
  OcrPoint,
  ScaledOcrBbox,
} from "@/features/ocr-viewer/types";

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampPositive(value: number | null | undefined) {
  return value && Number.isFinite(value) && value > 0 ? value : 0;
}

function toStringValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function normalizeType(value: unknown, fallback = "text") {
  const normalized = toStringValue(value)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_/-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function objectWithKeys(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPoint(value: unknown): OcrPoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = toNumber(value[0]);
    const y = toNumber(value[1]);
    if (x != null && y != null) return { x, y };
  }

  if (objectWithKeys(value)) {
    const x = toNumber(value.x ?? value.X ?? value.left);
    const y = toNumber(value.y ?? value.Y ?? value.top);
    if (x != null && y != null) return { x, y };
  }

  return null;
}

function toPoints(value: unknown): OcrPoint[] | null {
  if (!Array.isArray(value)) return null;
  const points = value.map(toPoint).filter(Boolean) as OcrPoint[];
  return points.length >= 2 ? points : null;
}

export function polygonToRect(points: Array<OcrPoint | [number, number] | Record<string, unknown>>) {
  const normalizedPoints = points.map(toPoint).filter(Boolean) as OcrPoint[];
  if (!normalizedPoints.length) {
    return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
  }

  const xValues = normalizedPoints.map((point) => point.x);
  const yValues = normalizedPoints.map((point) => point.y);

  return {
    xMin: Math.min(...xValues),
    yMin: Math.min(...yValues),
    xMax: Math.max(...xValues),
    yMax: Math.max(...yValues),
  };
}

function rectFromObject(value: Record<string, unknown>): OcrBbox | null {
  if ("xMin" in value || "xmin" in value || "x_max" in value || "xMax" in value) {
    const xMin = toNumber(value.xMin ?? value.xmin);
    const yMin = toNumber(value.yMin ?? value.ymin);
    const xMax = toNumber(value.xMax ?? value.xmax ?? value.x_max);
    const yMax = toNumber(value.yMax ?? value.ymax ?? value.y_max);
    if (xMin != null && yMin != null && xMax != null && yMax != null) {
      return {
        xMin: Math.min(xMin, xMax),
        yMin: Math.min(yMin, yMax),
        xMax: Math.max(xMin, xMax),
        yMax: Math.max(yMin, yMax),
      };
    }
  }

  if ("left" in value || "top" in value || "right" in value || "bottom" in value) {
    const left = toNumber(value.left);
    const top = toNumber(value.top);
    const right = toNumber(value.right);
    const bottom = toNumber(value.bottom);
    if (left != null && top != null && right != null && bottom != null) {
      return {
        xMin: Math.min(left, right),
        yMin: Math.min(top, bottom),
        xMax: Math.max(left, right),
        yMax: Math.max(top, bottom),
      };
    }
  }

  if ("x" in value || "y" in value || "width" in value || "height" in value) {
    const x = toNumber(value.x);
    const y = toNumber(value.y);
    const width = toNumber(value.width ?? value.w);
    const height = toNumber(value.height ?? value.h);
    if (x != null && y != null && width != null && height != null) {
      return {
        xMin: x,
        yMin: y,
        xMax: x + Math.max(0, width),
        yMax: y + Math.max(0, height),
      };
    }
  }

  return null;
}

function rectFromArray(value: unknown[]): OcrBbox | null {
  if (value.length === 4 && value.every((item) => typeof item === "number" || typeof item === "string")) {
    const numbers = value.map((item) => toNumber(item));
    if (numbers.every((item) => item != null)) {
      const [first, second, third, fourth] = numbers as number[];
      const treatAsXYWH = third >= 0 && fourth >= 0 && (third < first || fourth < second);
      if (treatAsXYWH) {
        return {
          xMin: first,
          yMin: second,
          xMax: first + third,
          yMax: second + fourth,
        };
      }

      return {
        xMin: Math.min(first, third),
        yMin: Math.min(second, fourth),
        xMax: Math.max(first, third),
        yMax: Math.max(second, fourth),
      };
    }
  }

  const points = toPoints(value);
  return points ? polygonToRect(points) : null;
}

function toRect(value: unknown): OcrBbox | null {
  if (!value) return null;
  if (Array.isArray(value)) return rectFromArray(value);
  if (objectWithKeys(value)) return rectFromObject(value);
  return null;
}

function inferRectFromNode(node: Record<string, unknown>): OcrBbox | null {
  const directRect =
    toRect(node.bbox) ??
    toRect(node.rect) ??
    toRect(node.box) ??
    toRect(node.position) ??
    toRect(node.location) ??
    toRect(node.points) ??
    toRect(node.polygon);

  if (directRect) {
    return directRect;
  }

  const polygon = toPoints(node.polygon ?? node.points);
  return polygon ? polygonToRect(polygon) : null;
}

function inferPolygonFromNode(node: Record<string, unknown>): OcrPoint[] | undefined {
  const polygon = toPoints(node.polygon ?? node.points ?? node.vertices);
  return polygon ?? undefined;
}

function inferText(node: Record<string, unknown>) {
  return (
    toStringValue(node.text) ||
    toStringValue(node.block_content) ||
    toStringValue(node.content) ||
    toStringValue(node.value) ||
    toStringValue(node.markdown) ||
    toStringValue(node.image_description) ||
    toStringValue(node.alt_text)
  );
}

function inferPageIndex(value: unknown, fallbackIndex: number, zeroBasedHint = false) {
  const pageNumber = toNumber(value);
  if (pageNumber == null) return fallbackIndex;
  if (zeroBasedHint || pageNumber === 0) return Math.max(0, pageNumber);
  return Math.max(0, pageNumber - 1);
}

function buildId(prefix: string, pageIndex: number, order: number, bbox: OcrBbox, type: string, text: string) {
  const textSeed = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "block";
  return [
    prefix,
    pageIndex,
    order,
    type,
    Math.round(bbox.xMin),
    Math.round(bbox.yMin),
    Math.round(bbox.xMax),
    Math.round(bbox.yMax),
    textSeed,
  ].join("-");
}

function sortBlocks(blocks: NormalizedOcrBlock[]) {
  return [...blocks].sort((left, right) => {
    const pageDiff = left.pageIndex - right.pageIndex;
    if (pageDiff !== 0) return pageDiff;
    const topDiff = left.bbox.yMin - right.bbox.yMin;
    if (Math.abs(topDiff) > 1) return topDiff;
    const leftDiff = left.bbox.xMin - right.bbox.xMin;
    if (Math.abs(leftDiff) > 1) return leftDiff;
    return left.order - right.order;
  });
}

function dedupeBlocks(blocks: NormalizedOcrBlock[]) {
  const seen = new Set<string>();
  const deduped: NormalizedOcrBlock[] = [];

  for (const block of sortBlocks(blocks)) {
    const key = [
      block.pageIndex,
      block.type,
      Math.round(block.bbox.xMin),
      Math.round(block.bbox.yMin),
      Math.round(block.bbox.xMax),
      Math.round(block.bbox.yMax),
      block.text.slice(0, 120),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(block);
  }

  return deduped;
}

function inferPageSizeFromBlocks(blocks: NormalizedOcrBlock[]) {
  const maxX = blocks.length ? Math.max(...blocks.map((block) => block.bbox.xMax)) : 0;
  const maxY = blocks.length ? Math.max(...blocks.map((block) => block.bbox.yMax)) : 0;
  return {
    width: Math.max(0, Math.ceil(maxX)),
    height: Math.max(0, Math.ceil(maxY)),
  };
}

function buildPages(
  pageCount: number,
  baseMeta: Array<Partial<NormalizedOcrPage> | undefined>,
  blocks: NormalizedOcrBlock[],
  source: NormalizedOcrResult["source"],
  warnings: string[] = [],
  meta?: Record<string, unknown>,
): NormalizedOcrResult {
  const grouped = groupBlocksByPage(blocks);
  const totalPages = Math.max(
    pageCount,
    ...Object.keys(grouped).map((key) => Number(key) + 1),
    baseMeta.length,
  );

  const pages: NormalizedOcrPage[] = Array.from({ length: totalPages }, (_, index) => {
    const pageBlocks = grouped[index] ?? [];
    const inferredSize = inferPageSizeFromBlocks(pageBlocks);
    const pageMeta = baseMeta[index] ?? {};

    return {
      pageIndex: index,
      originalWidth: clampPositive(pageMeta.originalWidth) || inferredSize.width || 1,
      originalHeight: clampPositive(pageMeta.originalHeight) || inferredSize.height || 1,
      imageUrl: pageMeta.imageUrl,
      blocks: pageBlocks,
      meta: pageMeta.meta,
    };
  });

  return {
    pages,
    source,
    warnings,
    meta,
  };
}

function normalizeLegacyPipelineResult(raw: Record<string, unknown>): NormalizedOcrResult | null {
  if (!Array.isArray(raw.pages)) return null;

  const pageMeta = (raw.pages as unknown[]).map((page, index) => {
    if (!objectWithKeys(page)) return { pageIndex: index };
    return {
      pageIndex: index,
      originalWidth: toNumber(page.image_width ?? page.originalWidth) ?? undefined,
      originalHeight: toNumber(page.image_height ?? page.originalHeight) ?? undefined,
      imageUrl: toStringValue(page.imageUrl) || undefined,
    };
  });

  const blocks: NormalizedOcrBlock[] = [];

  (raw.pages as unknown[]).forEach((page, pageArrayIndex) => {
    if (!objectWithKeys(page) || !Array.isArray(page.blocks)) return;
    const pageIndex = inferPageIndex(page.page ?? page.page_num ?? page.pageIndex, pageArrayIndex);

    page.blocks.forEach((candidate, blockIndex) => {
      if (!objectWithKeys(candidate)) return;
      const polygon = inferPolygonFromNode(candidate);
      const bbox = toRect(candidate.bbox) ?? (polygon ? polygonToRect(polygon) : null);
      if (!bbox) return;

      const text = inferText(candidate);
      blocks.push({
        id: buildId("legacy", pageIndex, blockIndex, bbox, normalizeType(candidate.type), text),
        pageIndex,
        type: normalizeType(candidate.type ?? candidate.layout_type ?? candidate.label),
        text,
        bbox,
        polygon,
        order: blockIndex,
        confidence: toNumber(candidate.confidence),
        meta: { source: "legacy-pages" },
      });
    });
  });

  return buildPages(pageMeta.length, pageMeta, dedupeBlocks(blocks), "legacy", []);
}

function inferMappedSections(parsed: Record<string, unknown>) {
  if (objectWithKeys(parsed.cleaned_json)) {
    return parsed.cleaned_json as Record<string, unknown>;
  }

  if (objectWithKeys(parsed.mapped_sections)) {
    return parsed.mapped_sections as Record<string, unknown>;
  }

  if (
    "candidate" in parsed ||
    "personal_info" in parsed ||
    "summary" in parsed ||
    "career_objective" in parsed ||
    "skills" in parsed
  ) {
    return parsed;
  }

  return null;
}

function mappedText(value: unknown) {
  if (objectWithKeys(value)) {
    return toStringValue(value.text ?? value.value ?? value.content ?? value.description);
  }

  return toStringValue(value);
}

function mappedList(value: unknown) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => mappedList(item));
  }

  if (objectWithKeys(value)) {
    if ("name" in value) {
      const name = toStringValue(value.name);
      return name ? [name] : [];
    }

    return Object.values(value).flatMap((item) => mappedList(item));
  }

  const text = toStringValue(value);
  if (!text) return [];
  return text
    .split(/\r?\n|[;,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSyntheticBlocksFromMappedSections(
  mappedSections: Record<string, unknown>,
  baseMeta: Array<Partial<NormalizedOcrPage> | undefined>,
) {
  const firstPage = baseMeta[0] ?? {};
  const pageWidth = clampPositive(firstPage.originalWidth) || 840;
  const pageHeight = clampPositive(firstPage.originalHeight) || 1188;
  const marginX = 64;
  const marginY = 48;
  const contentWidth = Math.max(260, pageWidth - marginX * 2);

  let pageIndex = 0;
  let currentY = marginY;
  let order = 0;
  const blocks: NormalizedOcrBlock[] = [];

  const ensureRoom = (height: number) => {
    if (currentY + height <= pageHeight - marginY) return;
    pageIndex += 1;
    currentY = marginY;
  };

  const pushBlock = (
    type: string,
    text: string,
    options?: {
      xMin?: number;
      width?: number;
      height?: number;
      gapAfter?: number;
      meta?: Record<string, unknown>;
    },
  ) => {
    const cleanedText = text.trim();
    if (!cleanedText) return;

    const height = options?.height ?? 18;
    ensureRoom(height + 12);

    const bbox = {
      xMin: options?.xMin ?? marginX,
      yMin: currentY,
      xMax: (options?.xMin ?? marginX) + (options?.width ?? contentWidth),
      yMax: currentY + height,
    };

    blocks.push({
      id: buildId("mapped-sections", pageIndex, order, bbox, type, cleanedText),
      pageIndex,
      type,
      text: cleanedText,
      bbox,
      order,
      confidence: 1,
      meta: {
        synthetic: true,
        source: "mapped_sections",
        ...(options?.meta ?? {}),
      },
    });

    order += 1;
    currentY += height + (options?.gapAfter ?? 10);
  };

  const pushSectionTitle = (title: string, sectionType: string) => {
    pushBlock("title", title, {
      height: 20,
      gapAfter: 12,
      meta: { semantic_section_type: sectionType },
    });
  };

  const candidate = objectWithKeys(mappedSections.candidate)
    ? (mappedSections.candidate as Record<string, unknown>)
    : {};
  const personalInfo = objectWithKeys(mappedSections.personal_info)
    ? (mappedSections.personal_info as Record<string, unknown>)
    : {};
  const summary = mappedText(mappedSections.summary);
  const careerObjective = mappedText(mappedSections.career_objective);

  const name = toStringValue(candidate.name);
  const jobTitle = toStringValue(candidate.job_title);
  if (name) {
    pushBlock("title", name, { width: Math.min(contentWidth, 420), height: 24, gapAfter: 8 });
  }
  if (jobTitle) {
    pushBlock("text", jobTitle, { width: Math.min(contentWidth, 420), gapAfter: 18 });
  }

  const contactLines = [
    toStringValue(personalInfo.email),
    toStringValue(personalInfo.phone),
    toStringValue(personalInfo.address),
    toStringValue(personalInfo.current_school)
      ? `Current school: ${toStringValue(personalInfo.current_school)}`
      : "",
    toStringValue(personalInfo.academic_year)
      ? `Academic year: ${toStringValue(personalInfo.academic_year)}`
      : "",
    toStringValue(personalInfo.location) ? `Location: ${toStringValue(personalInfo.location)}` : "",
    ...(Array.isArray(personalInfo.links)
      ? personalInfo.links
          .filter(objectWithKeys)
          .map((item) => toStringValue(item.url ?? item.link))
          .filter(Boolean)
      : []),
  ].filter(Boolean);

  if (contactLines.length) {
    pushSectionTitle("Contact Information", "contact_info");
    contactLines.forEach((line) => pushBlock("text", line, { gapAfter: 8 }));
    currentY += 12;
  }

  if (summary) {
    pushSectionTitle("Summary", "summary");
    pushBlock("text", summary, { height: 20, gapAfter: 18 });
  }

  if (careerObjective) {
    pushSectionTitle("Career Objective", "summary");
    pushBlock("text", careerObjective, { height: 20, gapAfter: 18 });
  }

  const education = Array.isArray(mappedSections.education)
    ? (mappedSections.education.filter(objectWithKeys) as Record<string, unknown>[])
    : [];
  if (education.length) {
    pushSectionTitle("Education", "education");
    education.forEach((item) => {
      const school = toStringValue(item.school);
      const subtitle = [
        toStringValue(item.degree),
        toStringValue(item.major),
        [toStringValue(item.start_date), toStringValue(item.end_date)].filter(Boolean).join(" - "),
      ]
        .filter(Boolean)
        .join(" | ");
      const gpa = toStringValue(item.gpa);
      const description = toStringValue(item.description);

      const primaryLine = school
        ? `- School: ${school}`
        : subtitle || description;
      pushBlock("text", primaryLine, { gapAfter: 8 });
      if (subtitle && subtitle !== school) {
        pushBlock("text", subtitle, { xMin: marginX + 14, gapAfter: 8 });
      }
      if (gpa) {
        pushBlock("text", `GPA: ${gpa}`, { xMin: marginX + 14, gapAfter: 8 });
      }
      if (description) {
        pushBlock("text", description, { xMin: marginX + 14, gapAfter: 10 });
      }
    });
    currentY += 10;
  }

  const skills = objectWithKeys(mappedSections.skills)
    ? (mappedSections.skills as Record<string, unknown>)
    : {};
  const skillBuckets: Array<[string, string]> = [
    ["programming_languages", "Programming Languages:"],
    ["frontend", "Front-End:"],
    ["backend", "Back-End:"],
    ["database", "Database:"],
    ["tools", "Tools:"],
    ["soft_skills", "Soft Skills:"],
    ["others", "Others:"],
  ];
  const hasSkills = skillBuckets.some(([key]) => mappedList(skills[key]).length > 0);
  if (hasSkills) {
    pushSectionTitle("Skills", "skill_group");
    skillBuckets.forEach(([key, label]) => {
      const items = mappedList(skills[key]);
      if (!items.length) return;
      pushBlock("text", `- ${label} ${items.join(", ")}`, {
        gapAfter: 8,
        meta: { semantic_bucket: key },
      });
    });
    currentY += 10;
  }

  const projects = Array.isArray(mappedSections.projects)
    ? (mappedSections.projects.filter(objectWithKeys) as Record<string, unknown>[])
    : [];
  if (projects.length) {
    pushSectionTitle("Projects", "project");
    projects.forEach((item) => {
      const title = toStringValue(item.name);
      const detailLine = [
        toStringValue(item.role),
        [toStringValue(item.start_date), toStringValue(item.end_date)].filter(Boolean).join(" - "),
      ]
        .filter(Boolean)
        .join(" | ");
      const description = toStringValue(item.description);
      const tech = mappedList(item.technologies).join(", ");
      const link = toStringValue(item.url || item.github);

      const primaryLine = title ? `Project: ${title}.` : `${description || detailLine}.`;
      pushBlock("text", primaryLine, { gapAfter: 8 });
      if (detailLine) {
        pushBlock("text", detailLine, { xMin: marginX + 14, gapAfter: 8 });
      }
      if (description) {
        pushBlock("text", description, { xMin: marginX + 14, gapAfter: 8 });
      }
      if (tech) {
        pushBlock("text", `Tech stack: ${tech}.`, { xMin: marginX + 14, gapAfter: 8 });
      }
      if (link) {
        pushBlock("text", link, { xMin: marginX + 14, gapAfter: 10 });
      }
    });
    currentY += 10;
  }

  const experience = Array.isArray(mappedSections.experience)
    ? (mappedSections.experience.filter(objectWithKeys) as Record<string, unknown>[])
    : [];
  if (experience.length) {
    pushSectionTitle("Experience", "experience");
    experience.forEach((item) => {
      const heading = [toStringValue(item.role), toStringValue(item.company)].filter(Boolean).join(" | ");
      const dateLine = [toStringValue(item.start_date), toStringValue(item.end_date)]
        .filter(Boolean)
        .join(" - ");
      const description = toStringValue(item.description);

      pushBlock("text", heading || description || dateLine, { gapAfter: 8 });
      if (dateLine) {
        pushBlock("text", dateLine, { xMin: marginX + 14, gapAfter: 8 });
      }
      if (description) {
        pushBlock("text", description, { xMin: marginX + 14, gapAfter: 10 });
      }
    });
    currentY += 10;
  }

  const certificates = Array.isArray(mappedSections.certificates)
    ? (mappedSections.certificates.filter(objectWithKeys) as Record<string, unknown>[])
    : [];
  if (certificates.length) {
    pushSectionTitle("Certifications", "certification");
    certificates.forEach((item) => {
      const line = [toStringValue(item.name), toStringValue(item.issuer), toStringValue(item.year)]
        .filter(Boolean)
        .join(" | ");
      pushBlock("text", line, { gapAfter: 8 });
      const url = toStringValue(item.url);
      if (url) {
        pushBlock("text", url, { xMin: marginX + 14, gapAfter: 8 });
      }
    });
    currentY += 10;
  }

  const languages = Array.isArray(mappedSections.languages)
    ? (mappedSections.languages.filter(objectWithKeys) as Record<string, unknown>[])
    : [];
  if (languages.length) {
    pushSectionTitle("Languages", "language");
    languages.forEach((item) => {
      const line = `- ${[toStringValue(item.name), toStringValue(item.proficiency)].filter(Boolean).join(" - ")}`;
      pushBlock("text", line, { gapAfter: 8 });
    });
    currentY += 10;
  }

  const otherLines = [
    ...mappedList(mappedSections.hobbies).map((item) => `- Hobby item: ${item}`),
    ...((Array.isArray(mappedSections.awards)
      ? mappedSections.awards.filter(objectWithKeys).map((item) =>
          ["- Award", toStringValue(item.name), toStringValue(item.issuer), toStringValue(item.year)]
            .filter(Boolean)
            .join(": "),
        )
      : []) as string[]),
    ...mappedList(mappedSections.others).map((item) => `- Other note: ${item}`),
  ].filter(Boolean);

  if (otherLines.length) {
    pushSectionTitle("Other", "other");
    otherLines.forEach((line) => pushBlock("text", line, { gapAfter: 8 }));
  }

  return blocks;
}

function normalizePersistedResult(raw: Record<string, unknown>): NormalizedOcrResult | null {
  const parsed = objectWithKeys(raw.parsed_json) ? raw.parsed_json : raw;
  const rawBlocks = Array.isArray(parsed.raw_ocr_blocks) ? parsed.raw_ocr_blocks : [];
  const layoutBlocks = Array.isArray(parsed.layout_blocks) ? parsed.layout_blocks : [];
  const mappedSections = inferMappedSections(parsed);

  if (!rawBlocks.length && !layoutBlocks.length && !Array.isArray(raw.pages) && !mappedSections) {
    return null;
  }

  const sourceBlocks = rawBlocks.length > 0 ? rawBlocks : layoutBlocks;
  const pageMeta = Array.isArray(raw.pages)
    ? (raw.pages as unknown[]).map((page, index) => {
        if (!objectWithKeys(page)) return { pageIndex: index };
        return {
          pageIndex: inferPageIndex(page.page_number ?? page.pageIndex, index),
          originalWidth: toNumber(page.canonical_width_px ?? page.originalWidth ?? page.width) ?? undefined,
          originalHeight: toNumber(page.canonical_height_px ?? page.originalHeight ?? page.height) ?? undefined,
          imageUrl: toStringValue(page.background_url ?? page.imageUrl ?? page.backgroundImageUrl) || undefined,
          meta: objectWithKeys(page) ? page : undefined,
        };
      })
    : [];

  let blocks = sourceBlocks.flatMap((candidate, blockIndex) => {
    if (!objectWithKeys(candidate)) return [];
    const pageIndex = inferPageIndex(candidate.page ?? candidate.pageIndex ?? candidate.page_num, 0);
    const polygon = inferPolygonFromNode(candidate);
    const bbox = toRect(candidate.bbox) ?? (polygon ? polygonToRect(polygon) : null);
    if (!bbox) return [];

    const text = inferText(candidate);
    return [
      {
        id: buildId("persisted", pageIndex, blockIndex, bbox, normalizeType(candidate.type), text),
        pageIndex,
        type: normalizeType(candidate.type ?? candidate.layout_type ?? candidate.label),
        text,
        bbox,
        polygon,
        order: blockIndex,
        confidence: toNumber(candidate.confidence),
        meta: objectWithKeys(candidate) ? candidate : undefined,
      } satisfies NormalizedOcrBlock,
    ];
  });

  if (!blocks.length && mappedSections) {
    blocks = buildSyntheticBlocksFromMappedSections(mappedSections, pageMeta);
  }

  return buildPages(pageMeta.length, pageMeta, dedupeBlocks(blocks), "persisted", []);
}

function collectSyncCandidates(node: unknown, output: Array<Record<string, unknown>>) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectSyncCandidates(item, output));
    return;
  }

  if (!objectWithKeys(node)) return;

  const rect = inferRectFromNode(node);
  const type = node.type ?? node.label ?? node.category ?? node.block_label ?? node.layoutType ?? node.blockType;
  if (rect && type != null) {
    output.push(node);
  }

  Object.values(node).forEach((value) => {
    if (typeof value === "object" && value != null) {
      collectSyncCandidates(value, output);
    }
  });
}

function normalizeSyncResult(raw: Record<string, unknown>): NormalizedOcrResult | null {
  const root = objectWithKeys(raw.result) ? raw.result : raw;
  const layoutPages = Array.isArray(root.layoutParsingResults) ? root.layoutParsingResults : null;
  if (!layoutPages?.length) return null;

  const blocks: NormalizedOcrBlock[] = [];
  const pageMeta: Array<Partial<NormalizedOcrPage>> = [];

  layoutPages.forEach((page, index) => {
    if (!objectWithKeys(page)) return;
    const candidates: Array<Record<string, unknown>> = [];
    if (Array.isArray(page.layouts)) {
      collectSyncCandidates(page.layouts, candidates);
    } else if (Array.isArray(page.prunedResult)) {
      collectSyncCandidates(page.prunedResult, candidates);
    } else if (Array.isArray(page.parsing_res_list)) {
      collectSyncCandidates(page.parsing_res_list, candidates);
    } else {
      collectSyncCandidates(page, candidates);
    }

    const pageIndex = inferPageIndex(page.pageIndex ?? page.page_num ?? page.page ?? page.pageNumber, index, true);
    const meta = objectWithKeys(page.meta) ? page.meta : {};

    pageMeta[pageIndex] = {
      pageIndex,
      originalWidth:
        toNumber(page.width ?? page.imageWidth ?? page.image_width ?? meta.page_width ?? meta.width) ?? undefined,
      originalHeight:
        toNumber(page.height ?? page.imageHeight ?? page.image_height ?? meta.page_height ?? meta.height) ??
        undefined,
      imageUrl:
        toStringValue(page.inputImage) ||
        toStringValue(page.input_image) ||
        toStringValue(page.imageUrl) ||
        undefined,
    };

    candidates.forEach((candidate, candidateIndex) => {
      const bbox = inferRectFromNode(candidate);
      if (!bbox) return;

      const polygon = inferPolygonFromNode(candidate);
      const text = inferText(candidate);
      blocks.push({
        id: buildId(
          "sync",
          pageIndex,
          candidateIndex,
          bbox,
          normalizeType(candidate.type ?? candidate.label ?? candidate.category),
          text,
        ),
        pageIndex,
        type: normalizeType(candidate.type ?? candidate.label ?? candidate.category ?? candidate.block_label),
        text,
        bbox,
        polygon,
        order: candidateIndex,
        confidence: toNumber(candidate.score ?? candidate.confidence),
        meta: candidate,
      });
    });
  });

  return buildPages(layoutPages.length, pageMeta, dedupeBlocks(blocks), "sync", []);
}

function normalizeAsyncResult(raw: Record<string, unknown> | unknown[]): NormalizedOcrResult | null {
  const pagePayloads = Array.isArray(raw)
    ? raw.flatMap((item, index) => {
        if (objectWithKeys(item) && Array.isArray(item.pages)) return item.pages;
        if (objectWithKeys(item) && (Array.isArray(item.layouts) || objectWithKeys(item.meta))) {
          return [{ ...item, __fallback_index: index }];
        }
        return [];
      })
    : objectWithKeys(raw.result) && Array.isArray(raw.result.pages)
      ? raw.result.pages
      : objectWithKeys(raw) && Array.isArray(raw.pages)
        ? raw.pages
        : [];

  if (!pagePayloads.length) return null;

  const pageMeta: Array<Partial<NormalizedOcrPage>> = [];
  const blocks: NormalizedOcrBlock[] = [];

  pagePayloads.forEach((page, index) => {
    if (!objectWithKeys(page)) return;
    const zeroBasedHint = page.page_num === 0 || page.pageIndex === 0;
    const pageIndex = inferPageIndex(
      page.page_num ?? page.pageIndex ?? page.page ?? page.page_number ?? page.__fallback_index,
      index,
      zeroBasedHint,
    );
    const meta = objectWithKeys(page.meta) ? page.meta : {};

    pageMeta[pageIndex] = {
      pageIndex,
      originalWidth:
        toNumber(meta.page_width ?? meta.width ?? page.width ?? page.originalWidth ?? page.image_width) ?? undefined,
      originalHeight:
        toNumber(meta.page_height ?? meta.height ?? page.height ?? page.originalHeight ?? page.image_height) ??
        undefined,
      imageUrl: toStringValue(page.imageUrl) || undefined,
      meta: page,
    };

    const pushCandidate = (
      candidate: Record<string, unknown>,
      order: number,
      fallbackType: string,
      fallbackText = "",
    ) => {
      const polygon = inferPolygonFromNode(candidate);
      const bbox = inferRectFromNode(candidate) ?? (polygon ? polygonToRect(polygon) : null);
      if (!bbox) return;
      const text = inferText(candidate) || fallbackText;
      const type = normalizeType(candidate.type ?? candidate.label ?? fallbackType);
      blocks.push({
        id: buildId("async", pageIndex, order, bbox, type, text),
        pageIndex,
        type,
        text,
        bbox,
        polygon,
        order,
        confidence: toNumber(candidate.confidence ?? candidate.score),
        meta: candidate,
      });
    };

    const layoutIds = new Set<string>();
    if (Array.isArray(page.layouts)) {
      page.layouts.forEach((layout, layoutIndex) => {
        if (!objectWithKeys(layout)) return;
        const layoutId = toStringValue(layout.layout_id);
        if (layoutId) layoutIds.add(layoutId);
        const position = Array.isArray(layout.position)
          ? [
              layout.position[0],
              layout.position[1],
              Number(layout.position[0]) + Number(layout.position[2]),
              Number(layout.position[1]) + Number(layout.position[3]),
            ]
          : layout.position;
        pushCandidate({ ...layout, bbox: position }, layoutIndex, "text");
      });
    }

    if (Array.isArray(page.tables)) {
      page.tables.forEach((table, tableIndex) => {
        if (!objectWithKeys(table)) return;
        const layoutId = toStringValue(table.layout_id);
        if (layoutId && layoutIds.has(layoutId)) return;
        const position = Array.isArray(table.position)
          ? [
              table.position[0],
              table.position[1],
              Number(table.position[0]) + Number(table.position[2]),
              Number(table.position[1]) + Number(table.position[3]),
            ]
          : table.position;
        pushCandidate(
          { ...table, type: "table", bbox: position },
          10_000 + tableIndex,
          "table",
          toStringValue(table.markdown),
        );
      });
    }

    if (Array.isArray(page.images)) {
      page.images.forEach((image, imageIndex) => {
        if (!objectWithKeys(image)) return;
        const layoutId = toStringValue(image.layout_id);
        if (layoutId && layoutIds.has(layoutId)) return;
        const position = Array.isArray(image.position)
          ? [
              image.position[0],
              image.position[1],
              Number(image.position[0]) + Number(image.position[2]),
              Number(image.position[1]) + Number(image.position[3]),
            ]
          : image.position;
        pushCandidate(
          { ...image, type: "image", bbox: position },
          20_000 + imageIndex,
          "image",
          toStringValue(image.image_description ?? image.data_url),
        );
      });
    }

    if (!Array.isArray(page.layouts) && Array.isArray(page.parsing_res_list)) {
      page.parsing_res_list.forEach((candidate, candidateIndex) => {
        if (!objectWithKeys(candidate)) return;
        pushCandidate(
          {
            ...candidate,
            type: candidate.block_label ?? candidate.type,
            bbox: candidate.block_bbox,
            text: candidate.block_content ?? candidate.text,
          },
          candidateIndex,
          "text",
        );
      });
    }
  });

  return buildPages(pagePayloads.length, pageMeta, dedupeBlocks(blocks), "async", []);
}

export function groupBlocksByPage(blocks: NormalizedOcrBlock[]) {
  return sortBlocks(blocks).reduce<Record<number, NormalizedOcrBlock[]>>((accumulator, block) => {
    accumulator[block.pageIndex] ??= [];
    accumulator[block.pageIndex].push(block);
    return accumulator;
  }, {});
}

export function getScaledBbox(
  bbox: OcrBbox,
  originalWidth: number,
  originalHeight: number,
  displayedWidth: number,
  displayedHeight: number,
): ScaledOcrBbox {
  const safeOriginalWidth = originalWidth > 0 ? originalWidth : displayedWidth || 1;
  const safeOriginalHeight = originalHeight > 0 ? originalHeight : displayedHeight || 1;
  const scaleX = safeOriginalWidth > 0 ? displayedWidth / safeOriginalWidth : 1;
  const scaleY = safeOriginalHeight > 0 ? displayedHeight / safeOriginalHeight : 1;

  // Paddle returns coordinates in the original page space. We recalculate the
  // rendered rectangle every time the preview changes size due to resize or zoom.
  return {
    left: bbox.xMin * scaleX,
    top: bbox.yMin * scaleY,
    width: Math.max(0, (bbox.xMax - bbox.xMin) * scaleX),
    height: Math.max(0, (bbox.yMax - bbox.yMin) * scaleY),
    scaleX,
    scaleY,
  };
}

export function normalizeOcrResult(rawResult: unknown): NormalizedOcrResult {
  if (!rawResult) {
    return { pages: [], source: "unknown", warnings: ["Empty OCR result."] };
  }

  if (objectWithKeys(rawResult)) {
    return (
      normalizePersistedResult(rawResult) ??
      normalizeLegacyPipelineResult(rawResult) ??
      normalizeAsyncResult(rawResult) ??
      normalizeSyncResult(rawResult) ?? {
        pages: [],
        source: "unknown",
        warnings: ["Unsupported OCR payload shape. Update normalizeOcrResult for this response format."],
        meta: { rawResult },
      }
    );
  }

  if (Array.isArray(rawResult)) {
    return (
      normalizeAsyncResult(rawResult) ?? {
        pages: [],
        source: "unknown",
        warnings: ["Unsupported OCR array payload shape. Update normalizeOcrResult for this response format."],
      }
    );
  }

  return {
    pages: [],
    source: "unknown",
    warnings: ["Unsupported OCR payload type."],
  };
}
