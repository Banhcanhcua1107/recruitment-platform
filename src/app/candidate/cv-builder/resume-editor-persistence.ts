import { mapSectionsToResumeBlocks } from "./api";
import type { CVRootJsonDocument } from "./cv-json-system";
import type { CVContent } from "./types";

function normalizeTitle(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveResumeEditorTitle(input: {
  draftTitle?: string | null;
  persistedTitle?: string | null;
  fallbackTitle?: string | null;
}) {
  return (
    normalizeTitle(input.draftTitle)
    || normalizeTitle(input.persistedTitle)
    || normalizeTitle(input.fallbackTitle)
    || "CV của tôi"
  );
}

export function normalizeResumeTitleForCommit(
  draftTitle: string | null | undefined,
  persistedTitle?: string | null,
  fallbackTitle?: string | null,
) {
  return resolveResumeEditorTitle({
    draftTitle,
    persistedTitle,
    fallbackTitle,
  });
}

export function hasResumeTitleChanged(draftTitle: string | null | undefined, persistedTitle?: string | null) {
  const normalizedPersistedTitle = normalizeResumeTitleForCommit(persistedTitle, "", "");
  const normalizedDraftTitle = normalizeResumeTitleForCommit(draftTitle, persistedTitle, "");
  return normalizedDraftTitle !== normalizedPersistedTitle;
}

export function buildResumeSaveInput(input: {
  cv: CVContent;
  title: string;
  rootJson: CVRootJsonDocument;
}) {
  const { cv, title, rootJson } = input;

  return {
    title,
    resume_data: mapSectionsToResumeBlocks(cv.sections),
    current_styling: {
      fonts: cv.theme.fonts,
      colors: cv.theme.colors,
      spacing: cv.theme.spacing,
      appearance: cv.theme.appearance,
      editorTemplateId: cv.meta.templateId ?? null,
      editorRootJson: rootJson,
    },
  };
}
