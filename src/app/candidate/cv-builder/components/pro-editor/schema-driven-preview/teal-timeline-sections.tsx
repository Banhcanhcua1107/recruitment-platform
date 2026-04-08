"use client";

import { useEffect, useState } from "react";
import {
  AlignLeft,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  FolderKanban,
  GraduationCap,
  Languages,
  Plus,
  Sparkles,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AddSectionButtons } from "@/app/candidate/cv-builder/components/pro-editor/AddSectionButtons";
import { cn } from "@/lib/utils";
import { EditableText } from "./inline-editors";
import type {
  ActivitiesSectionData,
  CVSectionComponentProps,
  CVTemplateIconToken,
  ExperienceSectionData,
  SummarySectionData,
} from "./types";

const ICON_MAP: Record<CVTemplateIconToken, LucideIcon> = {
  summary: AlignLeft,
  target: Target,
  experience: BriefcaseBusiness,
  education: GraduationCap,
  skills: Sparkles,
  languages: Languages,
  projects: FolderKanban,
  certificates: BadgeCheck,
  awards: Award,
  activities: CalendarDays,
  custom: FileText,
};

interface TealOverviewItemData {
  id: string;
  content: string;
}

interface TealWorkExperienceItemData {
  id: string;
  leftDate: string;
  rightTitle: string;
  rightSubtitle: string;
  rightDescription: string;
}

interface TealActivityItemData {
  id: string;
  leftDate: string;
  rightTitle: string;
  rightSubtitle: string;
}

interface SectionHeaderProps {
  title: string;
  icon: CVTemplateIconToken;
  isSectionActive: boolean;
  onChangeTitle: (nextTitle: string) => void;
}

function toSafeText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function isOverviewBulletLine(value: string) {
  const line = value.trim();

  if (!line) {
    return false;
  }

  return /^[-*\u2022\u2013\u2014]\s+/.test(line)
    || /^[-*\u2022\u2013\u2014]+\S/.test(line)
    || /^[-*\u2022\u2013\u2014]{2,}$/.test(line);
}

function getOverviewSourceLines(data: SummarySectionData) {
  const linesFromText = stripHtml(data.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (linesFromText.length > 0) {
    return linesFromText;
  }

  if (!Array.isArray(data.items)) {
    return [];
  }

  return data.items
    .map((item) => toSafeText(item.content))
    .flatMap((content) => stripHtml(content).split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeOverviewItems(data: SummarySectionData) {
  const sourceLines = getOverviewSourceLines(data);

  if (sourceLines.length > 0) {
    const introLines = sourceLines.slice(0, 4);
    const trailingLines = sourceLines.slice(4);

    if (trailingLines.length > 0 && trailingLines.every((line) => isOverviewBulletLine(line))) {
      return [...introLines, trailingLines.join("\n")].map((content, index) => ({
        id: `ov-text-${index + 1}`,
        content,
      }));
    }

    const groupedLines: string[] = [];
    let bulletBuffer: string[] = [];

    const flushBulletBuffer = () => {
      if (bulletBuffer.length === 0) {
        return;
      }

      groupedLines.push(bulletBuffer.join("\n"));
      bulletBuffer = [];
    };

    sourceLines.forEach((line, lineIndex) => {
      if (lineIndex >= 4 && isOverviewBulletLine(line)) {
        bulletBuffer.push(line);
        return;
      }

      flushBulletBuffer();
      groupedLines.push(line);
    });

    flushBulletBuffer();

    return groupedLines.map((content, index) => ({
      id: `ov-text-${index + 1}`,
      content,
    }));
  }

  return [{ id: "ov-1", content: "" }];
}

function splitDateRange(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/\s*[–-]\s*/);

  if (parts.length >= 2) {
    return {
      startDate: parts[0]?.trim() || "",
      endDate: parts.slice(1).join(" - ").trim() || "Present",
    };
  }

  return {
    startDate: normalized,
    endDate: "Present",
  };
}

function buildDateRangeLabel(startDate: string, endDate: string) {
  if (!startDate) {
    return "";
  }

  if (!endDate) {
    return startDate;
  }

  return `${startDate} – ${endDate}`;
}

function normalizeWorkExperienceItems(data: ExperienceSectionData): TealWorkExperienceItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "we-1",
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
        rightDescription: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;
    const leftDateFromData = toSafeText(record.leftDate);
    const startDate = toSafeText(record.startDate);
    const endDate = toSafeText(record.endDate);
    const isCurrent = record.isCurrent === true;
    const resolvedEndDate = endDate || (isCurrent ? "Present" : "");
    const computedDate = startDate
      ? `${startDate}${resolvedEndDate ? ` – ${resolvedEndDate}` : ""}`
      : "";
    const description = toSafeText(record.rightDescription) || stripHtml(toSafeText(record.description));

    return {
      id: toSafeText(record.id) || `we-${index + 1}`,
      leftDate: leftDateFromData || computedDate,
      rightTitle: toSafeText(record.rightTitle) || toSafeText(record.company),
      rightSubtitle: toSafeText(record.rightSubtitle) || toSafeText(record.position),
      rightDescription: description,
    };
  });
}

