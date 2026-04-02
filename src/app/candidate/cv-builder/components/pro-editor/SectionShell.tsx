"use client";

import type { ReactNode } from "react";
import {
  AlignLeft,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  GraduationCap,
  Handshake,
  Languages,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddSectionButtons } from "./AddSectionButtons";
import type {
  CVResolvedSectionStyleConfig,
  CVTemplateIconToken,
} from "./schema-driven-preview/types";

const ICON_MAP: Record<CVTemplateIconToken, LucideIcon> = {
  summary: AlignLeft,
  target: Target,
  experience: BriefcaseBusiness,
  education: GraduationCap,
  skills: Sparkles,
  languages: Languages,
  projects: FolderKanban,
  certificates: BadgeCheck,
  awards: Award,
  activities: Handshake,
  custom: FileText,
};

function SectionTitle({ styleConfig }: { styleConfig: CVResolvedSectionStyleConfig }) {
  const Icon = ICON_MAP[styleConfig.icon] ?? FileText;
  const titleText = styleConfig.titleUppercase ? styleConfig.title.toUpperCase() : styleConfig.title;

  if (styleConfig.titleVariant === "ribbon") {
    return (
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={cn(
            "inline-flex items-center rounded-md border px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]",
            styleConfig.titleBackgroundClassName,
            styleConfig.titleBorderClassName,
            styleConfig.titleTextClassName,
          )}
        >
          <span
            className={cn(
              "mr-2 inline-flex h-6 w-6 items-center justify-center border",
              styleConfig.iconShape === "circle" ? "rounded-full" : "rounded-sm",
              styleConfig.iconColorClassName,
              styleConfig.iconBackgroundClassName,
              styleConfig.iconBorderClassName,
            )}
          >
            <Icon size={13} />
          </span>
          <span className="text-[24px] font-semibold leading-none tracking-[-0.01em]">{titleText}</span>
        </div>
        <div className={cn("h-px flex-1", styleConfig.dividerClassName)} />
      </div>
    );
  }

  if (styleConfig.titleVariant === "underline") {
    return (
      <div className={cn("mb-3 flex items-center gap-2.5 border-b pb-2", styleConfig.titleBorderClassName)}>
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center border",
            styleConfig.iconShape === "circle" ? "rounded-full" : "rounded-sm",
            styleConfig.iconColorClassName,
            styleConfig.iconBackgroundClassName,
            styleConfig.iconBorderClassName,
          )}
        >
          <Icon size={13} />
        </span>
        <h3 className={cn("text-[24px] font-semibold leading-[1.1] tracking-[-0.01em]", styleConfig.titleTextClassName)}>{titleText}</h3>
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center border",
          styleConfig.iconShape === "circle" ? "rounded-full" : "rounded-sm",
          styleConfig.iconColorClassName,
          styleConfig.iconBackgroundClassName,
          styleConfig.iconBorderClassName,
        )}
      >
        <Icon size={13} />
      </span>
      <h3 className={cn("text-[22px] font-semibold leading-tight tracking-[-0.01em]", styleConfig.titleTextClassName)}>{titleText}</h3>
    </div>
  );
}

interface SectionShellProps {
  styleConfig: CVResolvedSectionStyleConfig;
  isActive: boolean;
  onAddAbove: () => void;
  onAddBelow: () => void;
  children: ReactNode;
}

export function SectionShell({ styleConfig, isActive, onAddAbove, onAddBelow, children }: SectionShellProps) {
  return (
    <div className="group relative break-inside-avoid-page transition-all print:break-inside-avoid-page" data-cv-section-shell>
      <AddSectionButtons
        isActive={isActive}
        borderClassName={styleConfig.itemBorderClassName}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />

      <div
        className={cn(
          "rounded-lg border px-3.5 py-3 transition-all duration-200",
          styleConfig.borderClassName,
          styleConfig.backgroundClassName,
          isActive
            ? "border-emerald-400/70 bg-emerald-50/30 shadow-[0_0_0_1px_rgba(16,185,129,0.14),0_16px_30px_-24px_rgba(15,23,42,0.35)]"
            : "hover:border-slate-400/80 hover:bg-slate-50/60",
        )}
      >
        <SectionTitle styleConfig={styleConfig} />
        <div className={styleConfig.contentTextClassName} data-cv-section-content>
          {children}
        </div>
      </div>
    </div>
  );
}
