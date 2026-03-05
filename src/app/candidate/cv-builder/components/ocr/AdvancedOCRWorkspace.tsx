"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, UseFormRegister, useWatch, Control } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, ZoomIn, ZoomOut, Maximize, ScanLine } from "lucide-react";
import type { OCRDraftData } from "./ocr-types";
import { transformDraftToSections } from "./ocr-types";
import type { CVSection } from "../../types";

// ── Types ──────────────────────────────────────────────────
export interface OCRBoundingBox {
  id: string;      // Unique ID for the box
  label: string;   // UI Label (e.g. "Họ và tên", "Mô tả công việc")
  text: string;    // Extracted text
  fieldPath: Parameters<ReturnType<typeof useForm<OCRDraftData>>["register"]>[0]; // react-hook-form path
  confidence: number;
  // Coordinates as percentages of original image width/height
  rect: { x: number; y: number; width: number; height: number };
}

interface AdvancedOCRWorkspaceProps {
  file: File;
  initialData: OCRDraftData;
  boundingBoxes: OCRBoundingBox[];
  onConfirm: (sections: CVSection[]) => void;
  onCancel: () => void;
  isScanning?: boolean; // If true, show the scanning animation over the source view
}

// ── Left Pane: OCR Bounding Box Component ───────────────────
function OCRBox({
  box,
  register,
  scale = 1
}: {
  box: OCRBoundingBox;
  register: UseFormRegister<OCRDraftData>;
  scale?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Styling based on confidence and focus
  const isFocused = isOpen;
  // Use glowing Gold color for active state, or a subtle blue when inactive
  const borderColor = isFocused
    ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
    : box.confidence < 0.5
    ? "border-amber-400/60"
    : "border-blue-400/40 group-hover:border-blue-400";
  
  const bgWarning = isFocused
    ? "bg-amber-400/10"
    : box.confidence < 0.5
    ? "bg-amber-400/5"
    : "bg-blue-500/5";

  return (
    <motion.div
      ref={boxRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute cursor-pointer flex items-center justify-center transition-all group ${isFocused ? 'z-50' : 'z-10'}`}
      style={{
        left: `${box.rect.x}%`,
        top: `${box.rect.y}%`,
        width: `${box.rect.width}%`,
        height: `${box.rect.height}%`,
      }}
      onClick={() => !isOpen && setIsOpen(true)}
    >
      {/* The Box */}
      <div
        className={`w-full h-full border-[1.5px] ${borderColor} ${bgWarning} rounded transition-all duration-300`}
      >
        {!isFocused && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Sparkles size={14} className={box.confidence < 0.5 ? "text-amber-500" : "text-blue-500"} fill="currentColor" />
          </div>
        )}
      </div>

      {/* Popover Editor */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
              absolute z-50 p-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl
              min-w-[280px] origin-top-left
            `}
            // Auto position based on box location
            style={{
              top: box.rect.y > 70 ? "auto" : "calc(100% + 12px)",
              bottom: box.rect.y > 70 ? "calc(100% + 12px)" : "auto",
              left: box.rect.x > 70 ? "auto" : 0,
              right: box.rect.x > 70 ? 0 : "auto",
              scale: 1 / scale // Counter-act parent zoom scale
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
                  {box.label}
                </span>
                {box.confidence < 0.5 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Cẩn thận
                  </span>
                )}
              </div>
              <button
                type="button"
                title="Đóng"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            <textarea
              {...register(box.fieldPath)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 text-sm text-slate-700 resize-none min-h-[80px]"
              autoFocus
            />

            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
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

// ── Left Pane: Source View ─────────────────────────────────
function SourceView({
  file,
  boxes,
  register,
  isScanning
}: {
  file: File;
  boxes: OCRBoundingBox[];
  register: UseFormRegister<OCRDraftData>;
  isScanning: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [imgSrc, setImgSrc] = useState<string>("");

  useEffect(() => {
    let url = "";
    if (file && file.type.startsWith("image/")) {
      url = URL.createObjectURL(file);
      // Avoid sync setState warning by deferring slightly
      Promise.resolve().then(() => setImgSrc(url));
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div className="relative flex flex-col h-full bg-slate-900 rounded-l-2xl overflow-hidden border-r border-slate-700/50">
      {/* Source Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between px-4 py-2 bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={14} className="text-blue-400" />
          Bản gốc (Source View)
        </h3>
        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg border border-slate-700 p-0.5">
          <button type="button" title="Thu nhỏ" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400">
            <ZoomOut size={14} />
          </button>
          <span className="text-xs font-medium text-slate-300 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" title="Phóng to" onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400">
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button type="button" title="Đặt lại zoom" onClick={() => setScale(1)} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      {/* Image Canvas */}
      <div className="flex-1 w-full h-full overflow-auto custom-scrollbar flex items-center justify-center p-8">
        <div 
          className="relative origin-center transition-transform duration-200 shadow-2xl shadow-black/50"
          style={{ transform: `scale(${scale})` }}
        >
          {imgSrc ? (
            <img src={imgSrc} alt="Source CV" className="max-w-none rounded shadow-lg ring-1 ring-slate-800" style={{ height: '800px', width: 'auto' }} />
          ) : (
            <div className="w-[600px] h-[800px] bg-slate-800 rounded flex flex-col items-center justify-center text-slate-500 border border-slate-700">
              <span className="material-symbols-outlined text-4xl mb-2">picture_as_pdf</span>
              <p className="text-sm font-medium">Bản xem trước PDF không có sẵn</p>
              <p className="text-xs mt-1 text-slate-600">Boxes OCR vẫn hoạt động qua grid ảo</p>
            </div>
          )}

          {/* Coordinate Mapping: Overlay the boxes relative to the image container */}
          {boxes.map((box) => (
            <OCRBox
              key={box.id}
              box={box}
              register={register}
              scale={scale}
            />
          ))}

          {/* Scanning Effect Overlay */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none rounded overflow-hidden"
              >
                {/* Backdrop blur revealing gradually (simulated by blur filter on lower opacity elements if needed) */}
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
                {/* The Laser Line */}
                <motion.div
                  className="absolute left-0 right-0 h-[3px] bg-blue-500"
                  style={{
                    boxShadow: "0 0 20px 5px rgba(59, 130, 246, 0.5), 0 -20px 40px rgba(59, 130, 246, 0.2)",
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

// ── Right Pane: Live Template Preview ──────────────────────
// This renders a mocked, clean version of a CV template fed by live `watch()` data
function LiveTemplatePreview({ control }: { control: Control<OCRDraftData> }) {
  const data = useWatch({ control }) as OCRDraftData;

  if (!data) return null;

  return (
    <div className="h-full bg-slate-50 rounded-r-2xl overflow-y-auto custom-scrollbar">
      {/* Template Toolbar */}
      <div className="sticky top-0 z-20 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Kết quả Live (Template)
        </h3>
        <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Đồng bộ Realtime
        </span>
      </div>

      {/* The Antigravity Elegant CV Template Mock */}
      <div className="p-8 pb-32">
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-8 min-h-[800px] text-slate-800 flex flex-col gap-6 font-serif">
          {/* Header */}
          <div className="border-b-2 border-slate-200 pb-6 text-center">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.fullName || "Họ và tên"}</h1>
            <p className="text-lg font-medium text-blue-600 mt-1">{data.title || "Vị trí ứng tuyển"}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-sm text-slate-500">
              {data.email && <span>{data.email}</span>}
              {data.email && data.phone && <span>•</span>}
              {data.phone && <span>{data.phone}</span>}
              {(data.email || data.phone) && data.address && <span>•</span>}
              {data.address && <span>{data.address}</span>}
            </div>
          </div>

          {/* Summary */}
          {data.summary && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Giới thiệu</h2>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{data.summary}</p>
            </div>
          )}

          {/* Experience */}
          {data.experiences?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Kinh nghiệm làm việc</h2>
              <div className="space-y-4">
                {data.experiences.map((exp, i) => (
                  <div key={exp.id || i} className="relative pl-4 border-l-2 border-slate-200">
                    <div className="absolute w-2 h-2 rounded-full bg-slate-300 -left-[5px] top-1.5 ring-4 ring-white" />
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">{exp.position}</h4>
                        <p className="text-sm font-medium text-slate-600">{exp.company}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {data.educations?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Học vấn</h2>
              <div className="space-y-3">
                {data.educations.map((edu, i) => (
                  <div key={edu.id || i} className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{edu.institution}</h4>
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

// ════════════════════════════════════════════════════════════════
// Main Advanced Workspace Orchestrator
// ════════════════════════════════════════════════════════════════
export function AdvancedOCRWorkspace({
  file,
  initialData,
  boundingBoxes,
  onConfirm,
  onCancel,
  isScanning = false
}: AdvancedOCRWorkspaceProps) {
  const { register, control, handleSubmit } = useForm<OCRDraftData>({
    defaultValues: initialData
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
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl"
    >
      <div className="flex flex-col w-full max-w-7xl h-full max-h-[90vh] bg-white rounded-3xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-200/50 overflow-hidden relative">
        
        {/* Workspace Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-slate-200/50 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ScanLine className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg leading-tight">Interactive OCR Workspace</h2>
              <p className="text-xs text-slate-400 font-medium">Click vào các ô xanh bên trái để chỉnh sửa nhanh</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold transition-colors"
            >
              Hủy bỏ
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleSubmit(onSubmit)}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2 relative"
            >
              <div className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-400"></span>
              </div>
              <Check size={16} />
              Xác nhận & Hoàn tất
            </motion.button>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="flex flex-1 overflow-hidden bg-slate-100/50">
          <form className="flex w-full" onSubmit={e => e.preventDefault()}>
            {/* Split 50/50 */}
            <div className="w-1/2 h-full z-10 shadow-2xl shadow-slate-900/10">
              <SourceView
                file={file}
                boxes={boundingBoxes}
                register={register}
                isScanning={isScanning}
              />
            </div>
            <div className="w-1/2 h-full z-0 pl-1 py-1">
              <LiveTemplatePreview control={control} />
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
