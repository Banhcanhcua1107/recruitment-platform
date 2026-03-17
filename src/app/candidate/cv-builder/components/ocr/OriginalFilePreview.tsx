"use client";

import React, { memo } from "react";
import dynamic from "next/dynamic";
import { FileText, FileWarning, Image as ImageIcon } from "lucide-react";

const PDFPagePreview = dynamic(
  () =>
    import("./PDFPagePreview").then((module) => module.PDFPagePreview),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-slate-100 p-3">
        <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          Đang khởi tạo preview PDF...
        </div>
      </div>
    ),
  },
);

interface OriginalFilePreviewProps {
  file: File | null;
  previewUrl: string | null;
  previewKind: "image" | "pdf" | "docx" | "unknown";
  previewError?: string | null;
}

function EmptyPreviewState() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-slate-50">
      <div className="text-center">
        <FileText size={36} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-500">
          Chưa có tài liệu để xem trước.
        </p>
      </div>
    </div>
  );
}

function DocxPreviewState({
  fileName,
  previewError,
}: {
  fileName: string;
  previewError?: string | null;
}) {
  const isError = Boolean(previewError);

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            isError ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600"
          }`}
        >
          {isError ? <FileWarning size={28} /> : <FileText size={28} />}
        </div>

        <h3 className="mt-4 text-base font-semibold text-slate-800">
          {isError
            ? "Không thể chuyển Word sang PDF"
            : "Đang chuyển Word sang PDF"}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {isError
            ? previewError
            : "Tài liệu Word sẽ được chuyển sang PDF ở backend để preview và OCR theo đúng bố cục gốc."}
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          {fileName}
        </div>

        {!isError ? (
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Sau khi chuyển xong, panel bên trái sẽ hiển thị preview PDF nhiều
            trang của tài liệu này.
          </p>
        ) : (
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Hãy kiểm tra LibreOffice (`soffice --headless`) hoặc biến
            `SOFFICE_PATH` trên backend rồi thử lại.
          </p>
        )}
      </div>
    </div>
  );
}

export const OriginalFilePreview = memo(function OriginalFilePreview({
  file,
  previewUrl,
  previewKind,
  previewError,
}: OriginalFilePreviewProps) {
  if (!file) {
    return <EmptyPreviewState />;
  }

  if (previewKind === "image" && previewUrl) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-100 p-4">
        <img
          src={previewUrl}
          alt={file.name}
          className="max-h-full max-w-full rounded-2xl object-contain shadow-lg shadow-slate-900/10"
        />
      </div>
    );
  }

  if ((previewKind === "pdf" || previewKind === "docx") && previewUrl) {
    return <PDFPagePreview fileName={file.name} previewUrl={previewUrl} />;
  }

  if (previewKind === "docx") {
    return (
      <DocxPreviewState fileName={file.name} previewError={previewError} />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <ImageIcon size={36} className="text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-600">
        Không thể hiển thị preview tài liệu.
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Tài liệu vẫn có thể được gửi sang pipeline OCR để trích xuất nội dung,
        nhưng preview gốc hiện chưa sẵn sàng.
      </p>
    </div>
  );
});
