"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getResumeById, saveResume, type ResumeBlock, type ResumeRow } from "../../api";
import { OCRPreviewModal } from "../../components/ocr/OCRPreviewModal";
import { ProfessionalCVEditor } from "@/app/candidate/cv-builder/components/pro-editor/ProfessionalCVEditor";
import { useCVStore } from "../../store";
import type { CVContent, CVSection } from "../../types";

const AUTOSAVE_DELAY = 1500;

type SaveStatus = "idle" | "saving" | "saved";

const BLOCK_ID_MAP: Record<string, string> = {
  header: "header",
  contact: "personal_info",
  personal_info: "personal_info",
  summary: "summary",
  experience: "experience_list",
  experience_list: "experience_list",
  education: "education_list",
  education_list: "education_list",
  skills: "skill_list",
  skill_list: "skill_list",
  awards: "award_list",
  award_list: "award_list",
  projects: "project_list",
  project_list: "project_list",
  certificates: "certificate_list",
  certificate_list: "certificate_list",
};

const SECTION_TITLES: Record<string, string> = {
  header: "",
  personal_info: "",
  summary: "Tổng quan",
  experience_list: "Kinh nghiệm làm việc",
  education_list: "Học vấn",
  skill_list: "Kỹ năng",
  award_list: "Giải thưởng",
  project_list: "Dự án",
  certificate_list: "Chứng chỉ",
};

export default function EditCVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loadResumeIntoStore, cv, undo, redo, historyIndex, history, isDirty, exportRootJson } = useCVStore();

  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        const mappedSections: CVSection[] = data.resume_data.map((block: ResumeBlock) => {
          const mappedType = BLOCK_ID_MAP[block.block_id] || block.block_id;

          return {
            id: crypto.randomUUID(),
            type: mappedType as CVSection["type"],
            title: SECTION_TITLES[mappedType] || "",
            isVisible: block.is_visible,
            containerId: "main-column",
            data: block.data as unknown as CVSection["data"],
          };
        });

        const currentStyling = (data.current_styling ?? {}) as Record<string, unknown>;
        const editorTemplateId =
          typeof currentStyling.editorTemplateId === "string" && currentStyling.editorTemplateId.trim().length > 0
            ? currentStyling.editorTemplateId
            : data.template_id || undefined;

        const themeStyling: Partial<CVContent["theme"]> = {
          colors:
            currentStyling.colors && typeof currentStyling.colors === "object"
              ? (currentStyling.colors as CVContent["theme"]["colors"])
              : undefined,
          fonts:
            currentStyling.fonts && typeof currentStyling.fonts === "object"
              ? (currentStyling.fonts as CVContent["theme"]["fonts"])
              : undefined,
          spacing: typeof currentStyling.spacing === "number" ? currentStyling.spacing : undefined,
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
    if (!resume || !cv || !isDirty) {
      return;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(async () => {
      try {
        const rootJson = exportRootJson();
        setSaveStatus("saving");
        await saveResume(resume.id, {
          resume_data: cv.sections.map((section) => ({
            block_id: section.type,
            is_visible: section.isVisible,
            data: section.data as Record<string, unknown>,
          })),
          current_styling: {
            fonts: cv.theme.fonts,
            colors: cv.theme.colors,
            spacing: cv.theme.spacing,
            editorTemplateId: cv.meta.templateId ?? null,
            editorRootJson: rootJson,
          },
        });

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
  }, [cv, exportRootJson, isDirty, resume]);

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

      await saveResume(resume.id, {
        resume_data: cv.sections.map((section) => ({
          block_id: section.type,
          is_visible: section.isVisible,
          data: section.data as Record<string, unknown>,
        })),
        current_styling: {
          fonts: cv.theme.fonts,
          colors: cv.theme.colors,
          spacing: cv.theme.spacing,
          editorTemplateId: cv.meta.templateId ?? null,
          editorRootJson: rootJson,
        },
      });

      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (error) {
      console.error("Manual save thất bại:", error);
      setSaveStatus("idle");
    }
  }, [cv, exportRootJson, resume]);

  const handleExportRootJson = useCallback(() => {
    if (!cv) {
      return;
    }

    const rootJson = exportRootJson();
    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const baseTitle = (resume?.title || "cv").trim().replace(/\s+/g, "-").toLowerCase();
    const fileName = `${baseTitle || "cv"}-root-json-${timestamp}.json`;
    const blob = new Blob([JSON.stringify(rootJson, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }, [cv, exportRootJson, resume?.title]);

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
      <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
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
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-slate-100 text-slate-600">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-sm">Đang tải trình soạn thảo CV...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProfessionalCVEditor
        resumeTitle={resume?.title || cv.meta.templateId || "CV của tôi"}
        saveStatus={saveStatus}
        isDirty={isDirty}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        onSave={() => void handleManualSave()}
        onOpenOCR={() => setOcrModalOpen(true)}
        onDownload={handleExportRootJson}
      />

      <OCRPreviewModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onConfirm={handleOCRConfirm}
      />
    </>
  );
}
