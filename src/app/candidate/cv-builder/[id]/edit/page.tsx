"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { useCVStore } from "../../store";
import { CVWorkspacePanel } from "../../components/CVWorkspacePanel";
import { SuggestionPanel } from "../../components/SuggestionPanel";
import { GreenModernTemplate } from "../../components/templates/GreenModernTemplate";
import { getResumeById, saveResume, ResumeRow, ResumeBlock } from "../../api";
import { CVContent, CVSection } from "../../types";
import { ArrowLeft, Save, Download, Undo2, Redo2, CheckCircle2, Loader2, LayoutTemplate, ListChecks } from "lucide-react";
import Link from "next/link";

// Registry: template_id → visual component
const TEMPLATE_COMPONENTS: Record<string, React.ComponentType> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": GreenModernTemplate,
};

type ViewMode = "template" | "form";

// Auto-save debounce delay (ms)
const AUTOSAVE_DELAY = 1500;

export default function EditCVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { loadResumeIntoStore, cv, undo, redo, historyIndex, history, isDirty } = useCVStore();

  const [resume, setResume] = useState<ResumeRow | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("template");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load resume từ Supabase
  useEffect(() => {
    async function loadResume() {
      try {
        const data = await getResumeById(id);
        if (!data) {
          setLoadError(true);
          return;
        }
        setResume(data);
        // Map DB block_id → frontend SectionType (DB dùng tên ngắn, frontend dùng _list suffix)
        const BLOCK_ID_MAP: Record<string, string> = {
          header: 'header',
          contact: 'personal_info',
          personal_info: 'personal_info',
          summary: 'summary',
          experience: 'experience_list',
          experience_list: 'experience_list',
          education: 'education_list',
          education_list: 'education_list',
          skills: 'skill_list',
          skill_list: 'skill_list',
          awards: 'award_list',
          award_list: 'award_list',
          projects: 'project_list',
          project_list: 'project_list',
          certificates: 'certificate_list',
          certificate_list: 'certificate_list',
        };

        // Section title defaults
        const SECTION_TITLES: Record<string, string> = {
          header: '',
          personal_info: '',
          summary: 'Overview',
          experience_list: 'Work experience',
          education_list: 'Education',
          skill_list: 'Skills',
          award_list: 'Awards',
          project_list: 'Projects',
          certificate_list: 'Chứng chỉ',
        };

        // Init store với data từ Supabase
        const mappedSections: CVSection[] = data.resume_data.map((block: ResumeBlock) => {
          const mappedType = BLOCK_ID_MAP[block.block_id] || block.block_id;
          return {
            id: crypto.randomUUID(),
            type: mappedType as CVSection["type"],
            title: SECTION_TITLES[mappedType] || '',
            isVisible: block.is_visible,
            containerId: 'main-column',
            data: block.data as unknown as CVSection["data"],
          };
        });

        loadResumeIntoStore(
          mappedSections, 
          (data.current_styling as Partial<CVContent['theme']>) || undefined, 
          data.template_id || undefined
        );
      } catch {
        setLoadError(true);
      }
    }
    loadResume();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save khi cv thay đổi
  useEffect(() => {
    if (!resume || !isDirty || !cv) return;

    // Clear timer cũ
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    // Set timer mới (debounced)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        await saveResume(resume.id, {
          resume_data: cv.sections.map((s) => ({
            block_id: s.type,
            is_visible: s.isVisible,
            data: s.data as Record<string, unknown>,
          })),
          current_styling: {
            fonts: cv.theme.fonts,
            colors: cv.theme.colors,
            spacing: cv.theme.spacing,
          },
        });
        setSaveStatus("saved");
        // Reset về idle sau 2s
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Auto-save thất bại:", err);
        setSaveStatus("idle");
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [cv, isDirty, resume]);

  // Manual save
  const handleManualSave = async () => {
    if (!resume || !cv) return;
    try {
      setSaveStatus("saving");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      await saveResume(resume.id, {
        resume_data: cv.sections.map((s) => ({
          block_id: s.type,
          is_visible: s.isVisible,
          data: s.data as Record<string, unknown>,
        })),
        current_styling: {
          fonts: cv.theme.fonts,
          colors: cv.theme.colors,
          spacing: cv.theme.spacing,
        },
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Error state
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 gap-4">
        <span className="material-symbols-outlined text-5xl text-slate-300">error</span>
        <h2 className="text-lg font-bold text-slate-700">Không tìm thấy CV</h2>
        <p className="text-slate-400 text-sm">CV này không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link
          href="/candidate/cv-builder"
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  // Loading state
  if (!cv || cv.sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Đang tải trình soạn thảo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">

      {/* ── TOP NAV BAR ───────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/candidate/cv-builder"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-800 truncate">
              {resume?.title || cv.meta.templateId || "CV của tôi"}
            </h1>
            {/* Save status indicator */}
            <div className="flex items-center gap-1">
              {saveStatus === "saving" && (
                <>
                  <Loader2 size={10} className="animate-spin text-slate-400" />
                  <p className="text-[10px] text-slate-400">Đang lưu...</p>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <p className="text-[10px] text-emerald-600">Đã lưu</p>
                </>
              )}
              {saveStatus === "idle" && isDirty && (
                <p className="text-[10px] text-amber-500">Chưa lưu</p>
              )}
              {saveStatus === "idle" && !isDirty && (
                <p className="text-[10px] text-slate-400">Không có thay đổi</p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Undo/Redo */}
        <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Hoàn tác (Ctrl+Z)"
            className="size-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-slate-500 disabled:opacity-30 transition-all"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Làm lại (Ctrl+Shift+Z)"
            className="size-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-slate-500 disabled:opacity-30 transition-all"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download size={15} />
            Tải PDF
          </button>
          <button
            onClick={handleManualSave}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            {saveStatus === "saving" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Lưu lại
          </button>
        </div>
      </header>

      {/* ── SPLIT-SCREEN ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Visual Template or Form Editor */}
        <div className="flex flex-col w-[60%] min-w-0 border-r border-slate-200 bg-slate-50">
          {/* Sub-header with view toggle */}
          <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
            <span className="material-symbols-outlined text-lg text-emerald-500">edit_document</span>
            <h2 className="text-sm font-bold text-slate-800">Nội dung CV</h2>

            {/* View mode toggle — only show if template exists */}
            {resume?.template_id && TEMPLATE_COMPONENTS[resume.template_id] && (
              <div className="ml-auto flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("template")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === "template"
                      ? "bg-white shadow-sm text-emerald-700"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <LayoutTemplate size={13} />
                  Xem mẫu
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("form")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === "form"
                      ? "bg-white shadow-sm text-emerald-700"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <ListChecks size={13} />
                  Soạn nhanh
                </button>
              </div>
            )}

            {/* Section count — show when no template or in form mode */}
            {(!resume?.template_id || !TEMPLATE_COMPONENTS[resume.template_id] || viewMode === "form") && (
              <span className="ml-auto text-[10px] text-slate-400 font-medium">
                {cv.sections.filter((s) => s.isVisible).length}/{cv.sections.length} mục
              </span>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto">
            {resume?.template_id && TEMPLATE_COMPONENTS[resume.template_id] && viewMode === "template" ? (
              /* Visual Template Preview (inline-editable) */
              <div className="flex justify-center py-6 px-4">
                <div className="shadow-2xl bg-white">
                  {React.createElement(TEMPLATE_COMPONENTS[resume.template_id])}
                </div>
              </div>
            ) : (
              /* Form-based section editor */
              <CVWorkspacePanel />
            )}
          </div>
        </div>

        {/* RIGHT (40%): Dynamic Suggestions */}
        <div className="flex flex-col w-[40%] min-w-0 bg-white">
          <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
            <span className="material-symbols-outlined text-lg text-amber-500">auto_awesome</span>
            <h2 className="text-sm font-bold text-slate-800">Gợi ý &amp; Hướng dẫn</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <SuggestionPanel />
          </div>
        </div>

      </div>
    </div>
  );
}
