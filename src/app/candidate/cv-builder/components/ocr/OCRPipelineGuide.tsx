"use client";

import React from "react";
import { BookOpenText, Boxes, FileSearch, Workflow } from "lucide-react";

const PIPELINE_STEPS = [
  "Document/PDF -> detection -> crop -> recognition -> OCR blocks",
  "OCR blocks -> reading order recovery -> CV draft parsing",
  "Editable overlay keeps block positions so users can correct the source layout",
];

const FORMAL_NOTES = [
  "The pipeline follows a PaddleOCR-style architecture: detection, angle correction, and recognition.",
  "For CV parsing, correct coordinates and reading order matter as much as the text itself.",
  "Low-confidence OCR output should stay in review mode instead of being committed directly into the builder.",
];

const QUICK_GUIDE = [
  "Prefer direct PDF text extraction when a text layer exists; OCR is the fallback for scans and images.",
  "Multi-column CVs, icons, and timelines are common sources of reading-order errors.",
  "Do not discard bounding boxes too early because the parser needs layout context to infer sections.",
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
            OCR Pipeline in CV Builder
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
              Formal report
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
              Quick guide
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
            OCR caveats
          </h3>
        </div>
        <p className="text-xs leading-5 text-amber-800">
          The current OCR stack follows a PP-OCR / PaddleOCR-style pipeline.
          Best results come from clean PDFs, straight scans, and images with
          limited distortion. For multi-column CVs or icon-heavy templates,
          users should still review the draft before sending it into the builder.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Repo documents
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
