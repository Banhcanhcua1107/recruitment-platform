"use client";

import { Fragment, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SectionShell } from "../SectionShell";
import { EditableList, EditableText } from "./inline-editors";
import { TEMPLATE_SECTION_COMPONENTS } from "./template-section-registry";
import {
  fromSharedSectionPayload,
  toSharedSectionPayload,
  validateSharedSectionPayload,
  type SharedGroupSectionNode,
  type SharedInfoSectionNode,
  type SharedListSectionNode,
  type SharedSectionNode,
  type SharedSectionPayload,
} from "./shared-section-schema";
import type { CVPreviewSection, CVResolvedSectionStyleConfig, CVTemplateConfig } from "./types";

export type SectionRenderMode = "edit" | "preview" | "export";

type NodePath = number[];

interface SectionRendererProps {
  section: CVPreviewSection;
  styleConfig: CVResolvedSectionStyleConfig;
  template: CVTemplateConfig;
  mode: SectionRenderMode;
  isActive: boolean;
  onEdit: (updates: Record<string, unknown>) => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

function updateNodeAtPath(
  nodes: SharedSectionNode[],
  path: NodePath,
  updater: (node: SharedSectionNode) => SharedSectionNode,
): SharedSectionNode[] {
  if (path.length === 0) {
    return nodes;
  }

  const [head, ...tail] = path;

  return nodes.map((node, index) => {
    if (index !== head) {
      return node;
    }

    if (tail.length === 0) {
      return updater(node);
    }

    if (node.sectionType !== "group") {
      return node;
    }

    return {
      ...node,
      sections: updateNodeAtPath(node.sections, tail, updater),
    };
  });
}

function createGeneratedNodeId(seed: string) {
  return `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneEmptyNodeFromTemplate(node: SharedSectionNode, seed: string): SharedSectionNode {
  if (node.sectionType === "info") {
    return {
      ...node,
      id: createGeneratedNodeId(`${seed}-info`),
      value: "",
    };
  }

  if (node.sectionType === "list") {
    return {
      ...node,
      id: createGeneratedNodeId(`${seed}-list`),
      items: [""],
    };
  }

  return {
    ...node,
    id: createGeneratedNodeId(`${seed}-group`),
    sections: node.sections.map((child, childIndex) =>
      cloneEmptyNodeFromTemplate(child, `${seed}-${childIndex + 1}`),
    ),
  };
}

function renderReadonlyParagraph(value: string, placeholder: string) {
  if (!value.trim()) {
    return <span className="text-[13px] italic text-slate-400">{placeholder}</span>;
  }

  return (
    <div className="space-y-1 text-[14px] leading-[1.65] text-slate-800">
      {value
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line, index) => (
          <p key={`line-${index}`}>{line}</p>
        ))}
    </div>
  );
}

function renderReadonlyList(items: string[], placeholder: string) {
  const normalized = items.map((item) => item.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return <span className="text-[13px] italic text-slate-400">{placeholder}</span>;
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-[13px] leading-[1.65] text-slate-800">
      {normalized.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export function SectionRenderer({
  section,
  styleConfig,
  template,
  mode,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: SectionRendererProps) {
  const TemplateSectionComponent = TEMPLATE_SECTION_COMPONENTS[section.type];

  const payload = useMemo(() => toSharedSectionPayload(section), [section]);
  const isValidPayload = validateSharedSectionPayload(payload);
  const canEdit = mode === "edit" && isActive;

  const commitPayload = useCallback(
    (nextPayload: SharedSectionPayload) => {
      if (!validateSharedSectionPayload(nextPayload)) {
        return;
      }

      onEdit(fromSharedSectionPayload(section, nextPayload));
    },
    [onEdit, section],
  );

  const updateNode = useCallback(
    (path: NodePath, updater: (node: SharedSectionNode) => SharedSectionNode) => {
      const nextPayload: SharedSectionPayload = {
        ...payload,
        sections: updateNodeAtPath(payload.sections, path, updater),
      };

      commitPayload(nextPayload);
    },
    [commitPayload, payload],
  );

  const repeatableRootGroupCount = useMemo(
    () => payload.sections.filter((node) => node.sectionType === "group" && node.repeatable).length,
    [payload.sections],
  );

  const addRootRepeatableGroupAfter = useCallback(
    (rootIndex: number, templateNode: SharedGroupSectionNode) => {
      if (rootIndex < 0 || rootIndex >= payload.sections.length) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[CVBuilder:SectionRenderer] Invalid rootIndex while adding repeatable group", {
            sectionId: section.id,
            rootIndex,
            sectionCount: payload.sections.length,
          });
        }
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[CVBuilder:SectionRenderer] Before add repeatable item", {
          sectionId: section.id,
          rootIndex,
          count: payload.sections.length,
        });
      }

      const nextNode = cloneEmptyNodeFromTemplate(templateNode, `${section.id}-repeatable`) as SharedGroupSectionNode;
      const nextSections = [...payload.sections];
      nextSections.splice(rootIndex + 1, 0, nextNode);

      if (process.env.NODE_ENV !== "production") {
        console.log("[CVBuilder:SectionRenderer] After add repeatable item", {
          sectionId: section.id,
          rootIndex,
          count: nextSections.length,
          insertedNodeId: nextNode.id,
        });
      }

      commitPayload({
        ...payload,
        sections: nextSections,
      });
    },
    [commitPayload, payload, section.id],
  );

  const removeRootRepeatableGroupAt = useCallback(
    (rootIndex: number) => {
      if (rootIndex < 0 || rootIndex >= payload.sections.length) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[CVBuilder:SectionRenderer] Invalid rootIndex while removing repeatable group", {
            sectionId: section.id,
            rootIndex,
            sectionCount: payload.sections.length,
          });
        }
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("[CVBuilder:SectionRenderer] Before remove repeatable item", {
          sectionId: section.id,
          rootIndex,
          count: payload.sections.length,
        });
      }

      const nextSections = payload.sections.filter((_, index) => index !== rootIndex);

      if (process.env.NODE_ENV !== "production") {
        console.log("[CVBuilder:SectionRenderer] After remove repeatable item", {
          sectionId: section.id,
          rootIndex,
          count: nextSections.length,
        });
      }

      commitPayload({
        ...payload,
        sections: nextSections,
      });
    },
    [commitPayload, payload, section.id],
  );

  const renderInfoNode = useCallback(
    (node: SharedInfoSectionNode, path: NodePath, depth: number) => {
      const placeholder = node.placeholder || `Nhập ${node.label.toLowerCase()}`;

      if (mode !== "edit") {
        return (
          <div className="space-y-1.5">
            {depth > 0 ? (
              <p className={cn("text-[12px] font-semibold uppercase tracking-[0.08em]", template.colorPalette.mutedTextClassName)}>
                {node.label}
              </p>
            ) : null}
            {renderReadonlyParagraph(node.value, placeholder)}
          </div>
        );
      }

      return (
        <div className="space-y-1.5">
          {depth > 0 ? (
            <p className={cn("text-[12px] font-semibold uppercase tracking-[0.08em]", template.colorPalette.mutedTextClassName)}>
              {node.label}
            </p>
          ) : null}
          <EditableText
            value={node.value}
            placeholder={placeholder}
            isSectionActive={canEdit}
            onCommit={(nextValue) => {
              updateNode(path, (currentNode) => {
                if (currentNode.sectionType !== "info") {
                  return currentNode;
                }

                return {
                  ...currentNode,
                  value: nextValue,
                };
              });
            }}
            multiline={node.multiline ?? true}
            minRows={node.multiline === false ? 1 : 3}
            showToolbar={node.multiline !== false}
          />
        </div>
      );
    },
    [canEdit, mode, template.colorPalette.mutedTextClassName, updateNode],
  );

  const renderListNode = useCallback(
    (node: SharedListSectionNode, path: NodePath, depth: number) => {
      const placeholder = node.placeholder || `Thêm ${node.label.toLowerCase()}`;

      if (mode !== "edit") {
        return (
          <div className="space-y-1.5">
            {depth > 0 ? (
              <p className={cn("text-[12px] font-semibold uppercase tracking-[0.08em]", template.colorPalette.mutedTextClassName)}>
                {node.label}
              </p>
            ) : null}
            {renderReadonlyList(node.items, placeholder)}
          </div>
        );
      }

      return (
        <div className="space-y-1.5">
          {depth > 0 ? (
            <p className={cn("text-[12px] font-semibold uppercase tracking-[0.08em]", template.colorPalette.mutedTextClassName)}>
              {node.label}
            </p>
          ) : null}
          <EditableList
            items={node.items}
            placeholder={placeholder}
            isSectionActive={canEdit}
            onCommit={(nextItems) => {
              updateNode(path, (currentNode) => {
                if (currentNode.sectionType !== "list") {
                  return currentNode;
                }

                return {
                  ...currentNode,
                  items: nextItems,
                };
              });
            }}
          />
        </div>
      );
    },
    [canEdit, mode, template.colorPalette.mutedTextClassName, updateNode],
  );

  const renderNode = (node: SharedSectionNode, path: NodePath, depth: number): JSX.Element => {
    if (node.sectionType === "info") {
      return renderInfoNode(node, path, depth);
    }

    if (node.sectionType === "list") {
      return renderListNode(node, path, depth);
    }

    const groupNode = node as SharedGroupSectionNode;
    const showContainer = depth > 0 || groupNode.repeatable;
    const hasChildNodes = groupNode.sections.length > 0;
    const isRootRepeatableGroup = depth === 0 && groupNode.repeatable;
    const canRemoveRootRepeatableGroup = isRootRepeatableGroup && repeatableRootGroupCount > 1;

    return (
      <div
        className={cn(
          showContainer && "rounded-md border px-3 py-2.5",
          showContainer && styleConfig.itemBorderClassName,
          showContainer && styleConfig.itemBackgroundClassName,
          "space-y-2.5",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-slate-900">{groupNode.label}</p>
          <div className="flex items-center gap-2">
            {groupNode.repeatable ? (
              <span className={cn("text-[11px] font-medium", template.colorPalette.mutedTextClassName)}>
                Repeated item
              </span>
            ) : null}

            {mode === "edit" && canEdit && isRootRepeatableGroup ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    addRootRepeatableGroupAfter(path[0], groupNode);
                  }}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  Thêm mục
                </button>

                <button
                  type="button"
                  disabled={!canRemoveRootRepeatableGroup}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!canRemoveRootRepeatableGroup) {
                      return;
                    }
                    removeRootRepeatableGroupAt(path[0]);
                  }}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Xóa mục
                </button>
              </>
            ) : null}
          </div>
        </div>

        {hasChildNodes ? (
          <div className="space-y-2.5">
            {groupNode.sections.map((child, index) => (
              <Fragment key={child.id}>{renderNode(child, [...path, index], depth + 1)}</Fragment>
            ))}
          </div>
        ) : (
          <p className={cn("text-[12px] italic", template.colorPalette.mutedTextClassName)}>
            Chưa có nội dung cho nhóm này.
          </p>
        )}
      </div>
    );
  };

  if (TemplateSectionComponent) {
    return (
      <TemplateSectionComponent
        data={section.data}
        mode={mode}
        onChange={(updates) => {
          onEdit(updates as Record<string, unknown>);
        }}
        styleConfig={styleConfig}
        isActive={isActive}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />
    );
  }

  if (!isValidPayload) {
    return null;
  }

  return (
    <SectionShell
      styleConfig={styleConfig}
      isActive={mode === "edit" ? isActive : false}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
      showAddButtons={mode === "edit"}
      disableInteractions={mode !== "edit"}
    >
      <div className="space-y-2.5 text-[14px] leading-6 text-slate-800">
        {payload.sections.map((node, index) => (
          <Fragment key={node.id}>{renderNode(node, [index], 0)}</Fragment>
        ))}
      </div>
    </SectionShell>
  );
}
