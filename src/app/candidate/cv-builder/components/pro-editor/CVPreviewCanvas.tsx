"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CVSection } from "../../types";
import { CVHeader } from "./CVHeader";
import { CVPaper } from "./CVPaper";
import { CVSectionRenderer } from "./CVSectionRenderer";
import { mapBuilderSectionsToPreviewData, orderPreviewSections } from "./schema-driven-preview/adapters";
import { resolveSectionStyleConfig } from "./schema-driven-preview/section-renderers";
import type { CVPreviewSection } from "./schema-driven-preview/types";
import { getTemplateConfig } from "@/app/candidate/cv-builder/components/pro-editor/schema-driven-preview/template-config";

const A4_HEIGHT_PX = 1122;
const PAGE_FOOTER_RESERVE_PX = 44;
const HEADER_SECTION_GAP_PX = 20;
const SINGLE_PAGE_ZOOM_DEFAULT_CLASS = "[zoom:1]";
const MIN_READABLE_SINGLE_PAGE_ZOOM = 0.9;

function resolveSinglePageZoomClass(zoomValue: number) {
  if (zoomValue >= 0.985) {
    return "[zoom:1]";
  }

  if (zoomValue >= 0.96) {
    return "[zoom:0.96]";
  }

  if (zoomValue >= 0.94) {
    return "[zoom:0.94]";
  }

  if (zoomValue >= 0.92) {
    return "[zoom:0.92]";
  }

  return "[zoom:0.9]";
}

interface RenderSectionBlock {
  id: string;
  section: CVPreviewSection;
  height: number;
}

interface PreviewPage {
  includeHeader: boolean;
  blocks: RenderSectionBlock[];
}

function arePagesEqual(left: PreviewPage[], right: PreviewPage[]) {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i].includeHeader !== right[i].includeHeader) {
      return false;
    }

    if (left[i].blocks.length !== right[i].blocks.length) {
      return false;
    }

    for (let j = 0; j < left[i].blocks.length; j += 1) {
      if (left[i].blocks[j].id !== right[i].blocks[j].id) {
        return false;
      }
    }
  }

  return true;
}

function getSectionItems(section: CVPreviewSection): unknown[] | null {
  const maybeItems = (section.data as { items?: unknown }).items;
  return Array.isArray(maybeItems) ? maybeItems : null;
}

function cloneSectionWithItems(section: CVPreviewSection, items: unknown[], chunkIndex: number): CVPreviewSection {
  const sectionData = section.data as unknown as Record<string, unknown>;

  return {
    ...section,
    id: `${section.id}__chunk_${chunkIndex + 1}`,
    data: {
      ...sectionData,
      items,
    } as CVPreviewSection["data"],
  };
}

function findListRootForItems(contentElement: HTMLElement, expectedItemCount: number) {
  const firstChild = contentElement.firstElementChild;
  if (!(firstChild instanceof HTMLElement)) {
    return null;
  }

  const queue: HTMLElement[] = [firstChild];
  const visited = new Set<HTMLElement>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const children = Array.from(current.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );

    if (children.length === expectedItemCount) {
      return current;
    }

    children.forEach((child) => {
      if (child.children.length > 0) {
        queue.push(child);
      }
    });
  }

  return null;
}