function normalizeActivityItems(data: ActivitiesSectionData): TealActivityItemData[] {
  const rawItems = Array.isArray(data.items) ? data.items : [];

  if (rawItems.length === 0) {
    return [
      {
        id: "act-1",
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
      },
    ];
  }

  return rawItems.map((item, index) => {
    const record = item as unknown as Record<string, unknown>;
    const startDate = toSafeText(record.startDate);
    const endDate = toSafeText(record.endDate);
    return {
      id: toSafeText(record.id) || `act-${index + 1}`,
      leftDate: toSafeText(record.leftDate) || buildDateRangeLabel(startDate, endDate),
      rightTitle: toSafeText(record.rightTitle) || toSafeText(record.name),
      rightSubtitle: toSafeText(record.rightSubtitle) || toSafeText(record.role),
    };
  });
}

function buildOverviewPayload(title: string, items: TealOverviewItemData[]) {
  const normalizedItems = items.map((item, index) => ({
    id: item.id || `ov-${index + 1}`,
    content: item.content,
  }));

  return {
    title,
    items: normalizedItems,
    text: normalizedItems.map((item) => item.content).filter(Boolean).join("\n"),
  };
}

function buildWorkExperiencePayload(title: string, items: TealWorkExperienceItemData[]) {
  return {
    title,
    items: items.map((item, index) => {
      const dates = splitDateRange(item.leftDate || "");
      return {
        id: item.id || `we-${index + 1}`,
        leftDate: item.leftDate,
        rightTitle: item.rightTitle,
        rightSubtitle: item.rightSubtitle,
        rightDescription: item.rightDescription,
        startDate: dates.startDate,
        endDate: dates.endDate,
        company: item.rightTitle,
        position: item.rightSubtitle,
        description: item.rightDescription,
      };
    }),
  };
}

function buildActivitiesPayload(title: string, items: TealActivityItemData[]) {
  return {
    title,
    items: items.map((item, index) => {
      const hasRange = item.leftDate.includes("-") || item.leftDate.includes("–");
      const dates = splitDateRange(item.leftDate || "");
      return {
        id: item.id || `act-${index + 1}`,
        leftDate: item.leftDate,
        rightTitle: item.rightTitle,
        rightSubtitle: item.rightSubtitle,
        startDate: dates.startDate,
        endDate: hasRange ? dates.endDate : "",
        name: item.rightTitle,
        role: item.rightSubtitle,
        description: item.rightSubtitle,
      };
    }),
    text: items
      .map((item) => [item.leftDate, item.rightTitle, item.rightSubtitle].filter(Boolean).join(" | "))
      .join("\n"),
  };
}

