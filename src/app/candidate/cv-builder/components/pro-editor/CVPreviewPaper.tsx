"use client";

import type { CVSection } from "../../types";
import { CVPreviewCanvas } from "./CVPreviewCanvas";

interface CVPreviewPaperProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  templateId?: string;
}

// Compatibility wrapper to keep existing imports stable while new layout uses CVPreviewCanvas.
export function CVPreviewPaper(props: CVPreviewPaperProps) {
  return <CVPreviewCanvas {...props} />;
}
