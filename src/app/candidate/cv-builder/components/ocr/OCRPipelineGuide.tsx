"use client";

import React from "react";
import { BookOpenText, Boxes, FileSearch, Workflow } from "lucide-react";

const PIPELINE_STEPS = [
  "Tài liệu/PDF -> phát hiện vùng chữ -> cắt vùng -> nhận dạng -> tạo block OCR",
  "Block OCR -> khôi phục thứ tự đọc -> phân tích thành bản nháp CV",
  "Lớp phủ chỉnh sửa giữ nguyên vị trí block để bạn sửa lại đúng bố cục nguồn",
];

const FORMAL_NOTES = [
  "Pipeline hiện tại đi theo kiến trúc kiểu PaddleOCR: phát hiện, chỉnh góc và nhận dạng ký tự.",
  "Trong bài toán phân tích CV, tọa độ và thứ tự đọc quan trọng không kém bản thân nội dung chữ.",
  "Những block OCR có độ tin cậy thấp nên được giữ ở trạng thái rà soát trước khi đẩy hẳn vào CV Builder.",
];

const QUICK_GUIDE = [
  "Ưu tiên lấy text trực tiếp từ PDF nếu file có text layer; OCR chỉ là phương án dự phòng cho ảnh scan và ảnh chụp.",
  "CV nhiều cột, nhiều icon hoặc timeline là những trường hợp dễ gây lỗi thứ tự đọc.",
  "Không nên loại bỏ bounding box quá sớm vì parser còn cần ngữ cảnh layout để suy ra từng mục nội dung.",
];

const DOC_PATHS = [
  "docs/OCR/PADDLEOCR_TRAINING_ANALYSIS.md",
  "docs/OCR/PADDLEOCR_TRAINING_FORMAL_REPORT.md",
  "docs/OCR/PADDLEOCR_TRAINING_QUICK_GUIDE.md",
];

export function OCRPipelineGuide() {
  return (
    <div className="mt-6 grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Workflow size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-800">
            Quy trình OCR trong CV Builder
          </h3>
        </div>
        <div className="space-y-2">
          {PIPELINE_STEPS.map((item) => (
            <p key={item} className="text-xs leading-5 text-slate-600">
              {item}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <BookOpenText size={16} className="text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-800">
              Ghi chú kỹ thuật
            </h3>
          </div>
          <div className="space-y-2">
            {FORMAL_NOTES.map((item) => (
              <p key={item} className="text-xs leading-5 text-slate-600">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Boxes size={16} className="text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-800">
              Hướng dẫn nhanh
            </h3>
          </div>
          <div className="space-y-2">
            {QUICK_GUIDE.map((item) => (
              <p key={item} className="text-xs leading-5 text-slate-600">
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <FileSearch size={16} className="text-amber-700" />
          <h3 className="text-sm font-semibold text-amber-900">
            Lưu ý khi dùng OCR
          </h3>
        </div>
        <p className="text-xs leading-5 text-amber-800">
          Stack OCR hiện tại đi theo hướng PP-OCR / PaddleOCR. Kết quả tốt nhất
          thường đến từ PDF sạch, ảnh scan thẳng và hình ít méo. Với CV nhiều cột
          hoặc nhiều icon, bạn vẫn nên rà soát lại bản nháp trước khi chuyển hẳn
          sang CV Builder.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Tài liệu trong repo
        </h3>
        <div className="space-y-2">
          {DOC_PATHS.map((path) => (
            <p
              key={path}
              className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600"
            >
              {path}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