export function SectionHeader({ title, icon, isSectionActive, onChangeTitle }: SectionHeaderProps) {
  const Icon = ICON_MAP[icon] ?? FileText;

  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center border border-teal-500 bg-teal-500 text-white">
        <Icon size={11} />
      </span>
      <div className="min-w-0 flex-1">
        <EditableText
          value={title}
          placeholder="Section title"
          isSectionActive={isSectionActive}
          onCommit={onChangeTitle}
          multiline={false}
          showToolbar={false}
          readClassName="px-0 py-0 text-[16px] font-semibold leading-6 text-teal-700"
          editClassName="rounded-none border border-slate-300 bg-white px-1 py-0.5 shadow-none"
        />
      </div>
      <span className="h-px flex-1 bg-slate-300" />
    </div>
  );
}

interface AddItemButtonProps {
  label: string;
  onClick: () => void;
}

export function AddItemButton({ label, onClick }: AddItemButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-400 hover:text-slate-800"
    >
      <Plus size={12} />
      {label}
    </button>
  );
}

interface OverviewItemProps {
  item: TealOverviewItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, nextContent: string) => void;
  onRemove: (index: number) => void;
}

export function OverviewItem({
  item,
  index,
  isSectionActive,
  isSelected,
  onSelect,
  onChange,
  onRemove,
}: OverviewItemProps) {
  return (
    <div
      className={cn(
        "group/overview relative border px-1 py-0.5 transition-colors",
        isSectionActive && isSelected ? "border-slate-300 bg-white" : "border-transparent",
      )}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <EditableText
        value={item.content}
        placeholder="Nội dung overview"
        isSectionActive={isSectionActive && isSelected}
        onCommit={(nextValue) => onChange(index, nextValue)}
        multiline
        minRows={1}
        showToolbar={false}
        preserveDashBullets
        readClassName="px-0 py-0 text-[14px] leading-6 text-slate-800"
        editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
      />

      {isSectionActive && isSelected ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa ô nội dung"
        >
          <Trash2 size={11} />
        </button>
      ) : null}
    </div>
  );
}

