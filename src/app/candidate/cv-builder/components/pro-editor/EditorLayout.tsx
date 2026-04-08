"use client";

import { useMemo, useState } from "react";
import { AddSectionModal } from "@/app/candidate/cv-builder/components/pro-editor/AddSectionModal";
import { CVCanvas } from "@/app/candidate/cv-builder/components/pro-editor/CVCanvas";
import { EditorTopbar } from "@/app/candidate/cv-builder/components/pro-editor/EditorTopbar";
import { RightEditPanel } from "@/app/candidate/cv-builder/components/pro-editor/RightEditPanel";
import { EDITOR_UI_TEXTS } from "@/app/candidate/cv-builder/components/pro-editor/editor-ui-texts.vi";
import type { ModalSectionCatalogItem } from "@/app/candidate/cv-builder/components/pro-editor/template-schema";
import { CV_TEMPLATE_LIBRARY_UI } from "@/components/cv/templates/templateCatalog";
import type { SectionType } from "../../types";
import { useCVStore } from "../../store";

export interface EditorLayoutProps {
  resumeTitle: string;
  saveStatus: "idle" | "saving" | "saved";
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onOpenOCR: () => void;
  onDownload: () => void;
}

export function EditorLayout({
  resumeTitle,
  saveStatus,
  isDirty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onOpenOCR,
  onDownload,
}: EditorLayoutProps) {
  const {
    cv,
    selectedSectionId,
    setSelectedSection,
    updateSection,
    updateSectionData,
    addSection,
    reorderSections,
    addListItem,
    removeListItem,
    setMeta,
    updateTheme,
  } = useCVStore();
  const [isOpen, setIsOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState<{
    sectionId: string;
    position: "above" | "below";
  } | null>(null);
  const [selectedSectionType, setSelectedSectionType] = useState<SectionType | null>(null);

  const sectionStats = useMemo(() => {
    const visible = cv.sections.filter((section) => section.isVisible).length;
    return {
      visible,
      total: cv.sections.length,
    };
  }, [cv.sections]);

  const openGeneralAddModal = () => {
    setInsertPosition(null);
    setSelectedSectionType(null);
    setIsOpen(true);
  };

  const openInsertModal = (sectionId: string, position: "above" | "below") => {
    setInsertPosition({ sectionId, position });
    setSelectedSectionType(null);
    setIsOpen(true);
  };

  const closeAddSectionModal = () => {
    setIsOpen(false);
    setInsertPosition(null);
    setSelectedSectionType(null);
  };

  const handleChangeTemplate = (templateId: string) => {
    const matchedTemplate = CV_TEMPLATE_LIBRARY_UI.find((template) => template.id === templateId);

    setMeta({ templateId });

    if (matchedTemplate) {
      updateTheme({
        colors: { ...matchedTemplate.templateStyles.colors },
        fonts: { ...matchedTemplate.templateStyles.fonts },
        spacing: matchedTemplate.templateStyles.spacing,
      });
    }
  };

  const handleAddSectionFromCatalog = (item: ModalSectionCatalogItem) => {
    setSelectedSectionType(item.type);

    const beforeIds = new Set(useCVStore.getState().cv.sections.map((section) => section.id));

    addSection(item.type);

    const afterAddState = useCVStore.getState();
    const newlyAddedSection = afterAddState.cv.sections.find((section) => !beforeIds.has(section.id));

    if (!newlyAddedSection) {
      closeAddSectionModal();
      return;
    }

    if (item.presetTitle) {
      updateSection(newlyAddedSection.id, { title: item.presetTitle });
    }

    if (item.presetData) {
      updateSectionData(newlyAddedSection.id, item.presetData);
    }

    if (insertPosition) {
      const latestSections = useCVStore.getState().cv.sections;
      const anchorIndex = latestSections.findIndex((section) => section.id === insertPosition.sectionId);
      const newSectionIndex = latestSections.findIndex((section) => section.id === newlyAddedSection.id);

      if (anchorIndex >= 0 && newSectionIndex >= 0) {
        const targetIndex = insertPosition.position === "above" ? anchorIndex : anchorIndex + 1;
        if (targetIndex !== newSectionIndex) {
          reorderSections(newSectionIndex, targetIndex);
        }
      }
    }

    setSelectedSection(newlyAddedSection.id);
    closeAddSectionModal();
  };

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col bg-transparent text-slate-900">
      <EditorTopbar
        resumeTitle={resumeTitle}
        saveStatus={saveStatus}
        isDirty={isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        activeTemplateId={cv.meta.templateId}
        onUndo={onUndo}
        onRedo={onRedo}
        onSave={onSave}
        onOpenOCR={onOpenOCR}
        onDownload={onDownload}
        onOpenAddSection={openGeneralAddModal}
        onChangeTemplate={handleChangeTemplate}
      />

      <div className="mx-auto grid w-full max-w-[1760px] flex-1 min-h-0 grid-cols-1 gap-6 px-4 pb-8 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <main className="min-h-0 overflow-auto rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] px-5 py-5 shadow-[var(--app-shadow-soft)] sm:px-6">
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-3.5 text-[12px] text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-slate-700">
              {EDITOR_UI_TEXTS.preview.badge}
            </span>
            <span>
              {sectionStats.visible}/{sectionStats.total} {EDITOR_UI_TEXTS.preview.visibleSuffix}
            </span>
            <span className="text-slate-500">{EDITOR_UI_TEXTS.preview.hint}</span>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-3 py-4 sm:px-5">
            <div className="pb-6">
              <CVCanvas
                sections={cv.sections}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSection}
                onUpdateSectionData={updateSectionData}
                onRequestAddSection={openInsertModal}
                templateId={cv.meta.templateId}
              />
            </div>
          </div>
        </main>

        <div className="min-h-0">
          <RightEditPanel
            sections={cv.sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSection}
            onToggleVisibility={(sectionId: string) => {
              const section = cv.sections.find((item) => item.id === sectionId);
              if (!section) {
                return;
              }
              updateSection(sectionId, { isVisible: !section.isVisible });
            }}
            onUpdateSectionData={updateSectionData}
            onAddListItem={addListItem}
            onRemoveListItem={removeListItem}
            onOpenAddSection={openGeneralAddModal}
          />
        </div>
      </div>

      <AddSectionModal
        isOpen={isOpen}
        insertPosition={insertPosition}
        selectedSectionType={selectedSectionType}
        sections={cv.sections}
        onClose={closeAddSectionModal}
        onSelectSectionType={setSelectedSectionType}
        onAddSection={handleAddSectionFromCatalog}
      />
    </div>
  );
}
