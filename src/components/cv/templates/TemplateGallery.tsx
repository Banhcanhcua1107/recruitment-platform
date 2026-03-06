"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { getTemplates, type TemplateRow } from "@/app/candidate/cv-builder/api";
import { getTemplatePreview } from "@/lib/cv-template-preview";
import { TemplateCard, type GalleryTemplate } from "./TemplateCard";
import {
  TemplateFilterBar,
  type TemplateFilter,
} from "./TemplateFilterBar";

const FILTER_ORDER: TemplateFilter[] = [
  "Tất cả",
  "Đơn giản",
  "Chuyên nghiệp",
  "Hiện đại",
  "Ấn tượng",
  "Harvard",
  "ATS",
];

const CATEGORY_PRESETS: Record<
  string,
  Pick<GalleryTemplate, "categories" | "description" | "accent" | "colors">
> = {
  general: {
    categories: ["Đơn giản", "Chuyên nghiệp"],
    description: "Bố cục cân bằng, dễ đọc và phù hợp với đa số ngành nghề.",
    accent: "#0f766e",
    colors: ["#0f766e", "#ffffff", "#dbeafe"],
  },
  tech: {
    categories: ["ATS", "Hiện đại", "Chuyên nghiệp"],
    description: "Nhấn mạnh cấu trúc rõ ràng, tối ưu cho hệ thống sàng lọc CV.",
    accent: "#16a34a",
    colors: ["#16a34a", "#ffffff", "#1e293b"],
  },
  creative: {
    categories: ["Ấn tượng", "Hiện đại"],
    description: "Thị giác nổi bật hơn để tạo khác biệt cho hồ sơ cá nhân.",
    accent: "#ea580c",
    colors: ["#ea580c", "#fff7ed", "#312e81"],
  },
};

const TEMPLATE_PRESETS: Record<
  string,
  Partial<Pick<GalleryTemplate, "categories" | "description" | "accent" | "colors">>
> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
    categories: ["ATS", "Đơn giản", "Chuyên nghiệp"],
    description: "Mẫu chuẩn cho CV công nghệ với nhịp đọc gọn và sạch.",
    accent: "#4caf50",
    colors: ["#4caf50", "#ffffff", "#334155"],
  },
};

function isColorValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractColorPalette(template: TemplateRow, fallback: string[]): string[] {
  const rawColors = template.default_styling?.colors;

  if (!rawColors || typeof rawColors !== "object" || Array.isArray(rawColors)) {
    return fallback;
  }

  const uniqueColors = Array.from(
    new Set(
      Object.values(rawColors)
        .filter(isColorValue)
        .map((value) => value.trim())
        .slice(0, 4),
    ),
  );

  return uniqueColors.length > 0 ? uniqueColors : fallback;
}

function normalizeTemplate(template: TemplateRow): GalleryTemplate {
  const categoryPreset = CATEGORY_PRESETS[template.category] ?? CATEGORY_PRESETS.general;
  const templatePreset = TEMPLATE_PRESETS[template.id] ?? {};

  const colors = extractColorPalette(
    template,
    templatePreset.colors ?? categoryPreset.colors,
  );

  return {
    id: template.id,
    name: template.name,
    preview: getTemplatePreview({
      templateId: template.id,
      templateName: template.name,
      thumbnailUrl: template.thumbnail_url,
    }),
    categories: templatePreset.categories ?? categoryPreset.categories,
    colors,
    accent: templatePreset.accent ?? categoryPreset.accent,
    description:
      templatePreset.description ??
      categoryPreset.description,
  };
}

export function TemplateGallery() {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<TemplateFilter>("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates();
      setTemplates(data.map(normalizeTemplate));
    } catch (err) {
      console.error("Không thể tải thư viện mẫu CV:", err);
      setError("Không thể tải thư viện mẫu CV lúc này.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "Tất cả") {
      return templates;
    }

    return templates.filter((template) =>
      template.categories.includes(activeCategory),
    );
  }, [activeCategory, templates]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TemplateFilterBar
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {filteredTemplates.length} mẫu
            </span>
            <span>
              Lọc theo {FILTER_ORDER.find((item) => item === activeCategory)}
            </span>
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-6 text-slate-500">
          Ưu tiên những mẫu có bố cục rõ ràng, tỷ lệ trắng tốt và hỗ trợ đọc nhanh trên cả màn hình lẫn ATS.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="aspect-[3/4] animate-pulse bg-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-1/2 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-14 text-center">
          <AlertCircle className="mb-4 size-10 text-rose-500" />
          <h3 className="text-lg font-bold text-slate-900">Không tải được mẫu CV</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadTemplates()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700"
          >
            <RefreshCcw size={16} />
            Thử lại
          </button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Loader2 className="mb-4 size-10 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900">
            Chưa có mẫu trong nhóm {activeCategory}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Hãy chọn bộ lọc khác hoặc bổ sung thêm template trong bảng dữ liệu để mở rộng thư viện.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