function measureListItemLayout(sectionNode: HTMLDivElement | null, expectedItemCount: number) {
  if (!sectionNode || expectedItemCount <= 0) {
    return null;
  }

  const contentElement = sectionNode.querySelector<HTMLElement>("[data-cv-section-content]");
  if (!contentElement) {
    return null;
  }

  const listRoot = findListRootForItems(contentElement, expectedItemCount);
  if (!listRoot) {
    return null;
  }

  const itemElements = Array.from(listRoot.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  if (itemElements.length !== expectedItemCount) {
    return null;
  }

  const itemHeights = itemElements.map((element) => Math.max(1, element.offsetHeight));

  let totalGap = 0;
  for (let index = 0; index < itemElements.length - 1; index += 1) {
    const current = itemElements[index];
    const next = itemElements[index + 1];
    const gap = next.offsetTop - current.offsetTop - current.offsetHeight;
    totalGap += Math.max(0, gap);
  }

  return {
    itemHeights,
    totalGap,
  };
}

function measureSectionGap(container: HTMLDivElement | null) {
  if (!container) {
    return 0;
  }

  const sectionNodes = Array.from(container.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  if (sectionNodes.length < 2) {
    return 0;
  }

  const firstSection = sectionNodes[0];
  const secondSection = sectionNodes[1];
  const gap = secondSection.offsetTop - firstSection.offsetTop - firstSection.offsetHeight;

  return Math.max(0, gap);
}

function buildSectionBlocks(input: {
  section: CVPreviewSection;
  sectionHeight: number;
  sectionNode: HTMLDivElement | null;
  maxPageContentHeight: number;
}): RenderSectionBlock[] {
  const { section, sectionHeight, sectionNode, maxPageContentHeight } = input;
  const sectionItems = getSectionItems(section);

  if (!sectionItems || sectionItems.length <= 1 || !sectionNode) {
    return [
      {
        id: section.id,
        section,
        height: sectionHeight,
      },
    ];
  }

  const listLayout = measureListItemLayout(sectionNode, sectionItems.length);
  if (!listLayout) {
    return [
      {
        id: section.id,
        section,
        height: sectionHeight,
      },
    ];
  }

  const sumItemHeights = listLayout.itemHeights.reduce((total, height) => total + height, 0);
  const itemGap = sectionItems.length > 1 ? listLayout.totalGap / (sectionItems.length - 1) : 0;
  const sectionBaseHeight = Math.max(0, sectionHeight - sumItemHeights - listLayout.totalGap);

  const blocks: RenderSectionBlock[] = [];
  let currentItems: unknown[] = [];
  let currentItemHeights: number[] = [];

  const pushChunk = () => {
    if (currentItems.length === 0) {
      return;
    }

    const chunkItemTotal = currentItemHeights.reduce((total, height) => total + height, 0);
    const chunkGapTotal = currentItems.length > 1 ? itemGap * (currentItems.length - 1) : 0;
    const chunkHeight = sectionBaseHeight + chunkItemTotal + chunkGapTotal;

    blocks.push({
      id: `${section.id}__chunk_${blocks.length + 1}`,
      section: cloneSectionWithItems(section, currentItems, blocks.length),
      height: chunkHeight,
    });

    currentItems = [];
    currentItemHeights = [];
  };

  sectionItems.forEach((item, itemIndex) => {
    const nextItemHeight = listLayout.itemHeights[itemIndex] ?? 1;

    const currentItemsHeight = currentItemHeights.reduce((total, height) => total + height, 0);
    const currentGaps = currentItems.length > 0 ? itemGap * (currentItems.length - 1) : 0;
    const projectedGap = currentItems.length > 0 ? itemGap : 0;

    const projectedHeight =
      sectionBaseHeight + currentItemsHeight + currentGaps + projectedGap + nextItemHeight;

    if (currentItems.length > 0 && projectedHeight > maxPageContentHeight) {
      pushChunk();
    }

    currentItems.push(item);
    currentItemHeights.push(nextItemHeight);
  });

  pushChunk();

  if (blocks.length === 0) {
    return [
      {
        id: section.id,
        section,
        height: sectionHeight,
      },
    ];
  }

  return blocks;
}

interface CVPreviewCanvasProps {
  sections: CVSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onUpdateSectionData: (sectionId: string, updates: Record<string, unknown>) => void;
  onRequestAddSection?: (sectionId: string, position: "above" | "below") => void;
  templateId?: string;
}

export function CVPreviewCanvas({
  sections,
  selectedSectionId,
  onSelectSection,
  onUpdateSectionData,
  onRequestAddSection,
  templateId,
}: CVPreviewCanvasProps) {
  const template = useMemo(() => getTemplateConfig(templateId), [templateId]);
  const forceSinglePage = template.id === "teal-timeline";
  const previewData = useMemo(() => mapBuilderSectionsToPreviewData(sections), [sections]);
  const orderedSections = useMemo(
    () => orderPreviewSections(previewData.sections, template.sectionOrder),
    [previewData.sections, template.sectionOrder],
  );

  const measurePaperRef = useRef<HTMLDivElement | null>(null);
  const measureHeaderRef = useRef<HTMLDivElement | null>(null);
  const measureSectionsContainerRef = useRef<HTMLDivElement | null>(null);
  const measureSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paginatedPages, setPaginatedPages] = useState<PreviewPage[]>([]);
  const [singlePageZoomClassName, setSinglePageZoomClassName] = useState(SINGLE_PAGE_ZOOM_DEFAULT_CLASS);
  const [tealPaginateForReadability, setTealPaginateForReadability] = useState(false);

  const headerSection = sections.find((section) => section.type === "header");
  const personalInfoSection = sections.find((section) => section.type === "personal_info");
  const hasHeader = Boolean(headerSection || personalInfoSection);
  const headerSelected = selectedSectionId === headerSection?.id || selectedSectionId === personalInfoSection?.id;

  const selectHeader = () => {
    if (headerSection) {
      onSelectSection(headerSection.id);
      return;
    }

    if (personalInfoSection) {
      onSelectSection(personalInfoSection.id);
    }
  };

  useLayoutEffect(() => {
    const recalculatePages = () => {
      const paperElement = measurePaperRef.current;

      const fallbackBlocks: RenderSectionBlock[] = orderedSections.map((section, index) => ({
        id: `${section.id}__fallback_${index + 1}`,
        section,
        height: 1,
      }));

      if (!paperElement) {
        const fallbackPages: PreviewPage[] = [
          {
            includeHeader: hasHeader,
            blocks: fallbackBlocks,
          },
        ];

        setPaginatedPages((previousPages) =>
          arePagesEqual(previousPages, fallbackPages) ? previousPages : fallbackPages,
        );
        return;
      }

      const paperStyles = window.getComputedStyle(paperElement);
      const paddingTop = Number.parseFloat(paperStyles.paddingTop || "0") || 0;
      const paddingBottom = Number.parseFloat(paperStyles.paddingBottom || "0") || 0;
      const borderTop = Number.parseFloat(paperStyles.borderTopWidth || "0") || 0;
      const borderBottom = Number.parseFloat(paperStyles.borderBottomWidth || "0") || 0;

      const footerReservePx = forceSinglePage ? 8 : PAGE_FOOTER_RESERVE_PX;
      const maxPageContentHeight = Math.max(
        280,
        A4_HEIGHT_PX - paddingTop - paddingBottom - borderTop - borderBottom - footerReservePx,
      );

      const headerHeight = hasHeader ? Math.max(1, measureHeaderRef.current?.offsetHeight ?? 0) : 0;
      const sectionGap = measureSectionGap(measureSectionsContainerRef.current);

      const blocks = orderedSections.flatMap((section) => {
        const sectionNode = measureSectionRefs.current[section.id];
        const sectionHeight = Math.max(1, sectionNode?.offsetHeight ?? 1);

        if (forceSinglePage) {
          return [
            {
              id: section.id,
              section,
              height: sectionHeight,
            },
          ];
        }

        return buildSectionBlocks({
          section,
          sectionHeight,
          sectionNode,
          maxPageContentHeight,
        });
      });

      if (forceSinglePage) {
        const totalBlocksHeight = blocks.reduce(
          (total, block, blockIndex) => total + block.height + (blockIndex > 0 ? sectionGap : 0),
          0,
        );
        const totalContentHeight = totalBlocksHeight + (hasHeader ? headerHeight + HEADER_SECTION_GAP_PX : 0);

        const nextZoom = totalContentHeight > maxPageContentHeight
          ? Math.max(0.72, maxPageContentHeight / totalContentHeight)
          : 1;

        if (nextZoom >= MIN_READABLE_SINGLE_PAGE_ZOOM) {
          setTealPaginateForReadability(false);

          const nextZoomClassName = resolveSinglePageZoomClass(nextZoom);
          setSinglePageZoomClassName((previousClassName) =>
            previousClassName === nextZoomClassName ? previousClassName : nextZoomClassName,
          );

          const singlePage: PreviewPage[] = [
            {
              includeHeader: hasHeader,
              blocks,
            },
          ];

          setPaginatedPages((previousPages) =>
            arePagesEqual(previousPages, singlePage) ? previousPages : singlePage,
          );
          return;
        }

        setTealPaginateForReadability(true);
        setSinglePageZoomClassName((previousClassName) =>
          previousClassName === SINGLE_PAGE_ZOOM_DEFAULT_CLASS
            ? previousClassName
            : SINGLE_PAGE_ZOOM_DEFAULT_CLASS,
        );
      }

      setSinglePageZoomClassName((previousClassName) =>
        previousClassName === SINGLE_PAGE_ZOOM_DEFAULT_CLASS
          ? previousClassName
          : SINGLE_PAGE_ZOOM_DEFAULT_CLASS,
      );

      const computedPages: PreviewPage[] = [];
      let currentPage: PreviewPage = {
        includeHeader: hasHeader,
        blocks: [],
      };
      let remainingHeight =
        maxPageContentHeight - (hasHeader ? headerHeight + HEADER_SECTION_GAP_PX : 0);
      remainingHeight = Math.max(80, remainingHeight);

      for (const block of blocks) {
        const requiredHeight = block.height + (currentPage.blocks.length > 0 ? sectionGap : 0);

        if (currentPage.blocks.length > 0 && requiredHeight > remainingHeight) {
          computedPages.push(currentPage);
          currentPage = {
            includeHeader: false,
            blocks: [],
          };
          remainingHeight = maxPageContentHeight;
        }

        currentPage.blocks.push(block);
        remainingHeight -= requiredHeight;
      }

      if (currentPage.blocks.length > 0 || currentPage.includeHeader || computedPages.length === 0) {
        computedPages.push(currentPage);
      }

      setPaginatedPages((previousPages) =>
        arePagesEqual(previousPages, computedPages) ? previousPages : computedPages,
      );
    };

    recalculatePages();

    window.addEventListener("resize", recalculatePages);
    return () => {
      window.removeEventListener("resize", recalculatePages);
    };
  }, [forceSinglePage, hasHeader, orderedSections, sections, template]);

  const handleHeaderEdit = (field: "fullName" | "headline", value: string) => {
    if (!headerSection) {
      return;
    }

    if (field === "headline") {
      onUpdateSectionData(headerSection.id, { title: value });
      return;
    }

    onUpdateSectionData(headerSection.id, { fullName: value });
  };

  const handleContactEdit = (field: "phone" | "email" | "dob" | "address", value: string) => {
    if (!personalInfoSection) {
      return;
    }

    onUpdateSectionData(personalInfoSection.id, { [field]: value });
  };

  const pages =
    paginatedPages.length > 0
      ? paginatedPages
      : [
          {
            includeHeader: hasHeader,
            blocks: orderedSections.map((section, index) => ({
              id: `${section.id}__initial_${index + 1}`,
              section,
              height: 1,
            })),
          },
        ];

  const shouldUseSinglePageMode = forceSinglePage && !tealPaginateForReadability;
  const totalPages = pages.length;
  const pageListClassName = shouldUseSinglePageMode ? "space-y-0" : "space-y-6";
  const measurePaperClassName = "mx-auto h-280.5 w-198.5 max-w-full overflow-hidden";

  return (
    <>
      <div className={pageListClassName}>
        {pages.map((page, pageIndex) => (
          <div
            key={`cv-page-${pageIndex + 1}`}
            className="print:break-after-page last:print:break-after-auto"
          >
            <CVPaper template={template}>
              <div className="flex h-full flex-col">
                <div
                  className={cn(
                    "flex-1 origin-top-left",
                    shouldUseSinglePageMode ? singlePageZoomClassName : SINGLE_PAGE_ZOOM_DEFAULT_CLASS,
                  )}
                >
                  {page.includeHeader ? (
                    <CVHeader
                      template={template}
                      header={previewData.header}
                      contact={previewData.contact}
                      selected={headerSelected}
                      onSelect={selectHeader}
                      onEditHeader={handleHeaderEdit}
                      onEditContact={handleContactEdit}
                    />
                  ) : null}

                  {page.blocks.length > 0 ? (
                    <div
                      className={cn(
                        page.includeHeader ? "mt-5" : "",
                        template.spacingRules.sectionGapClassName,
                      )}
                    >
                      {page.blocks.map((block) => {
                        const blockSection = block.section;
                        const isActive = selectedSectionId === blockSection.sourceSectionId;
                        const styleConfig = resolveSectionStyleConfig(
                          template,
                          blockSection.type,
                          blockSection.title,
                        );

                        return (
                          <div
                            key={block.id}
                            className="break-inside-avoid-page print:break-inside-avoid-page"
                          >
                            <CVSectionRenderer
                              section={blockSection}
                              styleConfig={styleConfig}
                              template={template}
                              isActive={isActive}
                              onSelectSection={onSelectSection}
                              onUpdateSectionData={onUpdateSectionData}
                              onRequestAddSection={onRequestAddSection}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {!shouldUseSinglePageMode ? (
                  <footer className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] font-semibold text-slate-500">
                    <span className="tracking-[0.14em]">TalentFlow</span>
                    <span className="font-medium tracking-normal">
                      Trang {pageIndex + 1} / {totalPages}
                    </span>
                  </footer>
                ) : null}
              </div>
            </CVPaper>
          </div>
        ))}
      </div>

      <div aria-hidden className="pointer-events-none invisible absolute left-0 top-0 -z-10 opacity-0">
        <div
          ref={measurePaperRef}
          className={cn(
            measurePaperClassName,
            template.pageSettings.paperFrameClassName,
            template.pageSettings.paperPatternClassName,
            template.pageSettings.paperPaddingClassName,
            template.typographySettings.bodyFontClassName,
            template.typographySettings.bodyTextClassName,
            template.colorPalette.pageTextClassName,
          )}
        >
          {hasHeader ? (
            <div ref={measureHeaderRef}>
              <CVHeader
                template={template}
                header={previewData.header}
                contact={previewData.contact}
                selected={false}
                onSelect={() => undefined}
                onEditHeader={() => undefined}
                onEditContact={() => undefined}
              />
            </div>
          ) : null}

          <div
            ref={measureSectionsContainerRef}
            className={cn(hasHeader ? "mt-5" : "", template.spacingRules.sectionGapClassName)}
          >
            {orderedSections.map((section) => {
              const styleConfig = resolveSectionStyleConfig(template, section.type, section.title);

              return (
                <div
                  key={`measure-${section.id}`}
                  ref={(node) => {
                    measureSectionRefs.current[section.id] = node;
                  }}
                >
                  <CVSectionRenderer
                    section={section}
                    styleConfig={styleConfig}
                    template={template}
                    isActive={false}
                    onSelectSection={() => undefined}
                    onUpdateSectionData={() => undefined}
                    onRequestAddSection={undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
