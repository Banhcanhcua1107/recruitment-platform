"use client";

import React from "react";
import { useCVStore } from "../store";

// Gợi ý theo từng loại section
const SUGGESTIONS: Record<
  string,
  {
    icon: string;
    color: string;
    tips: string[];
    examples: { label: string; text: string }[];
  }
> = {
  header: {
    icon: "person",
    color: "blue",
    tips: [
      "Dùng tên đầy đủ, không viết tắt.",
      "Chức danh nên khớp với vị trí ứng tuyển.",
      "Tránh dùng ảnh quá nghiêm túc hoặc selfie.",
    ],
    examples: [
      { label: "Tên tốt", text: "Nguyễn Minh Tuấn" },
      { label: "Chức danh rõ ràng", text: "Senior Frontend Developer (React/Next.js)" },
    ],
  },
  personal_info: {
    icon: "contact_page",
    color: "indigo",
    tips: [
      "Sử dụng email chuyên nghiệp (tên.ho@gmail.com).",
      "Ghi rõ mã vùng nếu ứng tuyển quốc tế (+84).",
      "LinkedIn URL nên được rút gọn và dễ đọc.",
    ],
    examples: [
      { label: "Email chuyên nghiệp", text: "minhtuan.dev@gmail.com" },
      { label: "LinkedIn", text: "linkedin.com/in/minhtuan-dev" },
    ],
  },
  summary: {
    icon: "article",
    color: "emerald",
    tips: [
      "Viết 3-5 câu ngắn gọn, tập trung vào giá trị bạn mang lại.",
      "Đề cập số năm kinh nghiệm và chuyên môn chính.",
      "Tùy chỉnh phần này cho từng công việc ứng tuyển.",
      "Dùng các từ khóa từ JD (Job Description) của nhà tuyển dụng.",
    ],
    examples: [
      {
        label: "Mẫu hay",
        text: "Fullstack Developer với 4+ năm kinh nghiệm, chuyên sâu về React/Next.js và Node.js. Đã từng dẫn dắt team 5 người và ship 3 sản phẩm SaaS từ 0 đến production. Đam mê xây dựng UX mượt mà và hệ thống có khả năng scale cao.",
      },
    ],
  },
  experience_list: {
    icon: "work",
    color: "orange",
    tips: [
      "Bắt đầu mỗi gạch đầu dòng bằng động từ mạnh: Xây dựng, Tối ưu, Triển khai...",
      "Thêm số liệu cụ thể: 'Tăng tốc tải trang 40%', 'Phục vụ 50k users/ngày'.",
      "Sắp xếp theo thứ tự mới nhất lên trên.",
      "Tập trung vào kết quả, không chỉ liệt kê nhiệm vụ.",
    ],
    examples: [
      { label: "Mô tả yếu", text: "- Làm việc với React, API..." },
      { label: "Mô tả mạnh", text: "- Tái cấu trúc hệ thống state management với Redux Toolkit, giảm 60% bug phát sinh từ side effects, cải thiện thời gian render trung bình từ 1.2s xuống 400ms." },
    ],
  },
  education_list: {
    icon: "school",
    color: "purple",
    tips: [
      "Ghi GPA nếu >= 3.2/4.0 hoặc >= 7.5/10.",
      "Thêm các khóa học liên quan, chứng chỉ nổi bật.",
      "Với người đã đi làm 3+ năm, học vấn ít quan trọng hơn kinh nghiệm.",
    ],
    examples: [
      { label: "Trình bày tốt", text: "Đại học Bách Khoa Hà Nội — CNTT, GPA 3.5/4.0 (2018-2022)" },
    ],
  },
  skill_list: {
    icon: "psychology",
    color: "cyan",
    tips: [
      "Nhóm kỹ năng theo danh mục: Frontend, Backend, DevOps, Soft Skills.",
      "Chỉ liệt kê kỹ năng bạn thực sự tự tin khi bị phỏng vấn.",
      "Dùng các từ khóa kỹ thuật chính xác: 'React.js' thay vì 'JavaScript Framework'.",
    ],
    examples: [
      { label: "Frontend", text: "React.js, Next.js, TypeScript, Tailwind CSS" },
      { label: "Backend", text: "Node.js, Express, PostgreSQL, Redis" },
    ],
  },
  project_list: {
    icon: "code",
    color: "teal",
    tips: [
      "Ưu tiên các dự án thực tế, có users hoặc doanh thu.",
      "Luôn ghi rõ tech stack được sử dụng.",
      "Nếu có, thêm link GitHub hoặc live demo.",
      "Ghi rõ vai trò của bạn trong dự án nhóm.",
    ],
    examples: [
      { label: "Mẫu mô tả dự án", text: "Platform học trực tuyến với 10k+ users. Tech: Next.js, FastAPI, PostgreSQL, AWS. Vai trò: Lead Frontend Developer." },
    ],
  },
  award_list: {
    icon: "emoji_events",
    color: "yellow",
    tips: [
      "Chỉ thêm giải thưởng liên quan đến ngành nghề.",
      "Ghi rõ tên tổ chức trao giải.",
      "Không cần liệt kê quá nhiều — chất hơn lượng.",
    ],
    examples: [
      { label: "Ví dụ", text: "Top 3 Hackathon FPT 2023 — Giải pháp AI tự động hóa quy trình HR" },
    ],
  },
  default: {
    icon: "tips_and_updates",
    color: "slate",
    tips: [
      "Click vào bất kỳ mục nào bên trái để xem gợi ý chi tiết.",
      "Bôi đen văn bản để hiện thanh định dạng: Bold, Italic, Underline, Bullet.",
      "Mỗi mục có thể ẩn/hiện hoặc xóa qua icon ở góc phải.",
      "Nhấn Ctrl+Z để Undo, Ctrl+Shift+Z để Redo.",
    ],
    examples: [
      { label: "Bắt đầu từ đâu?", text: "Điền thông tin Header → Liên hệ → Giới thiệu bản thân trước, rồi mới đến Kinh nghiệm." },
    ],
  },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:    { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700" },
  indigo:  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700" },
  emerald: { bg: "bg-emerald-50",border: "border-emerald-200",text: "text-emerald-700",badge: "bg-emerald-100 text-emerald-700" },
  orange:  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  purple:  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
  cyan:    { bg: "bg-cyan-50",   border: "border-cyan-200",   text: "text-cyan-700",   badge: "bg-cyan-100 text-cyan-700" },
  teal:    { bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-700",   badge: "bg-teal-100 text-teal-700" },
  yellow:  { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
  slate:   { bg: "bg-slate-50",  border: "border-slate-200",  text: "text-slate-700",  badge: "bg-slate-100 text-slate-600" },
};

export function SuggestionPanel() {
  const { selectedSectionId, cv } = useCVStore();

  const activeSection = cv.sections.find((s) => s.id === selectedSectionId);
  const suggestionKey = activeSection?.type || "default";
  const suggestion = SUGGESTIONS[suggestionKey] || SUGGESTIONS.default;
  const color = COLOR_MAP[suggestion.color] || COLOR_MAP.slate;

  const SECTION_LABELS: Record<string, string> = {
    header: "Thông tin cá nhân",
    personal_info: "Liên hệ",
    summary: "Giới thiệu bản thân",
    experience_list: "Kinh nghiệm",
    education_list: "Học vấn",
    skill_list: "Kỹ năng",
    project_list: "Dự án",
    award_list: "Giải thưởng",
    custom_text: "Văn bản tự do",
    custom_image: "Hình ảnh",
  };
  const sectionLabel = activeSection?.title || SECTION_LABELS[suggestionKey] || "Chọn một mục";

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="material-symbols-outlined text-lg text-emerald-500">auto_awesome</span>
          <h2 className="text-sm font-bold text-slate-800">Gợi ý thông minh</h2>
        </div>
        <p className="text-xs text-slate-400">Cập nhật theo mục đang chỉnh sửa</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Active Section Badge */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${color.bg} ${color.border}`}>
          <span className={`material-symbols-outlined text-lg ${color.text}`}>
            {suggestion.icon}
          </span>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang chỉnh sửa</p>
            <p className={`text-sm font-bold ${color.text}`}>{sectionLabel}</p>
          </div>
        </div>

        {/* Tips */}
        <div>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">tips_and_updates</span>
            Mẹo viết hay
          </h3>
          <ul className="space-y-2.5">
            {suggestion.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                <span className={`mt-1 shrink-0 w-4 h-4 rounded-full ${color.badge} flex items-center justify-center text-[9px] font-black`}>
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Examples */}
        {suggestion.examples.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">format_quote</span>
              Ví dụ mẫu
            </h3>
            <div className="space-y-3">
              {suggestion.examples.map((ex, i) => (
                <div key={i} className={`p-3 rounded-xl border ${color.bg} ${color.border}`}>
                  <p className={`text-[10px] font-black uppercase tracking-wider mb-1.5 ${color.text}`}>
                    {ex.label}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">{ex.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formatting reminder */}
        <div className="p-3 bg-slate-900 rounded-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">keyboard</span>
            Phím tắt định dạng
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { key: "Ctrl+B", label: "In đậm" },
              { key: "Ctrl+I", label: "In nghiêng" },
              { key: "Ctrl+U", label: "Gạch chân" },
              { key: "Bôi đen", label: "Hiện toolbar" },
            ].map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] font-mono font-bold">
                  {s.key}
                </span>
                <span className="text-slate-400 text-[10px]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CV Score (decorative) */}
        <div className="p-4 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold opacity-90">Điểm hoàn thiện CV</p>
            <span className="text-2xl font-black">72%</span>
          </div>
          <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: "72%" }} />
          </div>
          <p className="text-[10px] opacity-75 mt-2">Thêm phần Kỹ năng và Dự án để đạt 90%+</p>
        </div>
      </div>
    </div>
  );
}

