"use client";

import { useState } from "react";
import { AddSectionModal } from "@/app/candidate/cv-builder/components/pro-editor/AddSectionModal";
import { EditorTopbar } from "@/app/candidate/cv-builder/components/pro-editor/EditorTopbar";
import {
  PreviewPanel,
  type PreviewToolbarAction,
} from "@/app/candidate/cv-builder/components/pro-editor/PreviewPanel";
import { EditorRightPanel } from "@/app/candidate/cv-builder/components/pro-editor/EditorRightPanel";
import { JsonDebugPanel } from "@/app/candidate/cv-builder/components/pro-editor/JsonDebugPanel";
import type { ModalSectionCatalogItem } from "@/app/candidate/cv-builder/components/pro-editor/template-schema";
import { CV_TEMPLATE_LIBRARY_UI } from "@/components/cv/templates/templateCatalog";
import type { CVThemePatternId, SectionType } from "../../types";
import { useCVStore } from "../../store";

const PREVIEW_ZOOM_STEPS = [
  { className: "scale-75", percent: 75 },
  { className: "scale-90", percent: 90 },
  { className: "scale-100", percent: 100 },
  { className: "scale-110", percent: 110 },
  { className: "scale-125", percent: 125 },
] as const;

const FONT_CHOICES = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Ubuntu",
  "Amiri",
  "Cairo",
  "Manrope",
  "'Manrope', sans-serif",
  "'IBM Plex Sans', sans-serif",
  "'Plus Jakarta Sans', sans-serif",
  "'Lora', serif",
  "'Source Sans 3', sans-serif",
] as const;

const FONT_SIZE_BY_MODE = {
  small: 3.7,
  medium: 4,
  large: 4.4,
} as const;

type FontSizeMode = keyof typeof FONT_SIZE_BY_MODE;

function resolveFontSizeMode(spacing: number): FontSizeMode {
  if (spacing <= 3.85) {
    return "small";
  }

  if (spacing >= 4.2) {
    return "large";
  }

  return "medium";
}

export interface EditorLayoutProps {
  resumeTitle: string;
  saveStatus: "idle" | "saving" | "saved";
  isDirty: boolean;
  isDownloading?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onRenameResume: (title: string) => void;
  onOpenOCR: () => void;
  onDownload: () => void;
}

