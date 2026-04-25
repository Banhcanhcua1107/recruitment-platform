"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { createResumeFromSections, saveResume } from "@/app/candidate/cv-builder/route-api";
import { TemplateCard } from "./TemplateCard";
import { TemplateCarousel } from "./TemplateCarousel";
import { TemplateFilterBar } from "./TemplateFilterBar";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import {
  CV_TEMPLATE_LIBRARY_UI,
  type CVTemplateDefinition,
  type TemplateFilterOption,
} from "@/components/cv/templates/templateCatalog";

function toResumeSections(template: CVTemplateDefinition) {
  return template.defaultCVData.sections.map((section) => ({
    type: section.type,
    isVisible: section.isVisible,
    data: section.data,
  }));
}

export function TemplateGallery() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<TemplateFilterOption>("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(CV_TEMPLATE_LIBRARY_UI[0]?.id ?? null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CVTemplateDefinition | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasTemplateInLibrary = CV_TEMPLATE_LIBRARY_UI.length > 0;

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return CV_TEMPLATE_LIBRARY_UI.filter((template) => {
      const matchCategory =
        activeCategory === "Tất cả" ||
        template.category === activeCategory ||
        template.tags.some((tag) => tag.toLowerCase() === activeCategory.toLowerCase());

      if (!matchCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = `${template.name} ${template.description} ${template.tags.join(" ")}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    if (filteredTemplates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    if (!selectedTemplateId || !filteredTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(filteredTemplates[0].id);
    }
  }, [filteredTemplates, selectedTemplateId]);

  const handleUseTemplate = useCallback(
    async (template: CVTemplateDefinition) => {
      if (creatingTemplateId) {
        return;
      }

      setCreatingTemplateId(template.id);
      setErrorMessage(null);

      try {
        const resume = await createResumeFromSections(toResumeSections(template), {
          title: template.defaultCVData.resumeTitle,
          templateId: null,
        });

        if (!resume) {
          throw new Error("Không thể khởi tạo CV từ template đã chọn.");
        }

        await saveResume(resume.id, {
          current_styling: {
            ...template.templateStyles,
            editorTemplateId: template.id,
          } as Record<string, unknown>,
        });

        router.push(`/candidate/cv-builder/${resume.id}/edit`);
      } catch (error) {
        console.error("Không thể tạo CV từ template:", error);
        setErrorMessage("Không thể tạo CV từ template này lúc này. Vui lòng thử lại.");
      } finally {
        setCreatingTemplateId(null);
      }
    },
    [creatingTemplateId, router],
  );

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <section className="rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.97))] px-6 py-8 shadow-[var(--app-shadow-soft)] sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Thư viện mẫu CV
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">
              Chọn mẫu CV chuyên nghiệp để bắt đầu nhanh
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Chọn mẫu phù hợp rồi vào editor để chỉnh sửa theo kiểu click đâu sửa đó, không rối, không form dài.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tổng mẫu khả dụng</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{filteredTemplates.length}</p>
          </div>
        </div>

        <div className="mt-6">
          <TemplateFilterBar
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            resultCount={filteredTemplates.length}
          />
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-6 flex items-start gap-3 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {filteredTemplates.length === 0 ? (
        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white px-6 py-14 text-center shadow-[var(--app-shadow-soft)]">
          <p className="text-lg font-bold text-slate-900">
            {hasTemplateInLibrary ? "Không tìm thấy template phù hợp" : "Mẫu CV đang được cập nhật"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {hasTemplateInLibrary
              ? "Hãy đổi bộ lọc hoặc thử từ khóa khác."
              : "Tạm thời toàn bộ mẫu CV hiện có đã được ẩn khỏi giao diện. Vui lòng quay lại sau khi có mẫu mới."}
          </p>
        </section>
      ) : null}

      {filteredTemplates.length > 0 ? (
        <div className="mt-8">
          <TemplateCarousel
            templates={filteredTemplates}
            selectedTemplateId={selectedTemplateId}
            creatingTemplateId={creatingTemplateId}
            onSelectTemplate={setSelectedTemplateId}
            onUseTemplate={(template) => {
              void handleUseTemplate(template);
            }}
          />
        </div>
      ) : null}

      {filteredTemplates.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-slate-900">Tất cả mẫu trong bộ lọc hiện tại</h3>
            <p className="text-sm font-semibold text-slate-500">Nhấn vào thẻ để xem nhanh</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={setPreviewTemplate}
                onUseTemplate={handleUseTemplate}
                isCreating={creatingTemplateId === template.id}
                disabled={creatingTemplateId !== null && creatingTemplateId !== template.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      <TemplatePreviewModal
        key={previewTemplate?.id ?? "preview-empty"}
        open={previewTemplate !== null}
        template={previewTemplate}
        creating={previewTemplate ? creatingTemplateId === previewTemplate.id : false}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(template) => {
          void handleUseTemplate(template);
        }}
      />

      {creatingTemplateId ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-primary/20">
          <Loader2 size={16} className="animate-spin" />
          Đang tạo CV từ template...
        </div>
      ) : null}
    </div>
  );
}
