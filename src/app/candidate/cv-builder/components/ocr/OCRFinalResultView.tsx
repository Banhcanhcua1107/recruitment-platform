"use client";

import React, { useMemo } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Save,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { CVSection, RichOutlineNode } from "../../types";

interface DetectedSectionPayload {
  type: string;
  title: string;
  content: string;
  items: Array<Record<string, unknown>>;
  line_ids: string[];
  block_indices: number[];
}

interface OCRFinalResultViewProps {
  fileName: string;
  sections: CVSection[];
  detectedSections: DetectedSectionPayload[];
  documentType: "cv" | "non_cv_document";
  documentContent: string;
  onSave: () => void | Promise<void>;
  onSkip: () => void;
  isSaving?: boolean;
}

const SECTION_TITLE_MAP: Record<string, string> = {
  header: "Tiêu đề CV",
  personal_info: "Thông tin cá nhân",
  summary: "Mục tiêu nghề nghiệp",
  skill_list: "Kỹ năng",
  education_list: "Học vấn",
  experience_list: "Kinh nghiệm làm việc",
  project_list: "Dự án",
  certificate_list: "Chứng chỉ",
  rich_outline: "Nội dung bổ sung",
  custom_text: "Nội dung bổ sung",
};

const DETECTED_SECTION_LABELS: Record<string, string> = {
  contact: "Thông tin cá nhân",
  career_objective: "Mục tiêu nghề nghiệp",
  skills: "Kỹ năng",
  education: "Học vấn",
  work_experience: "Kinh nghiệm làm việc",
  projects: "Dự án",
  certifications: "Chứng chỉ",
  activities: "Hoạt động",
  interests: "Sở thích",
  document_content: "Nội dung trích xuất",
};

