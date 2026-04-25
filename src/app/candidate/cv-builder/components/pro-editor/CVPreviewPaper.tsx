"use client";

import type { CVSection, CVSelectedSectionItem } from "../../types";
import { CVPreviewCanvas } from "./CVPreviewCanvas";
import type { SectionRenderMode } from "./schema-driven-preview/SectionRenderer";

interface CVPreviewPaperProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onSelectSectionItem?: (selection: CVSelectedSectionItem | null) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  onRemoveSection?: (sectionId: string) => void;
  onMoveSectionUp?: (sectionId: string) => void;
  onMoveSectionDown?: (sectionId: string) => void;
  templateId?: string;
  mode?: SectionRenderMode;
}

// Compatibility wrapper to keep existing imports stable while new layout uses CVPreviewCanvas.
export function CVPreviewPaper(props: CVPreviewPaperProps) {
  return <CVPreviewCanvas {...props} />;
}
