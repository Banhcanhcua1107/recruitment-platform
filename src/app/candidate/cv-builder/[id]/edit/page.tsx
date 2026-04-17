"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { mapResumeBlocksToSections } from "../../api";
import { getResumeById, saveResume, type ResumeRow } from "../../route-api";
import { OCRPreviewModal } from "../../components/ocr/OCRPreviewModal";
import { ProfessionalCVEditor } from "@/app/candidate/cv-builder/components/pro-editor/ProfessionalCVEditor";
import {
  buildResumeSaveInput,
  hasResumeTitleChanged,
  normalizeResumeTitleForCommit,
  resolveResumeEditorTitle,
} from "../../resume-editor-persistence";
import { useCVStore } from "../../store";
import type { CVContent, CVSection } from "../../types";

const AUTOSAVE_DELAY = 1500;

type SaveStatus = "idle" | "saving" | "saved";

function normalizeThemeFonts(rawFonts: unknown): CVContent["theme"]["fonts"] | undefined {
  if (typeof rawFonts === "string") {
    const normalized = rawFonts.trim();
    if (!normalized) {
      return undefined;
    }

    return {
      heading: normalized,
      body: normalized,
    };
  }

  if (!rawFonts || typeof rawFonts !== "object") {
    return undefined;
  }

  const fonts = rawFonts as Record<string, unknown>;
  const normalizedBody = typeof fonts.body === "string" ? fonts.body.trim() : "";
  const normalizedHeading = typeof fonts.heading === "string" ? fonts.heading.trim() : "";
  const body = normalizedBody || normalizedHeading;
  const heading = normalizedHeading || normalizedBody;

  if (!body || !heading) {
    return undefined;
  }

  return {
    heading,
    body,
  };
}

function normalizeThemeSpacing(rawSpacing: unknown) {
  if (typeof rawSpacing !== "number" || !Number.isFinite(rawSpacing)) {
    return undefined;
  }

  if (rawSpacing <= 0) {
    return undefined;
  }

  return rawSpacing;
}

