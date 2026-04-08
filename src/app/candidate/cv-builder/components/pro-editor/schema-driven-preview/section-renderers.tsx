"use client";

import type { ReactElement } from "react";
import { SectionShell } from "@/app/candidate/cv-builder/components/pro-editor/SectionShell";
import { cn } from "@/lib/utils";
import { EditableList, EditableText } from "./inline-editors";
import {
  OverviewSection,
  TealActivitiesSection,
  WorkExperienceSection,
} from "./teal-timeline-sections";
import type {
  ActivitiesSectionData,
  AwardsSectionData,
  CVPreviewSection,
  CVPreviewSectionType,
  CVResolvedSectionStyleConfig,
  CVSectionComponentMap,
  CVSectionComponentProps,
  CVTemplateConfig,
  CareerObjectiveSectionData,
  CertificatesSectionData,
  CustomSectionData,
  EducationSectionData,
  ExperienceSectionData,
  LanguagesSectionData,
  ProjectsSectionData,
  SkillsSectionData,
  SummarySectionData,
} from "./types";

function htmlToMultilineText(input: string) {
  if (!input) {
    return "";
  }

  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textToBulletLines(input: string) {
  return htmlToMultilineText(input)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^-\s*/, ""))
    .filter(Boolean);
}

function withBulletPrefix(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function formatMonth(input: string) {
  if (!input) {
    return "";
  }

  if (/^\d{4}-\d{2}$/.test(input)) {
    const [year, month] = input.split("-");
    return `${month}/${year}`;
  }

  return input;
}

export function SummarySection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<SummarySectionData>) {
  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <EditableText
        value={htmlToMultilineText(data.text || "")}
        placeholder="Tóm tắt giá trị nổi bật của bạn trong 3-5 dòng"
        isSectionActive={isActive}
        onCommit={(nextValue) => onEdit({ text: nextValue })}
        multiline
        minRows={5}
      />
    </SectionShell>
  );
}

export function CareerObjectiveSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<CareerObjectiveSectionData>) {
  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <EditableText
        value={htmlToMultilineText(data.text || "")}
        placeholder="Mục tiêu nghề nghiệp gắn với vị trí ứng tuyển"
        isSectionActive={isActive}
        onCommit={(nextValue) => onEdit({ text: nextValue })}
        multiline
        minRows={4}
      />
    </SectionShell>
  );
}

export function ExperienceSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ExperienceSectionData>) {
  const updateItem = (itemIndex: number, updates: Record<string, unknown>) => {
    const nextItems = data.items.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item,
    );
    onEdit({ items: nextItems });
  };

  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <div className="space-y-3 text-[14px] leading-6 text-slate-800">
        {data.items.map((item, itemIndex) => (
          <div key={item.id} className="grid grid-cols-[140px_1fr] gap-4">
            <div className="space-y-1 text-[13px] font-semibold text-slate-700">
              <EditableText
                value={formatMonth(item.startDate)}
                placeholder="Bắt đầu"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { startDate: nextValue })}
                multiline={false}
                showToolbar={false}
              />
              <EditableText
                value={formatMonth(String(item.endDate || "Hiện tại"))}
                placeholder="Kết thúc"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { endDate: nextValue })}
                multiline={false}
                showToolbar={false}
              />
            </div>

            <div className="space-y-1.5">
              <EditableText
                value={item.company}
                placeholder="Công ty"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { company: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName="font-bold text-slate-900"
                editClassName="py-1"
              />

              <EditableText
                value={item.position}
                placeholder="Vị trí"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { position: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName="text-[13px] italic font-medium text-slate-700"
                editClassName="py-1"
              />

              <EditableList
                items={textToBulletLines(item.description || "")}
                placeholder="Thành tích"
                isSectionActive={isActive}
                onCommit={(nextItems) => updateItem(itemIndex, { description: withBulletPrefix(nextItems) })}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function EducationSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<EducationSectionData>) {
  const updateItem = (itemIndex: number, updates: Record<string, unknown>) => {
    const nextItems = data.items.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item,
    );
    onEdit({ items: nextItems });
  };

  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <div className="space-y-2 text-[14px] leading-6 text-slate-800">
        {data.items.map((item, itemIndex) => (
          <div key={item.id} className="grid grid-cols-[140px_1fr] gap-4">
            <div className="space-y-1">
              <EditableText
                value={formatMonth(item.startDate)}
                placeholder="Bắt đầu"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { startDate: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName="font-semibold text-slate-700"
              />
              <EditableText
                value={formatMonth(item.endDate)}
                placeholder="Kết thúc"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { endDate: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName="font-semibold text-slate-700"
              />
            </div>
            <div>
              <EditableText
                value={item.institution}
                placeholder="Trường"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { institution: nextValue })}
                multiline={false}
                showToolbar={false}
                readClassName="font-semibold text-slate-900"
              />
              <EditableText
                value={item.degree}
                placeholder="Chuyên ngành"
                isSectionActive={isActive}
                onCommit={(nextValue) => updateItem(itemIndex, { degree: nextValue })}
                multiline={false}
                showToolbar={false}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function SkillsSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<SkillsSectionData>) {
  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <EditableList
        items={data.items.map((item) => item.name)}
        placeholder="Kỹ năng"
        isSectionActive={isActive}
        onCommit={(nextItems) => {
          const next = nextItems.map((name, index) => ({
            id: data.items[index]?.id || `skill-inline-${index + 1}`,
            name,
            level: data.items[index]?.level,
          }));
          onEdit({ items: next });
        }}
        readClassName="rounded-md border border-slate-200 bg-slate-50/65 px-2.5 py-1.5"
      />
    </SectionShell>
  );
}

export function LanguagesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<LanguagesSectionData>) {
  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <EditableList
        items={data.items.map((item) => (item.level ? `${item.name} - ${item.level}` : item.name))}
        placeholder="Ngôn ngữ"
        isSectionActive={isActive}
        onCommit={(nextItems) => {
          const mapped = nextItems.map((item, index) => {
            const [name, ...rest] = item.split("-");
            return {
              id: data.items[index]?.id || `lang-inline-${index + 1}`,
              name: name.trim(),
              level: rest.join("-").trim(),
            };
          });
          onEdit({ items: mapped });
        }}
      />
    </SectionShell>
  );
}

