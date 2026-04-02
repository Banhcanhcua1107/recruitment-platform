"use client";

import type { CVSection } from "../../types";
import { CVPreviewCanvas } from "./CVPreviewCanvas";

interface CVCanvasProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  templateId?: string;
}

export function CVCanvas(props: CVCanvasProps) {
  return <CVPreviewCanvas {...props} />;
}
