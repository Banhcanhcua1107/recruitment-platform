"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CVTemplateConfig } from "./schema-driven-preview/types";

interface CVPaperProps {
  template: CVTemplateConfig;
  fontFamilyClassName?: string;
  bodyTextClassName?: string;
  children: ReactNode;
}

export function CVPaper({ template, fontFamilyClassName, bodyTextClassName, children }: CVPaperProps) {
  const isTealFamily = template.visualFamily === "teal";

  if (isTealFamily) {
    return (
      <div
        className={cn(
          "mx-auto h-280.5 w-full max-w-198.5 overflow-hidden bg-white print:h-[297mm] print:w-[210mm] print:max-w-none print:border-0 print:bg-white print:px-0 print:py-0 print:shadow-none",
          template.pageSettings.paperFrameClassName,
          template.pageSettings.paperPatternClassName,
          template.pageSettings.paperPaddingClassName,
          template.typographySettings.bodyFontClassName,
          template.typographySettings.bodyTextClassName,
          fontFamilyClassName,
          bodyTextClassName,
          template.colorPalette.pageTextClassName,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-215 rounded-[28px] border border-slate-200 bg-white/72 px-4 py-6 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10 print:max-w-none print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:shadow-none",
        template.pageSettings.outerFrameClassName,
      )}
    >
      <div
        className={cn(
          "mx-auto h-280.5 w-198.5 max-w-full overflow-hidden print:h-[297mm] print:w-[210mm]",
          template.pageSettings.paperFrameClassName,
          template.pageSettings.paperPatternClassName,
          template.pageSettings.paperPaddingClassName,
          template.typographySettings.bodyFontClassName,
          template.typographySettings.bodyTextClassName,
          fontFamilyClassName,
          bodyTextClassName,
          template.colorPalette.pageTextClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
