"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTemplates, createResume, TemplateRow } from "../api";
import { ArrowLeft, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

const CATEGORY_LABELS: Record<string, string> = {
  all:      "Tất cả",
  general:  "Phổ thông",
  tech:     "Công nghệ",
  creative: "Sáng tạo",
};

export default function NewCVPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    getTemplates()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = category === "all"
    ? templates
    : templates.filter((t) => t.category === category);

  const handleCreate = async () => {
    if (!selectedId) return;
    try {
      setCreating(true);
      const resume = await createResume(selectedId, "CV của tôi");
      if (resume) {
        router.push(`/candidate/cv-builder/${resume.id}/edit`);
      }
    } catch (err) {
      console.error("Không thể tạo CV:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại!");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Manrope']">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/candidate/cv-builder" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <h1 className="text-base font-black text-slate-900">Chọn mẫu CV</h1>
              <p className="text-[11px] text-slate-400">Chọn 1 mẫu để bắt đầu</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCreate}
            disabled={!selectedId || creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
          >
            {creating ? (
              <><Loader2 size={16} className="animate-spin" />Đang tạo...</>
            ) : (
              <><Sparkles size={16} />Dùng mẫu này</>
            )}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-8">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                category === key
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="h-60 bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-slate-400 font-medium">
              Chưa có mẫu nào trong danh mục này.{" "}
              <button onClick={() => setCategory("all")} className="text-emerald-600 font-bold underline">
                Xem tất cả
              </button>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((template) => {
              const isSelected = selectedId === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className={`group cursor-pointer bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                    isSelected
                      ? "border-emerald-500 shadow-xl shadow-emerald-100 -translate-y-1"
                      : "border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {/* Preview thumbnail */}
                  <div className="h-60 bg-linear-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center">
                    {template.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <span className="material-symbols-outlined text-6xl">article</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Preview</span>
                      </div>
                    )}

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <div className="size-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <CheckCircle2 size={24} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* Premium badge */}
                    {template.is_premium && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 bg-amber-400 text-amber-900 rounded text-[10px] font-black uppercase">
                          Pro
                        </span>
                      </div>
                    )}

                    {/* Category badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 bg-white/80 backdrop-blur-sm text-slate-600 rounded text-[10px] font-bold capitalize">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </span>
                    </div>
                  </div>

                  {/* Template info */}
                  <div className="p-4">
                    <h3 className={`font-bold text-sm ${isSelected ? "text-emerald-700" : "text-slate-800"}`}>
                      {template.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {template.structure_schema?.length ?? 0} khối nội dung
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