function renderRichOutlineNodes(nodes: RichOutlineNode[]): React.ReactNode {
  if (!nodes.length) return null;

  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} className="space-y-1">
          <p
            className={
              node.kind === "heading"
                ? "text-sm font-semibold text-slate-800"
                : node.kind === "bullet"
                  ? "text-sm leading-6 text-slate-700"
                  : "text-sm leading-6 text-slate-600"
            }
          >
            {node.kind === "bullet" ? `• ${node.text}` : node.text}
          </p>
          {node.children.length > 0 ? (
            <div className="ml-4 border-l border-slate-200 pl-3">
              {renderRichOutlineNodes(node.children)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function renderSectionData(section: CVSection): React.ReactNode {
  switch (section.type) {
    case "header": {
      const data = section.data as { fullName?: string; title?: string };
      return (
        <div className="space-y-1">
          {data.fullName ? (
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              {data.fullName}
            </h2>
          ) : null}
          {data.title ? (
            <p className="text-sm font-medium text-slate-500">{data.title}</p>
          ) : null}
        </div>
      );
    }
    case "personal_info": {
      const data = section.data as {
        email?: string;
        phone?: string;
        address?: string;
        socials?: { network: string; url: string }[];
      };
      const rows = [
        data.email,
        data.phone,
        data.address,
        ...(data.socials || []).map((item) =>
          item.network ? `${item.network}: ${item.url}` : item.url,
        ),
      ].filter(Boolean) as string[];

      return (
        <div className="space-y-2">
          {rows.map((row) => (
            <p key={row} className="text-sm leading-6 text-slate-700">
              {row}
            </p>
          ))}
        </div>
      );
    }
    case "summary": {
      const data = section.data as { text?: string };
      return (
        <pre className="font-sans whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {data.text || ""}
        </pre>
      );
    }
    case "skill_list": {
      const data = section.data as {
        items?: Array<{ id: string; name: string }>;
      };
      return (
        <div className="flex flex-wrap gap-2">
          {(data.items || []).map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
            >
              {item.name}
            </span>
          ))}
        </div>
      );
    }
    case "experience_list":
    case "education_list":
    case "project_list":
    case "certificate_list": {
      const data = section.data as { items?: Array<Record<string, unknown>> };
      return (
        <div className="space-y-4">
          {(data.items || []).map((item, index) => (
            <div
              key={String(item.id || index)}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              {Object.entries(item).map(([key, value]) => {
                if (!value || key === "id") return null;
                const label = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/_/g, " ")
                  .trim();
                return (
                  <div key={key} className="mb-2 last:mb-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }
    case "rich_outline": {
      const data = section.data as { nodes?: RichOutlineNode[] };
      return renderRichOutlineNodes(data.nodes || []);
    }
    case "custom_text": {
      const data = section.data as { text?: string };
      return (
        <pre className="font-sans whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {data.text || ""}
        </pre>
      );
    }
    default:
      return (
        <pre className="font-sans whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {JSON.stringify(section.data, null, 2)}
        </pre>
      );
  }
}

function isMeaningfulStructuredSection(section: CVSection): boolean {
  if (!section) return false;

  switch (section.type) {
    case "header": {
      const data = section.data as { fullName?: string; title?: string };
      return Boolean(data.fullName || data.title);
    }
    case "personal_info": {
      const data = section.data as {
        email?: string;
        phone?: string;
        address?: string;
        socials?: Array<{ network: string; url: string }>;
      };
      return Boolean(
        data.email ||
          data.phone ||
          data.address ||
          (data.socials && data.socials.length > 0),
      );
    }
    case "summary":
    case "custom_text": {
      const data = section.data as { text?: string };
      return Boolean(data.text?.trim());
    }
    case "skill_list":
    case "experience_list":
    case "education_list":
    case "project_list":
    case "certificate_list": {
      const data = section.data as { items?: Array<Record<string, unknown>> };
      return Boolean(data.items?.length);
    }
    case "rich_outline": {
      const data = section.data as { nodes?: RichOutlineNode[] };
      return Boolean(data.nodes?.length);
    }
    default:
      return Boolean(section.data);
  }
}

function hasMeaningfulStructuredSections(sections: CVSection[]): boolean {
  const meaningfulSections = sections.filter((section) =>
    isMeaningfulStructuredSection(section),
  );

  if (!meaningfulSections.length) return false;

  const meaningfulTypes = new Set(
    meaningfulSections.map((section) => section.type),
  );

  return (
    meaningfulTypes.size > 1 ||
    meaningfulSections.some((section) => section.type !== "rich_outline")
  );
}

function normalizeSections(
  detectedSections: DetectedSectionPayload[],
  fallbackSections: CVSection[],
) {
  if (hasMeaningfulStructuredSections(fallbackSections)) {
    return fallbackSections
      .filter((section) => isMeaningfulStructuredSection(section))
      .map((section) => ({
        key: section.id,
        title: section.title || SECTION_TITLE_MAP[section.type] || "Nội dung",
        content: "",
        source: "structured" as const,
        structured: section,
      }));
  }

  if (detectedSections.length > 0) {
    return detectedSections
      .map((section) => ({
        key: `${section.type}-${section.title}`,
        title:
          DETECTED_SECTION_LABELS[section.type] ||
          section.title ||
          section.type,
        content: section.content.trim(),
        source: "detected" as const,
      }))
      .filter((section) => section.content.length > 0);
  }

  return fallbackSections.map((section) => ({
    key: section.id,
    title: section.title || SECTION_TITLE_MAP[section.type] || "Nội dung",
    content: "",
    source: "structured" as const,
    structured: section,
  }));
}

export function OCRFinalResultView({
  fileName,
  sections,
  detectedSections,
  documentType,
  documentContent,
  onSave,
  onSkip,
  isSaving = false,
}: OCRFinalResultViewProps) {
  const normalizedSections = useMemo(
    () => normalizeSections(detectedSections, sections),
    [detectedSections, sections],
  );

  const fullContent = documentContent.trim();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
              Kết quả cuối cùng
            </p>
            <h2 className="truncate text-xl font-black tracking-tight text-slate-900">
              {fileName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {documentType === "cv"
                ? "CV đã được gom lại theo section để bạn rà soát và lưu vào hệ thống."
                : "Tài liệu đã được trích xuất tối đa nội dung để bạn xem trước khi lưu."}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
        {normalizedSections.length > 0 ? (
          <div className="space-y-4">
            {normalizedSections.map((section) => (
              <section
                key={section.key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    {section.title}
                  </h3>
                </div>

                {section.source === "detected" ? (
                  <pre className="font-sans whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {section.content}
                  </pre>
                ) : (
                  renderSectionData(section.structured)
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
            <FileText size={28} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Chưa có nội dung hoàn chỉnh để hiển thị.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Vui lòng thử lại với file khác hoặc kiểm tra chất lượng tài liệu.
            </p>
          </div>
        )}

        {fullContent ? (
          <details className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" open={documentType !== "cv"}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-slate-800">
              <span>Toàn bộ nội dung trích xuất từ tài liệu</span>
              <ChevronDown size={16} className="text-slate-400" />
            </summary>
            <div className="border-t border-slate-100 px-5 py-4">
              <pre className="font-sans whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {fullContent}
              </pre>
            </div>
          </details>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-5">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
          <p className="text-sm font-bold text-slate-900">
            Bạn có muốn lưu CV của bạn lên web không?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Nếu lưu, CV này sẽ được thêm vào danh sách CV đã lưu để bạn xem lại,
            chỉnh sửa và dùng khi gửi cho nhà tuyển dụng sau này.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} />
              {isSaving ? "Đang lưu CV..." : "Lưu CV"}
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XCircle size={15} />
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
