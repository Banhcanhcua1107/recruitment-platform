import { mapResumeBlocksToSections } from "./api";
import type { ResumeRow } from "./route-api";
import { normalizeThemeAppearance, normalizeThemeFonts, normalizeThemeSpacing } from "./theme-normalization";
import type { CVContent, CVSection } from "./types";

export type ResumePdfPreviewData = {
  sections: CVSection[];
  templateId?: string;
  title: string;
  themeStyling: Partial<CVContent["theme"]>;
};

export function buildResumePdfPreviewData(input: {
  resume: ResumeRow;
  createId?: () => string;
}): ResumePdfPreviewData {
  const { resume } = input;
  const createId =
    input.createId
    || (() => {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }

      return `section-${Math.random().toString(36).slice(2, 10)}`;
    });

  const mappedSections: CVSection[] = mapResumeBlocksToSections(resume.resume_data, {
    containerId: "main-column",
    createId,
  });

  const currentStyling = (resume.current_styling ?? {}) as Record<string, unknown>;
  const templateId =
    typeof currentStyling.editorTemplateId === "string" && currentStyling.editorTemplateId.trim().length > 0
      ? currentStyling.editorTemplateId
      : resume.template_id || undefined;

  const themeStyling: Partial<CVContent["theme"]> = {
    colors:
      currentStyling.colors && typeof currentStyling.colors === "object" && currentStyling.colors !== null
        ? (currentStyling.colors as CVContent["theme"]["colors"])
        : undefined,
    fonts: normalizeThemeFonts(currentStyling.fonts),
    spacing: normalizeThemeSpacing(currentStyling.spacing),
    appearance: normalizeThemeAppearance(currentStyling.appearance),
  };

  return {
    sections: mappedSections,
    templateId,
    title: String(resume.title || "cv-builder").trim() || "cv-builder",
    themeStyling,
  };
}