export function OverviewSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<SummarySectionData>) {
  const overviewItems = normalizeOverviewItems(data);
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setSelectedIndex(null);
      return;
    }

    if (overviewItems.length === 0) {
      setSelectedIndex(null);
      return;
    }

    if (selectedIndex !== null && selectedIndex >= overviewItems.length) {
      setSelectedIndex(overviewItems.length - 1);
    }
  }, [isActive, overviewItems.length, selectedIndex]);

  const updateOverviewItems = (nextItems: TealOverviewItemData[]) => {
    onEdit(buildOverviewPayload(sectionTitle, nextItems));
  };

  const addOverviewItem = () => {
    updateOverviewItems([
      ...overviewItems,
      {
        id: `ov-${overviewItems.length + 1}-${Date.now()}`,
        content: "",
      },
    ]);
    setSelectedIndex(overviewItems.length);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      <AddSectionButtons
        isActive={isActive}
        borderClassName={styleConfig.itemBorderClassName}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildOverviewPayload(nextTitle, overviewItems))}
        />

        <div className="space-y-0.5">
          {overviewItems.map((item, index) => (
            <OverviewItem
              key={item.id || `overview-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={selectedIndex === index}
              onSelect={setSelectedIndex}
              onChange={(targetIndex, nextContent) => {
                const nextItems = overviewItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        content: nextContent,
                      }
                    : currentItem,
                );
                updateOverviewItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const nextItems = overviewItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                updateOverviewItems(nextItems.length > 0 ? nextItems : [{ id: "ov-1", content: "" }]);
                setSelectedIndex((previousIndex) => {
                  if (nextItems.length === 0) {
                    return 0;
                  }

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextItems.length) {
                    return nextItems.length - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {isActive ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton label="Thêm nội dung" onClick={addOverviewItem} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface WorkExperienceItemProps {
  item: TealWorkExperienceItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, updates: Partial<TealWorkExperienceItemData>) => void;
  onRemove: (index: number) => void;
}

export function WorkExperienceItem({
  item,
  index,
  isSectionActive,
  isSelected,
  onSelect,
  onChange,
  onRemove,
}: WorkExperienceItemProps) {
  return (
    <div
      className={cn(
        "group/work relative border px-1 py-1 transition-colors",
        isSectionActive && isSelected ? "border-slate-300 bg-white" : "border-transparent",
      )}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <div className="grid grid-cols-[3fr_7fr] gap-x-2">
        <div>
          <EditableText
            value={item.leftDate}
            placeholder="01/2018 – Present"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { leftDate: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] font-semibold leading-6 text-slate-800"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>

        <div className="space-y-0.5">
          <EditableText
            value={item.rightTitle}
            placeholder="Tên công ty"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] font-bold leading-6 text-slate-900"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.rightSubtitle}
            placeholder="Vị trí hoặc mô tả ngắn"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] italic leading-6 text-slate-700"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.rightDescription}
            placeholder="- Mô tả công việc\n- Thành tích chính"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightDescription: nextValue })}
            multiline
            minRows={1}
            showToolbar={false}
            readClassName="px-0 py-0 text-[13px] leading-5 text-slate-700"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>
      </div>

      {isSectionActive && isSelected ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa kinh nghiệm"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function WorkExperienceSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ExperienceSectionData>) {
  const workItems = normalizeWorkExperienceItems(data);
  const sectionTitle = toSafeText(data.title) || styleConfig.title;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setSelectedIndex(null);
      return;
    }

    if (workItems.length === 0) {
      setSelectedIndex(null);
      return;
    }

    if (selectedIndex !== null && selectedIndex >= workItems.length) {
      setSelectedIndex(workItems.length - 1);
    }
  }, [isActive, workItems.length, selectedIndex]);

  const updateWorkItems = (nextItems: TealWorkExperienceItemData[]) => {
    onEdit(buildWorkExperiencePayload(sectionTitle, nextItems));
  };

  const addWorkExperienceItem = () => {
    updateWorkItems([
      ...workItems,
      {
        id: `we-${workItems.length + 1}-${Date.now()}`,
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
        rightDescription: "",
      },
    ]);
    setSelectedIndex(workItems.length);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      <AddSectionButtons
        isActive={isActive}
        borderClassName={styleConfig.itemBorderClassName}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildWorkExperiencePayload(nextTitle, workItems))}
        />

        <div className="divide-y divide-slate-300/70">
          {workItems.map((item, index) => (
            <WorkExperienceItem
              key={item.id || `work-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={selectedIndex === index}
              onSelect={setSelectedIndex}
              onChange={(targetIndex, updates) => {
                const nextItems = workItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        ...updates,
                      }
                    : currentItem,
                );
                updateWorkItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const nextItems = workItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                updateWorkItems(
                  nextItems.length > 0
                    ? nextItems
                    : [
                        {
                          id: "we-1",
                          leftDate: "",
                          rightTitle: "",
                          rightSubtitle: "",
                          rightDescription: "",
                        },
                      ],
                );
                setSelectedIndex((previousIndex) => {
                  if (nextItems.length === 0) {
                    return 0;
                  }

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextItems.length) {
                    return nextItems.length - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {isActive ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton label="Thêm kinh nghiệm" onClick={addWorkExperienceItem} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  item: TealActivityItemData;
  index: number;
  isSectionActive: boolean;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onChange: (index: number, updates: Partial<TealActivityItemData>) => void;
  onRemove: (index: number) => void;
}

export function ActivityItem({
  item,
  index,
  isSectionActive,
  isSelected,
  onSelect,
  onChange,
  onRemove,
}: ActivityItemProps) {
  return (
    <div
      className={cn(
        "group/activity relative border px-1 py-1 transition-colors",
        isSectionActive && isSelected ? "border-slate-300 bg-white" : "border-transparent",
      )}
      onMouseDown={() => onSelect(index)}
      onFocusCapture={() => onSelect(index)}
    >
      <div className="grid grid-cols-[3fr_7fr] gap-x-2">
        <EditableText
          value={item.leftDate}
          placeholder="06/2016"
          isSectionActive={isSectionActive && isSelected}
          onCommit={(nextValue) => onChange(index, { leftDate: nextValue })}
          multiline={false}
          showToolbar={false}
          readClassName="px-0 py-0 text-[14px] font-semibold leading-6 text-slate-800"
          editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
        />

        <div className="space-y-0.5">
          <EditableText
            value={item.rightTitle}
            placeholder="Tên hoạt động"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightTitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] font-bold leading-6 text-slate-900"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />

          <EditableText
            value={item.rightSubtitle}
            placeholder="Vai trò"
            isSectionActive={isSectionActive && isSelected}
            onCommit={(nextValue) => onChange(index, { rightSubtitle: nextValue })}
            multiline={false}
            showToolbar={false}
            readClassName="px-0 py-0 text-[14px] leading-6 text-slate-700"
            editClassName="rounded-none border border-slate-300 bg-white px-0.5 py-0 shadow-none"
          />
        </div>
      </div>

      {isSectionActive && isSelected ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center text-slate-400 hover:text-rose-600"
          title="Xóa hoạt động"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function TealActivitiesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ActivitiesSectionData>) {
  const activityItems = normalizeActivityItems(data);
  const sectionTitle = toSafeText((data as { title?: unknown }).title) || styleConfig.title;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setSelectedIndex(null);
      return;
    }

    if (activityItems.length === 0) {
      setSelectedIndex(null);
      return;
    }

    if (selectedIndex !== null && selectedIndex >= activityItems.length) {
      setSelectedIndex(activityItems.length - 1);
    }
  }, [isActive, activityItems.length, selectedIndex]);

  const updateActivityItems = (nextItems: TealActivityItemData[]) => {
    onEdit(buildActivitiesPayload(sectionTitle, nextItems));
  };

  const addActivityItem = () => {
    updateActivityItems([
      ...activityItems,
      {
        id: `act-${activityItems.length + 1}-${Date.now()}`,
        leftDate: "",
        rightTitle: "",
        rightSubtitle: "",
      },
    ]);
    setSelectedIndex(activityItems.length);
  };

  return (
    <div className="group relative break-inside-avoid-page" data-cv-section-shell>
      <AddSectionButtons
        isActive={isActive}
        borderClassName={styleConfig.itemBorderClassName}
        onAddAbove={onAddAbove}
        onAddBelow={onAddBelow}
      />

      <div
        className={cn(
          "border px-1.5 py-1.5 transition-colors",
          isActive ? "border-teal-200 bg-white" : "border-transparent bg-transparent",
        )}
      >
        <SectionHeader
          title={sectionTitle}
          icon={styleConfig.icon}
          isSectionActive={isActive}
          onChangeTitle={(nextTitle) => onEdit(buildActivitiesPayload(nextTitle, activityItems))}
        />

        <div className="divide-y divide-slate-300/70">
          {activityItems.map((item, index) => (
            <ActivityItem
              key={item.id || `activity-item-${index}`}
              item={item}
              index={index}
              isSectionActive={isActive}
              isSelected={selectedIndex === index}
              onSelect={setSelectedIndex}
              onChange={(targetIndex, updates) => {
                const nextItems = activityItems.map((currentItem, currentIndex) =>
                  currentIndex === targetIndex
                    ? {
                        ...currentItem,
                        ...updates,
                      }
                    : currentItem,
                );
                updateActivityItems(nextItems);
              }}
              onRemove={(targetIndex) => {
                const nextItems = activityItems.filter((_, currentIndex) => currentIndex !== targetIndex);
                updateActivityItems(
                  nextItems.length > 0
                    ? nextItems
                    : [
                        {
                          id: "act-1",
                          leftDate: "",
                          rightTitle: "",
                          rightSubtitle: "",
                        },
                      ],
                );
                setSelectedIndex((previousIndex) => {
                  if (nextItems.length === 0) {
                    return 0;
                  }

                  if (previousIndex === null) {
                    return null;
                  }

                  if (previousIndex > targetIndex) {
                    return previousIndex - 1;
                  }

                  if (previousIndex >= nextItems.length) {
                    return nextItems.length - 1;
                  }

                  return previousIndex;
                });
              }}
            />
          ))}
        </div>

        {isActive ? (
          <div className="mt-1.5 flex justify-end">
            <AddItemButton label="Thêm hoạt động" onClick={addActivityItem} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
