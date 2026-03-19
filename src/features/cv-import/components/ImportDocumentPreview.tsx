"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { FileText, FileWarning, Image as ImageIcon } from "lucide-react";
import type {
  CVDocumentArtifactView,
  CVDocumentPageView,
  CVDocumentStatus,
} from "@/types/cv-import";

const PDFPagePreview = dynamic(
  () =>
    import("@/app/candidate/cv-builder/components/ocr/PDFPagePreview").then(
      (module) => module.PDFPagePreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-slate-100 p-3">
        <div className="flex min-h-[560px] items-center justify-center rounded-[28px] border border-slate-200 bg-white text-sm text-slate-500 shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)]">
          Dang khoi tao preview PDF...
        </div>
      </div>
    ),
  },
);

type PreviewKind = "pdf" | "image" | "docx" | "unknown";

interface ImportDocumentPreviewProps {
  documentId: string;
  pages: CVDocumentPageView[];
  artifacts: CVDocumentArtifactView[];
  status: CVDocumentStatus;
  selectedPage: number;
}

interface StablePreviewPage {
  page_number: number;
  canonical_width_px: number;
  canonical_height_px: number;
  background_url: string;
}

interface StableFallbackPreview {
  kind: PreviewKind;
  url: string;
  fileName: string;
}

interface StablePreviewSnapshot {
  pages: StablePreviewPage[];
  fallback: StableFallbackPreview | null;
}

const STABLE_PREVIEW_CACHE = new Map<string, StablePreviewSnapshot>();

function resolveStablePreviewSnapshot(
  documentId: string,
  nextPages: StablePreviewPage[],
  fallbackCandidate: StableFallbackPreview | null
): StablePreviewSnapshot {
  const current = STABLE_PREVIEW_CACHE.get(documentId);

  if (!current) {
    const initialSnapshot = {
      pages: nextPages,
      fallback: fallbackCandidate,
    };
    STABLE_PREVIEW_CACHE.set(documentId, initialSnapshot);
    return initialSnapshot;
  }

  const resolvedPages =
    nextPages.length > 0
      ? nextPages.map((page) => current.pages.find((item) => item.page_number === page.page_number) ?? page)
      : current.pages;

  let resolvedFallback = current.fallback;
  if (!resolvedFallback && fallbackCandidate) {
    resolvedFallback = fallbackCandidate;
  } else if (
    resolvedFallback &&
    fallbackCandidate &&
    resolvedFallback.kind !== "pdf" &&
    fallbackCandidate.kind === "pdf" &&
    resolvedPages.length === 0
  ) {
    resolvedFallback = fallbackCandidate;
  }

  const snapshot = {
    pages: resolvedPages,
    fallback: resolvedFallback,
  };
  STABLE_PREVIEW_CACHE.set(documentId, snapshot);
  return snapshot;
}

function inferPreviewKindFromUrl(url: string | null): PreviewKind {
  if (!url) return "unknown";

  try {
    const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
    if (/\.(png|jpe?g|webp|bmp|gif|tiff?)$/.test(pathname)) return "image";
    if (/\.pdf$/.test(pathname)) return "pdf";
    if (/\.docx$/.test(pathname)) return "docx";
  } catch {
    return "unknown";
  }

  return "unknown";
}

function getArtifact(artifacts: CVDocumentArtifactView[], kind: CVDocumentArtifactView["kind"]) {
  return artifacts.find((artifact) => artifact.kind === kind && artifact.status === "ready");
}

function extractFileName(url: string | null) {
  if (!url) return "preview";

  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const fileName = pathname.split("/").pop();
    return fileName || "preview";
  } catch {
    return "preview";
  }
}

