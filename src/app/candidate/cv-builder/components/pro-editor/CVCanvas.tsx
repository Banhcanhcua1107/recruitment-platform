"use client";

import type { CVSection } from "../../types";
import { CVPreviewCanvas } from "./CVPreviewCanvas";
import type { SectionRenderMode } from "./schema-driven-preview/SectionRenderer";

interface CVCanvasProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  onRemoveSection?: (sectionId: string) => void;
  onMoveSectionUp?: (sectionId: string) => void;
  onMoveSectionDown?: (sectionId: string) => void;
  templateId?: string;
  mode?: SectionRenderMode;
}

export function CVCanvas(props: CVCanvasProps) {
  return <CVPreviewCanvas {...props} />;
}