export default function EditCVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loadResumeIntoStore, cv, undo, redo, historyIndex, history, isDirty, exportRootJson } = useCVStore();

  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [draftResumeTitle, setDraftResumeTitle] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fallbackResumeTitle = resume?.template?.name || cv?.meta.templateId || "CV của tôi";
  const normalizedResumeTitle = normalizeResumeTitleForCommit(
    draftResumeTitle,
    resume?.title,
    fallbackResumeTitle,
  );
  const resolvedResumeTitle = resolveResumeEditorTitle({
    draftTitle: draftResumeTitle,
    persistedTitle: resume?.title,
    fallbackTitle: fallbackResumeTitle,
  });
  const hasPendingResumeTitleChange = resume
    ? hasResumeTitleChanged(draftResumeTitle, resume.title)
    : false;

  const handleOCRConfirm = useCallback(
    (sections: CVSection[]) => {
      loadResumeIntoStore(sections, undefined, cv?.meta.templateId || resume?.template_id || undefined);
      setOcrModalOpen(false);
    },
    [cv?.meta.templateId, loadResumeIntoStore, resume?.template_id],
  );

  useEffect(() => {
    let active = true;

    async function loadResume() {
      try {
        const data = await getResumeById(id);
        if (!data) {
          if (active) {
            setLoadError(true);
          }
          return;
        }

        if (!active) {
          return;
        }

        setResume(data);
        setDraftResumeTitle(data.title || "");

        const mappedSections: CVSection[] = mapResumeBlocksToSections(data.resume_data, {
          containerId: "main-column",
          createId: () => crypto.randomUUID(),
        });

        const currentStyling = (data.current_styling ?? {}) as Record<string, unknown>;
        const editorTemplateId =
          typeof currentStyling.editorTemplateId === "string" && currentStyling.editorTemplateId.trim().length > 0
            ? currentStyling.editorTemplateId
            : data.template_id || undefined;

        const themeStyling: Partial<CVContent["theme"]> = {
          colors:
            currentStyling.colors && typeof currentStyling.colors === "object" && currentStyling.colors !== null
              ? (currentStyling.colors as CVContent["theme"]["colors"])
              : undefined,
          fonts: normalizeThemeFonts(currentStyling.fonts),
          spacing: normalizeThemeSpacing(currentStyling.spacing),
        };

        loadResumeIntoStore(mappedSections, themeStyling, editorTemplateId);
      } catch {
        if (active) {
          setLoadError(true);
        }
      }
    }

    void loadResume();

    return () => {
      active = false;
    };
  }, [id, loadResumeIntoStore]);

  useEffect(() => {
    if (!resume || !cv || (!isDirty && !hasPendingResumeTitleChange)) {
      return;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      try {
        const rootJson = exportRootJson();
        setSaveStatus("saving");
        await saveResume(
          resume.id,
          buildResumeSaveInput({
            cv,
            title: normalizedResumeTitle,
            rootJson,
          }),
        );
        setResume((previousResume) => (
          previousResume
            ? {
                ...previousResume,
                title: normalizedResumeTitle,
              }
            : previousResume
        ));
        setDraftResumeTitle(normalizedResumeTitle);

        setSaveStatus("saved");
        window.setTimeout(() => setSaveStatus("idle"), 1800);
      } catch (error) {
        console.error("Auto-save thất bại:", error);
        setSaveStatus("idle");
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [cv, exportRootJson, hasPendingResumeTitleChange, isDirty, normalizedResumeTitle, resume]);

  const handleManualSave = useCallback(async () => {
    if (!resume || !cv) {
      return;
    }

    try {
      const rootJson = exportRootJson();
      setSaveStatus("saving");

      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      await saveResume(
        resume.id,
        buildResumeSaveInput({
          cv,
          title: normalizedResumeTitle,
          rootJson,
        }),
      );
      setResume((previousResume) => (
        previousResume
          ? {
              ...previousResume,
              title: normalizedResumeTitle,
            }
          : previousResume
      ));
      setDraftResumeTitle(normalizedResumeTitle);

      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (error) {
      console.error("Manual save thất bại:", error);
      setSaveStatus("idle");
    }
  }, [cv, exportRootJson, normalizedResumeTitle, resume]);

  const handleExportRootJson = useCallback(() => {
    if (!cv) {
      return;
    }

    const rootJson = exportRootJson();
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const baseTitle = normalizedResumeTitle.trim().replace(/\s+/g, "-").toLowerCase();
    const fileName = `${baseTitle || "cv"}-root-json-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(rootJson, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }, [cv, exportRootJson, normalizedResumeTitle]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleManualSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave, redo, undo]);

  if (loadError) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--global-navbar-height,4rem))] flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Không tìm thấy CV</h2>
        <p className="max-w-md text-sm text-slate-500">
          CV này không tồn tại hoặc tài khoản của bạn không có quyền truy cập.
        </p>
        <Link
          href="/candidate/cv-builder"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách CV
        </Link>
      </div>
    );
  }

  if (!cv || cv.sections.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--global-navbar-height,4rem))] items-center justify-center bg-slate-100 text-slate-600">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm">Đang tải trình soạn thảo CV...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[calc(100dvh-var(--global-navbar-height,4rem))] min-h-0 overflow-hidden">
        <ProfessionalCVEditor
          resumeTitle={resolvedResumeTitle}
          saveStatus={saveStatus}
          isDirty={isDirty || hasPendingResumeTitleChange}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={undo}
          onRedo={redo}
          onSave={() => void handleManualSave()}
          onRenameResume={(nextTitle) => {
            setDraftResumeTitle(nextTitle);
            setSaveStatus("idle");
          }}
          onOpenOCR={() => setOcrModalOpen(true)}
          onDownload={handleExportRootJson}
        />
      </div>

      <OCRPreviewModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onConfirm={handleOCRConfirm}
      />
    </>
  );
}