function renderPlaceholder(status: CVDocumentStatus) {
  const copy: Record<CVDocumentStatus, { title: string; body: string }> = {
    uploaded: {
      title: "Đã nhận file",
      body: "Hệ thống đang chuẩn bị tài liệu trước khi dựng preview đầu tiên.",
    },
    queued: {
      title: "Đang chờ vào pipeline",
      body: "Preview sẽ xuất hiện ngay khi tài liệu được đưa vào bước render.",
    },
    normalizing: {
      title: "Đang chuẩn hóa tài liệu",
      body: "Hệ thống đang tối ưu file để bám sát bố cục gốc trước khi render preview.",
    },
    rendering_preview: {
      title: "Đang dựng preview",
      body: "Trang xem trước sẽ xuất hiện ngay sau khi render xong.",
    },
    ocr_running: {
      title: "Đang OCR tài liệu",
      body: "Preview sẽ tiếp tục hoàn thiện trong khi hệ thống nhận diện nội dung.",
    },
    layout_running: {
      title: "Đang phân tích bố cục",
      body: "Hệ thống đã có dữ liệu xử lý nhưng chưa có artifact preview khả dụng.",
    },
    vl_running: {
      title: "Đang phân tích nội dung",
      body: "Dữ liệu thị giác đang được xử lý. Preview sẽ hiện khi artifact sẵn sàng.",
    },
    parsing_structured: {
      title: "Đang dựng JSON",
      body: "Kết quả phân tích gần hoàn tất, preview sẽ được ưu tiên hiển thị khi artifact có sẵn.",
    },
    persisting: {
      title: "Đang lưu kết quả",
      body: "Hệ thống đang ghi lại artifact cuối cùng.",
    },
    ready: {
      title: "Chưa có preview",
      body: "Hiện chưa tìm thấy artifact preview nào cho tài liệu này. Hãy thử làm mới dữ liệu.",
    },
    partial_ready: {
      title: "Preview chưa đầy đủ",
      body: "Tài liệu đã có kết quả một phần nhưng chưa có artifact preview khả dụng.",
    },
    failed: {
      title: "Không thể dựng preview",
      body: "Pipeline đã dừng trước khi tạo được bản xem trước.",
    },
    retrying: {
      title: "Đang thử lại",
      body: "Tài liệu đang được đưa quay lại pipeline xử lý.",
    },
  };

  return (
    <div className="flex min-h-[560px] items-center justify-center rounded-[28px] border border-slate-200/80 bg-white px-8 py-10 shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FileText size={24} />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">{copy[status].title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{copy[status].body}</p>
      </div>
    </div>
  );
}

function DocxFallback({ fileName }: { fileName: string }) {
  return (
    <div className="flex min-h-[560px] items-center justify-center rounded-[28px] border border-slate-200/80 bg-white px-8 py-10 shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)]">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FileWarning size={24} />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-900">Đang chờ preview cho file Word</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          File DOCX đã được tải lên, nhưng hiện chưa có artifact preview khả dụng. Khi preview PDF hoặc ảnh trang được tạo xong,
          khu vực này sẽ hiển thị nội dung thật của tài liệu.
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {fileName}
        </div>
      </div>
    </div>
  );
}

function ImageFallback({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)] md:p-4">
      <div className="mb-3 flex items-center justify-between border-b border-slate-100 px-2 pb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Ảnh gốc
        </span>
        <span className="max-w-[240px] truncate text-xs text-slate-400">{fileName}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={fileName}
        className="mx-auto h-auto max-h-[72vh] w-full rounded-[20px] object-contain"
      />
    </div>
  );
}

export const ImportDocumentPreview = memo(function ImportDocumentPreview({
  documentId,
  pages,
  artifacts,
  status,
  selectedPage,
}: ImportDocumentPreviewProps) {
  const previewPdfArtifact = useMemo(() => getArtifact(artifacts, "preview_pdf"), [artifacts]);
  const originalArtifact = useMemo(() => getArtifact(artifacts, "original_file"), [artifacts]);
  const fallbackUrl = previewPdfArtifact?.download_url ?? originalArtifact?.download_url ?? null;
  const fallbackKind = inferPreviewKindFromUrl(fallbackUrl);
  const fallbackFileName = extractFileName(fallbackUrl);
  const nextPages = useMemo(
    () =>
      pages
        .filter((page): page is CVDocumentPageView & { background_url: string } => Boolean(page.background_url))
        .map((page) => ({
          page_number: page.page_number,
          canonical_width_px: page.canonical_width_px,
          canonical_height_px: page.canonical_height_px,
          background_url: page.background_url,
        })),
    [pages]
  );
  const stableSnapshot = useMemo(
    () =>
      resolveStablePreviewSnapshot(
        documentId,
        nextPages,
        fallbackUrl
          ? {
              kind: fallbackKind,
              url: fallbackUrl,
              fileName: fallbackFileName,
            }
          : null
      ),
    [documentId, fallbackFileName, fallbackKind, fallbackUrl, nextPages]
  );
  const stablePages = stableSnapshot.pages;
  const stableFallback = stableSnapshot.fallback;

  const selectedPageView = useMemo(
    () => stablePages.find((page) => page.page_number === selectedPage) ?? stablePages[0] ?? null,
    [selectedPage, stablePages]
  );

  if (selectedPageView?.background_url) {
    return (
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)] md:p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 px-2 pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Trang {selectedPageView.page_number}
          </span>
          <span className="text-xs text-slate-400">
            {selectedPageView.canonical_width_px} × {selectedPageView.canonical_height_px}
          </span>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedPageView.background_url}
          alt={`Preview trang ${selectedPageView.page_number}`}
          className="mx-auto h-auto w-full rounded-[20px] object-contain"
        />
      </div>
    );
  }

  if (stableFallback?.url && stableFallback.kind === "pdf") {
    return <PDFPagePreview fileName={stableFallback.fileName} previewUrl={stableFallback.url} />;
  }

  if (stableFallback?.url && stableFallback.kind === "image") {
    return <ImageFallback url={stableFallback.url} fileName={stableFallback.fileName} />;
  }

  if (stableFallback?.url && stableFallback.kind === "docx") {
    return <DocxFallback fileName={stableFallback.fileName} />;
  }

  if (stableFallback?.url) {
    return (
      <div className="flex min-h-[560px] items-center justify-center rounded-[28px] border border-slate-200/80 bg-white px-8 py-10 shadow-[0_28px_60px_-35px_rgba(15,23,42,0.35)]">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <ImageIcon size={24} />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">Không thể xác định loại preview</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Hệ thống đã có file gốc nhưng chưa xác định được cách hiển thị trực tiếp trong panel này.
          </p>
          <a
            href={stableFallback.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Mở file nguồn
          </a>
        </div>
      </div>
    );
  }

  return renderPlaceholder(status);
});
