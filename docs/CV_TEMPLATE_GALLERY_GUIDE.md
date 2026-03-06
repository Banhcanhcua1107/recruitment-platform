# Hướng dẫn tạo trang CV Template Gallery

Dưới đây là mã nguồn và hướng dẫn chi tiết để bạn có thể tự xây dựng trang "Chọn mẫu CV" (Template Gallery) theo chuẩn thiết kế hiện đại như Canva, Resume.io.

## 1. Cấu trúc thư mục cần tạo

Bạn cần tạo các file sau trong dự án Next.js (App Router):

```text
src/app/candidate/
├── templates/
│   └── page.tsx                        # Trang chính hiển thị Gallery
├── cv-builder/
│   └── components/
│       └── cv/
│           └── templates/
│               ├── TemplateFilterBar.tsx # Thanh lọc danh mục
│               ├── TemplateCard.tsx      # Thẻ hiển thị từng mẫu CV
│               └── TemplateGallery.tsx   # Grid chính chứa dữ liệu & state
```

---

## 2. Mã nguồn các Components

### 2.1. `TemplateFilterBar.tsx`

Tạo file: `src/app/candidate/cv-builder/components/cv/templates/TemplateFilterBar.tsx`

```tsx
"use client";

import React from "react";

const CATEGORIES = [
  "Tất cả",
  "Đơn giản",
  "Chuyên nghiệp",
  "Hiện đại",
  "Ấn tượng",
  "Harvard",
  "ATS",
];

interface TemplateFilterBarProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export function TemplateFilterBar({
  activeCategory,
  onSelectCategory,
}: TemplateFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelectCategory(cat)}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
            activeCategory === cat
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

### 2.2. `TemplateCard.tsx`

Tạo file: `src/app/candidate/cv-builder/components/cv/templates/TemplateCard.tsx`

```tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface TemplateType {
  id: string;
  name: string;
  preview: string;
  categories: string[];
  colors: string[];
}

interface TemplateCardProps {
  template: TemplateType;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();

  const handleSelect = () => {
    // Chuyển hướng sang trang tạo CV với template ID
    router.push(`/candidate/cv-builder/new?templateId=${template.id}`);
  };

  return (
    <div
      onClick={handleSelect}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200 overflow-hidden flex flex-col cursor-pointer relative"
    >
      {/* PREVIEW IMAGE IMAGE */}
      <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.preview}
          alt={`Mẫu CV ${template.name}`}
          className="w-full h-full object-cover object-top opacity-95 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
        />

        {/* HOVER OVERLAY */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <div className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            Sử dụng mẫu này
          </div>
        </div>
      </div>

      {/* CARD INFO SECTION */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          {template.name}
        </h3>

        {/* CATEGORY TAGS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.categories.map((cat, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-md"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* COLOR PALETTE DOTS */}
        <div className="flex items-center gap-1.5 mt-auto pt-4 border-t border-slate-100">
          {template.colors.map((color, idx) => (
            <div
              key={idx}
              className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
              style={{ backgroundColor: color }}
              title={`Màu: ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 2.3. `TemplateGallery.tsx`

Tạo file: `src/app/candidate/cv-builder/components/cv/templates/TemplateGallery.tsx`

```tsx
"use client";

import React, { useState, useMemo } from "react";
import { TemplateFilterBar } from "./TemplateFilterBar";
import { TemplateCard, TemplateType } from "./TemplateCard";

// Mock Data Tạm thời - Bạn có thể thay bằng fetch từ Supabase /api
const MOCK_TEMPLATES: TemplateType[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // Khớp với ID DB F8 Green Modern
    name: "Tiêu chuẩn",
    preview: "/images/cv-placeholder.svg", // Cần thay bằng ảnh preview thật
    categories: ["ATS", "Đơn giản"],
    colors: ["#10b981", "#ffffff", "#334155"],
  },
  {
    id: "modern-elegant",
    name: "Thanh lịch",
    preview: "/images/cv-placeholder.svg",
    categories: ["Hiện đại", "Chuyên nghiệp"],
    colors: ["#ef4444", "#ffffff", "#1e293b"],
  },
  {
    id: "creative-bold",
    name: "Ấn tượng 1",
    preview: "/images/cv-placeholder.svg",
    categories: ["Ấn tượng", "Sáng tạo"],
    colors: ["#3b82f6", "#f8fafc", "#0f172a"],
  },
  {
    id: "harvard-classic",
    name: "Cổ điển (Harvard)",
    preview: "/images/cv-placeholder.svg",
    categories: ["Harvard", "ATS"],
    colors: ["#000000", "#ffffff"],
  },
  // Thêm các mẫu khác tùy ý...
];

export function TemplateGallery() {
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  const filteredTemplates = useMemo(() => {
    if (activeCategory === "Tất cả") return MOCK_TEMPLATES;
    return MOCK_TEMPLATES.filter((tpl) =>
      tpl.categories.includes(activeCategory),
    );
  }, [activeCategory]);

  return (
    <div className="w-full">
      <TemplateFilterBar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-20">
          <h3 className="text-lg font-medium text-slate-500">
            Không tìm thấy mẫu CV nào thuộc danh mục &quot;{activeCategory}
            &quot;
          </h3>
        </div>
      )}
    </div>
  );
}
```

### 2.4. `page.tsx` (Trang chính hiển thị Gallery)

Tạo file: `src/app/candidate/templates/page.tsx`

```tsx
import React from "react";
import { TemplateGallery } from "../cv-builder/components/cv/templates/TemplateGallery";

export const metadata = {
  title: "Chọn mẫu CV - TalentFlow",
  description: "Thư viện mẫu CV chuyên nghiệp, chuẩn ATS từ TalentFlow",
};

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-['Manrope'] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-24 flex flex-col justify-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Chọn mẫu CV
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Chọn một mẫu CV phù hợp với phong cách và ngành nghề của bạn
          </p>
        </div>
      </div>

      {/* Main Content (Trang chứa Gallery) */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <TemplateGallery />
      </div>
    </div>
  );
}
```

---

## 3. Cách sử dụng

1. Tạo đầy đủ các file đã đề cập bên trên.
2. Tại màn hình `Mẫu CV` hay trang `Home`, bạn có thể trỏ Link về `/candidate/templates`.
3. Khi người dùng nhấp vào **Sử dụng mẫu này** bên trong ảnh Card, trang web sẽ chuyển hướng sang màn hình `/candidate/cv-builder/new?templateId=xxx`. (Bạn sẽ cần phải xử lý params `templateId` ở bên file `/new/page.tsx` để có thể tự động nạp template cho user).

> **Lưu ý nhỏ:** Đảm bảo thay thế đường link ảnh `/images/cv-placeholder.svg` bằng ảnh screenshot hoặc banner thật cho các Template bằng cách lấy từ cơ sở dữ liệu `thumbnail_url`.
