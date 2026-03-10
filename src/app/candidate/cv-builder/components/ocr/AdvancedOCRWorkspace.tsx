"use client";

import React, { useEffect, useRef, useState } from "react";
import { Control, useForm, UseFormRegister, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Maximize,
  ScanLine,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { OCRDraftData } from "./ocr-types";
import { transformDraftToSections } from "./ocr-types";
import type { CVSection } from "../../types";

function revokeObjectUrlLater(url: string, delayMs = 15000): void {
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore blob revoke races in development.
    }
  }, delayMs);
}

export interface OCRBoundingBox {
  id: string;
  label: string;
  text: string;
  fieldPath: Parameters<ReturnType<typeof useForm<OCRDraftData>>["register"]>[0];
  confidence: number;
  rect: { x: number; y: number; width: number; height: number };
}

interface AdvancedOCRWorkspaceProps {
  file: File;
  initialData: OCRDraftData;
  boundingBoxes: OCRBoundingBox[];
  onConfirm: (sections: CVSection[]) => void;
  onCancel: () => void;
  isScanning?: boolean;
}

function OCRBox({
  box,
  register,
  scale = 1,
}: {
  box: OCRBoundingBox;
  register: UseFormRegister<OCRDraftData>;
  scale?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const borderColor = isOpen
    ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
    : box.confidence < 0.5
      ? "border-amber-400/60"
      : "border-blue-400/40 group-hover:border-blue-400";

  const bgColor = isOpen
    ? "bg-amber-400/10"
    : box.confidence < 0.5
      ? "bg-amber-400/5"
      : "bg-blue-500/5";

  return (
    <motion.div
      ref={boxRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group absolute flex cursor-pointer items-center justify-center transition-all ${
        isOpen ? "z-50" : "z-10"
      }`}
      style={{
        left: `${box.rect.x}%`,
        top: `${box.rect.y}%`,
        width: `${box.rect.width}%`,
        height: `${box.rect.height}%`,
      }}
      onClick={() => !isOpen && setIsOpen(true)}
    >
      <div
        className={`h-full w-full rounded border-[1.5px] ${borderColor} ${bgColor} transition-all duration-300`}
      >
        {!isOpen && (
          <div className="absolute -right-2 -top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Sparkles
              size={14}
              className={box.confidence < 0.5 ? "text-amber-500" : "text-blue-500"}
              fill="currentColor"
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-50 min-w-[280px] origin-top-left rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur-xl"
            style={{
              top: box.rect.y > 70 ? "auto" : "calc(100% + 12px)",
              bottom: box.rect.y > 70 ? "calc(100% + 12px)" : "auto",
              left: box.rect.x > 70 ? "auto" : 0,
              right: box.rect.x > 70 ? 0 : "auto",
              scale: 1 / scale,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {box.label}
                </span>
                {box.confidence < 0.5 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    Cần kiểm tra
                  </span>
                )}
              </div>
              <button
                type="button"
                title="Đóng"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOpen(false);
                }}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <textarea
              {...register(box.fieldPath)}
              className="min-h-[80px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsOpen(false);
                }}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                Xong
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SourceView({
  file,
  boxes,
  register,
  isScanning,
}: {
  file: File;
  boxes: OCRBoundingBox[];
  register: UseFormRegister<OCRDraftData>;
  isScanning: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [imgSrc, setImgSrc] = useState("");

  useEffect(() => {
    let url = "";

    if (file && file.type.startsWith("image/")) {
      url = URL.createObjectURL(file);
      Promise.resolve().then(() => setImgSrc(url));
    }

    return () => {
      if (url) revokeObjectUrlLater(url);
    };
  }, [file]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-l-2xl border-r border-slate-700/50 bg-slate-900">
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 shadow-xl backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
          <Sparkles size={14} className="text-blue-400" />
          Bản gốc
        </h3>

        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/50 p-0.5">
          <button
            type="button"
            title="Thu nhỏ"
            onClick={() => setScale((value) => Math.max(0.5, value - 0.2))}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700"
          >
            <ZoomOut size={14} />
          </button>
          <span className="w-12 text-center text-xs font-medium text-slate-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            title="Phóng to"
            onClick={() => setScale((value) => Math.min(3, value + 0.2))}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700"
          >
            <ZoomIn size={14} />
          </button>
          <div className="mx-1 h-4 w-px bg-slate-700" />
          <button
            type="button"
            title="Đặt lại zoom"
            onClick={() => setScale(1)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700"
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex h-full w-full flex-1 items-center justify-center overflow-auto p-8">
        <div
          className="relative origin-center shadow-2xl shadow-black/50 transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        >
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt="Source CV"
              className="max-w-none rounded shadow-lg ring-1 ring-slate-800"
              style={{ height: "800px", width: "auto" }}
            />
          ) : (
            <div className="flex h-[800px] w-[600px] flex-col items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-500">
              <span className="material-symbols-outlined mb-2 text-4xl">
                picture_as_pdf
              </span>
              <p className="text-sm font-medium">Chưa có preview PDF</p>
              <p className="mt-1 text-xs text-slate-600">
                Các hộp OCR vẫn hoạt động trên lưới tọa độ ảo
              </p>
            </div>
          )}

          {boxes.map((box) => (
            <OCRBox key={box.id} box={box} register={register} scale={scale} />
          ))}

          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 overflow-hidden rounded"
              >
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
                <motion.div
                  className="absolute left-0 right-0 h-[3px] bg-blue-500"
                  style={{
                    boxShadow:
                      "0 0 20px 5px rgba(59, 130, 246, 0.5), 0 -20px 40px rgba(59, 130, 246, 0.2)",
                  }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function LiveTemplatePreview({ control }: { control: Control<OCRDraftData> }) {
  const data = useWatch({ control }) as OCRDraftData;

  if (!data) return null;

  return (
    <div className="custom-scrollbar h-full overflow-y-auto rounded-r-2xl bg-slate-50">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 shadow-sm backdrop-blur-md">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Bản dựng live
        </h3>
        <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Đồng bộ realtime
        </span>
      </div>

      <div className="p-8 pb-32">
        <div className="flex min-h-[800px] flex-col gap-6 rounded-xl border border-slate-100 bg-white p-8 font-serif text-slate-800 shadow-lg">
          <div className="border-b-2 border-slate-200 pb-6 text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {data.fullName || "Họ và tên"}
            </h1>
            <p className="mt-1 text-lg font-medium text-blue-600">
              {data.title || "Vị trí ứng tuyển"}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
              {data.email && <span>{data.email}</span>}
              {data.email && data.phone && <span>•</span>}
              {data.phone && <span>{data.phone}</span>}
              {(data.email || data.phone) && data.address && <span>•</span>}
              {data.address && <span>{data.address}</span>}
            </div>
          </div>

          {data.summary && (
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
                Giới thiệu
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {data.summary}
              </p>
            </div>
          )}

          {data.experiences?.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                Kinh nghiệm làm việc
              </h2>
              <div className="space-y-4">
                {data.experiences.map((exp, index) => (
                  <div
                    key={exp.id || index}
                    className="relative border-l-2 border-slate-200 pl-4"
                  >
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white" />
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">{exp.position}</h4>
                        <p className="text-sm font-medium text-slate-600">
                          {exp.company}
                        </p>
                      </div>
                      <span className="whitespace-nowrap rounded bg-slate-50 px-2 py-1 text-xs text-slate-400">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.educations?.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                Học vấn
              </h2>
              <div className="space-y-3">
                {data.educations.map((edu, index) => (
                  <div
                    key={edu.id || index}
                    className="flex items-start justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">
                        {edu.institution}
                      </h4>
                      <p className="text-sm text-slate-600">{edu.degree}</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {edu.startDate} - {edu.endDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdvancedOCRWorkspace({
  file,
  initialData,
  boundingBoxes,
  onConfirm,
  onCancel,
  isScanning = false,
}: AdvancedOCRWorkspaceProps) {
  const { register, control, handleSubmit } = useForm<OCRDraftData>({
    defaultValues: initialData,
  });

  const onSubmit = (data: OCRDraftData) => {
    onConfirm(transformDraftToSections(data));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-xl"
    >
      <div className="relative flex h-full max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)]">
        <div className="z-30 flex shrink-0 items-center justify-between border-b border-slate-200/50 bg-white/70 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <ScanLine className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight text-slate-800">
                Interactive OCR Workspace
              </h2>
              <p className="text-xs font-medium text-slate-400">
                Chọn vùng OCR ở bên trái để chỉnh sửa nhanh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-5 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Hủy bỏ
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
            >
              <div className="relative mr-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-400" />
              </div>
              <Check size={16} />
              Xác nhận và hoàn tất
            </motion.button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden bg-slate-100/50">
          <form className="flex w-full" onSubmit={(event) => event.preventDefault()}>
            <div className="z-10 h-full w-1/2 shadow-2xl shadow-slate-900/10">
              <SourceView
                file={file}
                boxes={boundingBoxes}
                register={register}
                isScanning={isScanning}
              />
            </div>
            <div className="z-0 h-full w-1/2 py-1 pl-1">
              <LiveTemplatePreview control={control} />
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