export function ProjectsSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ProjectsSectionData>) {
  const updateItem = (itemIndex: number, updates: Record<string, unknown>) => {
    const nextItems = data.items.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item,
    );
    onEdit({ items: nextItems });
  };

  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <div className="space-y-2 text-[14px] leading-6 text-slate-800">
        {data.items.map((item, itemIndex) => (
          <div
            key={item.id}
            className={cn("rounded-md border px-3 py-2.5", styleConfig.itemBorderClassName, styleConfig.itemBackgroundClassName)}
          >
            <EditableText
              value={item.name}
              placeholder="Tên dự án"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { name: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="font-semibold text-slate-900"
            />
            <EditableText
              value={item.role}
              placeholder="Vai trò"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { role: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="text-[13px] font-medium text-slate-700"
            />
            <EditableText
              value={htmlToMultilineText(item.description || "")}
              placeholder="Mô tả dự án"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { description: nextValue })}
              multiline
              minRows={3}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function CertificatesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<CertificatesSectionData>) {
  const updateItem = (itemIndex: number, updates: Record<string, unknown>) => {
    const nextItems = data.items.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item,
    );
    onEdit({ items: nextItems });
  };

  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <div className="space-y-1.5 text-[14px] leading-6 text-slate-800">
        {data.items.map((item, itemIndex) => (
          <div
            key={item.id}
            className={cn("rounded-md border px-3 py-2.5", styleConfig.itemBorderClassName, styleConfig.itemBackgroundClassName)}
          >
            <EditableText
              value={item.name}
              placeholder="Chứng chỉ"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { name: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="font-semibold text-slate-900"
            />
            <EditableText
              value={item.issuer}
              placeholder="Đơn vị cấp"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { issuer: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="text-[13px] text-slate-700"
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function AwardsSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<AwardsSectionData>) {
  const updateItem = (itemIndex: number, updates: Record<string, unknown>) => {
    const nextItems = data.items.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item,
    );
    onEdit({ items: nextItems });
  };

  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <div className="space-y-1.5 text-[14px] leading-6 text-slate-800">
        {data.items.map((item, itemIndex) => (
          <div key={item.id} className="grid grid-cols-[120px_1fr] gap-2">
            <EditableText
              value={item.date}
              placeholder="Thời gian"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { date: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="font-semibold text-slate-700"
            />
            <EditableText
              value={item.title}
              placeholder="Tên giải thưởng"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { title: nextValue })}
              multiline={false}
              showToolbar={false}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function ActivitiesSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<ActivitiesSectionData>) {
  const updateItem = (itemIndex: number, updates: Record<string, unknown>) => {
    const nextItems = data.items.map((item, index) =>
      index === itemIndex ? { ...item, ...updates } : item,
    );
    onEdit({ items: nextItems });
  };

  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <div className="space-y-2 text-[14px] leading-6 text-slate-800">
        {data.items.map((item, itemIndex) => (
          <div
            key={item.id}
            className={cn("rounded-md border px-3 py-2.5", styleConfig.itemBorderClassName, styleConfig.itemBackgroundClassName)}
          >
            <EditableText
              value={item.name}
              placeholder="Tên hoạt động"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { name: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="font-semibold text-slate-900"
            />
            <EditableText
              value={item.role || ""}
              placeholder="Vai trò"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { role: nextValue })}
              multiline={false}
              showToolbar={false}
              readClassName="text-[13px] text-slate-700"
            />
            <EditableText
              value={htmlToMultilineText(item.description || "")}
              placeholder="Mô tả hoạt động"
              isSectionActive={isActive}
              onCommit={(nextValue) => updateItem(itemIndex, { description: nextValue })}
              multiline
              minRows={3}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function CustomSection({
  data,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: CVSectionComponentProps<CustomSectionData>) {
  return (
    <SectionShell styleConfig={styleConfig} isActive={isActive} onAddAbove={onAddAbove} onAddBelow={onAddBelow}>
      <EditableText
        value={htmlToMultilineText(data.text || "")}
        placeholder="Nội dung section tùy chỉnh"
        isSectionActive={isActive}
        onCommit={(nextValue) => onEdit({ text: nextValue })}
        multiline
        minRows={4}
      />
      {Array.isArray(data.items) ? (
        <div className="mt-2">
          <EditableList
            items={data.items.map((item) => String(item))}
            placeholder="Gạch đầu dòng"
            isSectionActive={isActive}
            onCommit={(nextItems) => onEdit({ items: nextItems })}
          />
        </div>
      ) : null}
    </SectionShell>
  );
}

export const SECTION_COMPONENT_MAP: CVSectionComponentMap = {
  summary: SummarySection,
  career_objective: CareerObjectiveSection,
  experience: ExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  languages: LanguagesSection,
  projects: ProjectsSection,
  certificates: CertificatesSection,
  awards: AwardsSection,
  activities: ActivitiesSection,
  custom: CustomSection,
};

export function resolveSectionStyleConfig(
  template: CVTemplateConfig,
  sectionType: CVPreviewSectionType,
  explicitTitle?: string,
): CVResolvedSectionStyleConfig {
  const baseStyle = template.sectionStyleRules[sectionType];
  return {
    ...baseStyle,
    title: explicitTitle?.trim() ? explicitTitle : baseStyle.title,
  };
}

interface SchemaDrivenSectionRendererProps {
  templateId: string;
  section: CVPreviewSection;
  styleConfig: CVResolvedSectionStyleConfig;
  isActive: boolean;
  onEdit: (updates: Record<string, unknown>) => void;
  onAddAbove: () => void;
  onAddBelow: () => void;
}

export function SchemaDrivenSectionRenderer({
  templateId,
  section,
  styleConfig,
  isActive,
  onEdit,
  onAddAbove,
  onAddBelow,
}: SchemaDrivenSectionRendererProps) {
  if (templateId === "teal-timeline") {
    if (section.type === "summary") {
      return (
        <OverviewSection
          data={section.data as SummarySectionData}
          styleConfig={styleConfig}
          isActive={isActive}
          onEdit={(updates) => onEdit(updates as Record<string, unknown>)}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      );
    }

    if (section.type === "experience") {
      return (
        <WorkExperienceSection
          data={section.data as ExperienceSectionData}
          styleConfig={styleConfig}
          isActive={isActive}
          onEdit={(updates) => onEdit(updates as Record<string, unknown>)}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      );
    }

    if (section.type === "activities") {
      return (
        <TealActivitiesSection
          data={section.data as ActivitiesSectionData}
          styleConfig={styleConfig}
          isActive={isActive}
          onEdit={(updates) => onEdit(updates as Record<string, unknown>)}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      );
    }
  }

  const Component = SECTION_COMPONENT_MAP[section.type] as (
    props: CVSectionComponentProps<unknown>
  ) => ReactElement;

  return (
    <Component
      data={section.data as unknown}
      styleConfig={styleConfig}
      isActive={isActive}
      onEdit={(updates) => onEdit(updates as Record<string, unknown>)}
      onAddAbove={onAddAbove}
      onAddBelow={onAddBelow}
    />
  );
}