export function EditorLayout({
  resumeTitle,
  saveStatus,
  isDirty,
  isDownloading = false,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onRenameResume,
  onOpenOCR,
  onDownload,
}: EditorLayoutProps) {
  const {
    cv,
    selectedSectionId,
    selectedSectionItem,
    setSelectedSection,
    setSelectedSectionItem,
    updateSection,
    updateSectionData,
    addSection,
    addListItem,
    reorderSections,
    removeListItem,
    removeSection,
    moveSectionUp,
    moveSectionDown,
    setMeta,
    updateTheme,
  } = useCVStore();
  const [isOpen, setIsOpen] = useState(false);
  const [zoomStepIndex, setZoomStepIndex] = useState(2);
  const [insertPosition, setInsertPosition] = useState<{
    sectionId: string;
    position: "above" | "below";
  } | null>(null);
  const [selectedSectionType, setSelectedSectionType] = useState<SectionType | null>(null);

  const activeTemplateId = cv.meta.templateId ?? CV_TEMPLATE_LIBRARY_UI[0]?.id;
  const activeFontFamily = String(cv.theme.fonts.body || FONT_CHOICES[0]);
  const fontSizeMode = resolveFontSizeMode(Number(cv.theme.spacing || FONT_SIZE_BY_MODE.medium));
  const activePrimaryColor = String(cv.theme.colors.primary || "#0f766e");
  const activePatternColor = String(cv.theme.colors.pattern || cv.theme.colors.primary || "#94a3b8");
  const activePatternId = (cv.theme.appearance?.patternId ?? "dots") as CVThemePatternId;
  const syncPatternWithPrimary = cv.theme.appearance?.syncPatternWithPrimary ?? true;

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
      const preservedPrimary = String(cv.theme.colors.primary || matchedTemplate.templateStyles.colors.primary);
      const preservedPattern = String(
        cv.theme.colors.pattern
        || matchedTemplate.templateStyles.colors.secondary
        || matchedTemplate.templateStyles.colors.primary,
      );

      updateTheme({
        colors: {
          ...matchedTemplate.templateStyles.colors,
          primary: preservedPrimary,
          pattern: preservedPattern,
        },
        fonts: { ...matchedTemplate.templateStyles.fonts },
        spacing: matchedTemplate.templateStyles.spacing,
        appearance: {
          patternId: cv.theme.appearance?.patternId ?? "dots",
          syncPatternWithPrimary: cv.theme.appearance?.syncPatternWithPrimary ?? true,
        },
      });
    }
  };

  const handleSelectFontFamily = (fontFamily: string) => {
    updateTheme({
      fonts: {
        ...cv.theme.fonts,
        body: fontFamily,
        heading: fontFamily,
      },
    });
  };

  const handleSelectFontSizeMode = (mode: FontSizeMode) => {
    updateTheme({
      spacing: FONT_SIZE_BY_MODE[mode],
    });
  };

  const handleSelectPrimaryColor = (primaryColor: string) => {
    updateTheme({
      colors: {
        ...cv.theme.colors,
        primary: primaryColor,
      },
    });
  };

  const handleSelectPatternId = (patternId: CVThemePatternId) => {
    updateTheme({
      appearance: {
        ...cv.theme.appearance,
        patternId,
      },
    });
  };

  const handleTogglePatternSync = (nextValue: boolean) => {
    updateTheme({
      appearance: {
        ...cv.theme.appearance,
        syncPatternWithPrimary: nextValue,
      },
    });
  };

  const handleSelectPatternColor = (patternColor: string) => {
    updateTheme({
      colors: {
        ...cv.theme.colors,
        pattern: patternColor,
      },
      appearance: {
        ...cv.theme.appearance,
        syncPatternWithPrimary: false,
      },
    });
  };

  const canZoomOut = zoomStepIndex > 0;
  const canZoomIn = zoomStepIndex < PREVIEW_ZOOM_STEPS.length - 1;

  const previewToolbarActions: PreviewToolbarAction[] = [];

  const handleSelectSectionFromOutline = (sectionId: string | null) => {
    setSelectedSection(sectionId);
    setSelectedSectionItem(null);
  };

  const handleToggleSectionVisibility = (sectionId: string) => {
    const section = useCVStore.getState().cv.sections.find((entry) => entry.id === sectionId);
    if (!section) {
      return;
    }

    updateSection(sectionId, {
      isVisible: !section.isVisible,
    });
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f5f6fa] text-slate-900">
      <EditorTopbar
        resumeTitle={resumeTitle}
        saveStatus={saveStatus}
        isDirty={isDirty}
        isDownloading={isDownloading}
        canUndo={canUndo}
        canRedo={canRedo}
        activeTemplateId={activeTemplateId}
        fontFamily={activeFontFamily}
        fontOptions={[...FONT_CHOICES]}
        fontSizeMode={fontSizeMode}
        primaryColor={activePrimaryColor}
        patternColor={activePatternColor}
        patternId={activePatternId}
        syncPatternWithPrimary={syncPatternWithPrimary}
        onUndo={onUndo}
        onRedo={onRedo}
        onSave={onSave}
        onRenameResume={onRenameResume}
        onOpenOCR={onOpenOCR}
        onDownload={onDownload}
        onOpenAddSection={openGeneralAddModal}
        onChangeTemplate={handleChangeTemplate}
        onChangeFontFamily={handleSelectFontFamily}
        onChangeFontSizeMode={handleSelectFontSizeMode}
        onChangePrimaryColor={handleSelectPrimaryColor}
        onChangePatternColor={handleSelectPatternColor}
        onChangePatternId={handleSelectPatternId}
        onTogglePatternSync={handleTogglePatternSync}
      />

      <div className="grid w-full min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-3 pb-6 pt-4 sm:px-4 lg:grid-cols-[minmax(0,62%)_minmax(0,38%)] lg:gap-3 lg:px-5">
        <div className="h-full min-h-0 overflow-hidden">
          <div className="h-full min-h-0 overflow-hidden">
            <PreviewPanel
              controls={previewToolbarActions}
              zoomPercent={PREVIEW_ZOOM_STEPS[zoomStepIndex].percent}
              canZoomIn={canZoomIn}
              canZoomOut={canZoomOut}
              zoomClassName={PREVIEW_ZOOM_STEPS[zoomStepIndex].className}
              onZoomIn={() => {
                setZoomStepIndex((current) =>
                  current >= PREVIEW_ZOOM_STEPS.length - 1 ? current : current + 1,
                );
              }}
              onZoomOut={() => {
                setZoomStepIndex((current) => (current <= 0 ? current : current - 1));
              }}
              sections={cv.sections}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSection}
              onSelectSectionItem={setSelectedSectionItem}
              onUpdateSectionData={updateSectionData}
              onRequestAddSection={openInsertModal}
              onRemoveSection={removeSection}
              onMoveSectionUp={moveSectionUp}
              onMoveSectionDown={moveSectionDown}
              templateId={activeTemplateId}
            />
          </div>
        </div>

        <div className="h-full min-h-0 overflow-hidden">
          <EditorRightPanel
            sections={cv.sections}
            selectedSectionId={selectedSectionId}
            selectedSectionItem={selectedSectionItem}
            onSelectSection={handleSelectSectionFromOutline}
            onToggleVisibility={handleToggleSectionVisibility}
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

      <JsonDebugPanel />
    </div>
  );
}
