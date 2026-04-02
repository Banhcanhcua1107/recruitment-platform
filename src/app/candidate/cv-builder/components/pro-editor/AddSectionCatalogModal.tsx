"use client";

import type { CVSection, SectionType } from "../../types";
import { AddSectionModal } from "./AddSectionModal";
import type { ModalSectionCatalogItem } from "./template-schema";

interface AddSectionCatalogModalProps {
  isOpen: boolean;
  insertPosition: {
    sectionId: string;
    position: "above" | "below";
  } | null;
  selectedSectionType: SectionType | null;
  sections: CVSection[];
  onClose: () => void;
  onSelectSectionType: (type: SectionType | null) => void;
  onAddSection: (item: ModalSectionCatalogItem) => void;
}

// Compatibility wrapper to preserve previous component name.
export function AddSectionCatalogModal(props: AddSectionCatalogModalProps) {
  return <AddSectionModal {...props} />;
}
