"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { CVTemplateDefinition } from "./templateCatalog";
import { TemplatePreviewRenderer } from "./TemplatePreviewRenderer";

type ThumbnailDensity = "card" | "rail" | "modal";

interface ResumeTemplateThumbnailProps {
  template: CVTemplateDefinition;
  density?: ThumbnailDensity;
  className?: string;
}

const DENSITY_CLASS_NAME: Record<ThumbnailDensity, string> = {
  card: "rounded-[18px] p-2.5",
  rail: "rounded-xl p-1.5",
  modal: "rounded-[22px] p-3",
};

export const ResumeTemplateThumbnail = memo(function ResumeTemplateThumbnail({
  template,
  density = "card",
  className,
}: ResumeTemplateThumbnailProps) {
  return (
    <div
      className={cn(
        "relative aspect-210/297 w-full overflow-hidden border border-slate-200/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.97),rgba(241,245,249,0.92)_46%,rgba(226,232,240,0.86))] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        DENSITY_CLASS_NAME[density],
        className,
      )}
    >
      <TemplatePreviewRenderer template={template} mode="thumbnail" className="h-full w-full" />
    </div>
  );
});
