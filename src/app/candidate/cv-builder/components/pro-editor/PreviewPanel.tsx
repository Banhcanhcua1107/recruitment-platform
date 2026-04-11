"use client";

import type { LucideIcon } from "lucide-react";
import { CVCanvas } from "@/app/candidate/cv-builder/components/pro-editor/CVCanvas";
import { ZoomControls } from "@/app/candidate/cv-builder/components/pro-editor/ZoomControls";
import type { CVSection } from "../../types";

export interface PreviewToolbarAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface PreviewPanelProps {
  controls: PreviewToolbarAction[];
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomClassName: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  onRemoveSection?: (sectionId: string) => void;
  onMoveSectionUp?: (sectionId: string) => void;
  onMoveSectionDown?: (sectionId: string) => void;
  templateId?: string;
}

export function PreviewPanel({
  controls,
  zoomPercent,
  canZoomIn,
  canZoomOut,
  zoomClassName,
  onZoomIn,
  onZoomOut,
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateSectionData,
  onRequestAddSection,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  templateId,
}: PreviewPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-40px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {controls.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                title={action.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <action.icon size={14} />
              </button>
            ))}
          </div>

          <ZoomControls
            zoomPercent={zoomPercent}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f5f6fa] px-3 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto flex w-full justify-center">
          <div className="w-fit transform-gpu origin-top transition-transform duration-200 ease-out">
            <div className={zoomClassName}>
              <CVCanvas
                sections={sections}
                selectedSectionId={selectedSectionId}
                onSelectSection={onSelectSection}
                onUpdateSectionData={onUpdateSectionData}
                onRequestAddSection={onRequestAddSection}
                onRemoveSection={onRemoveSection}
                onMoveSectionUp={onMoveSectionUp}
                onMoveSectionDown={onMoveSectionDown}
                templateId={templateId}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
