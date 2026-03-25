"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { Link2, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedBlockList, getReviewableBlocks } from "@/features/ocr-viewer/components/ParsedBlockList";
import type {
  SemanticItem,
  SemanticSection,
  SemanticSectionType,
  SemanticSourceTrace,
} from "@/features/ocr-viewer/semantic-types";
import type { NormalizedOcrPage } from "@/features/ocr-viewer/types";
import { transformOcrToSemanticJson } from "@/features/ocr-viewer/utils/ocrSemantic";

interface SemanticReviewPanelProps {
  pages: NormalizedOcrPage[];
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onHover: (blockId: string | null) => void;
  onClick: (blockId: string) => void;
}

interface SectionTone {
  bar: string;
  label: string;
  active: string;
  border: string;
  hover: string;
}

interface ProfileSummary extends SemanticSourceTrace {
  name: string;
  title: string;
}

const SECTION_TONES: Record<SemanticSectionType, SectionTone> = {
  summary: {
    bar: "bg-sky-500",
    label: "text-sky-700",
    active: "bg-sky-50",
    border: "border-sky-200 ring-sky-100",
    hover: "hover:bg-sky-50/70",
  },
  contact_info: {
    bar: "bg-emerald-500",
    label: "text-emerald-700",
    active: "bg-emerald-50",
    border: "border-emerald-200 ring-emerald-100",
    hover: "hover:bg-emerald-50/80",
  },
  skill_group: {
    bar: "bg-cyan-500",
    label: "text-cyan-700",
    active: "bg-cyan-50",
    border: "border-cyan-200 ring-cyan-100",
    hover: "hover:bg-cyan-50/80",
  },
  education: {
    bar: "bg-indigo-500",
    label: "text-indigo-700",
    active: "bg-indigo-50",
    border: "border-indigo-200 ring-indigo-100",
    hover: "hover:bg-indigo-50/80",
  },
  project: {
    bar: "bg-orange-500",
    label: "text-orange-700",
    active: "bg-orange-50",
    border: "border-orange-200 ring-orange-100",
    hover: "hover:bg-orange-50/80",
  },
  experience: {
    bar: "bg-blue-500",
    label: "text-blue-700",
    active: "bg-blue-50",
    border: "border-blue-200 ring-blue-100",
    hover: "hover:bg-blue-50/80",
  },
  certification: {
    bar: "bg-violet-500",
    label: "text-violet-700",
    active: "bg-violet-50",
    border: "border-violet-200 ring-violet-100",
    hover: "hover:bg-violet-50/80",
  },
  language: {
    bar: "bg-teal-500",
    label: "text-teal-700",
    active: "bg-teal-50",
    border: "border-teal-200 ring-teal-100",
    hover: "hover:bg-teal-50/80",
  },
  other: {
    bar: "bg-slate-400",
    label: "text-slate-600",
    active: "bg-slate-50",
    border: "border-slate-200 ring-slate-100",
    hover: "hover:bg-slate-50",
  },
};

const SECTION_TITLES: Record<SemanticSectionType, string> = {
  summary: "Mục tiêu nghề nghiệp",
  contact_info: "Thông tin cá nhân",
  skill_group: "Kỹ năng",
  education: "Học vấn",
  project: "Dự án",
  experience: "Kinh nghiệm",
  certification: "Chứng chỉ",
  language: "Ngôn ngữ",
  other: "Nội dung khác",
};

const RESERVED_HEADERS = new Set([
  "MUCTIEUCANHAN",
  "MUCTIEUNGHENGHIEP",
  "CAREEROBJECTIVE",
  "CAREERGOAL",
  "OBJECTIVE",
  "SUMMARY",
  "PROFILE",
  "HOCVAN",
  "EDUCATION",
  "KYNANG",
  "SKILLS",
  "DUAN",
  "PROJECT",
  "PROJECTS",
  "KINHNGHIEM",
  "WORKEXPERIENCE",
  "EXPERIENCE",
  "CHUNGCHI",
  "CERTIFICATIONS",
  "THONGTINCANHAN",
  "CONTACTINFORMATION",
  "NGONNGU",
  "LANGUAGES",
]);

function normalizeLookup(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function getPrimaryBlockId(trace: SemanticSourceTrace | null | undefined) {
  return trace?.sourceBlockIds.find(Boolean) ?? null;
}

function includesBlock(trace: SemanticSourceTrace | null | undefined, blockId: string | null) {
  return Boolean(blockId && trace?.sourceBlockIds.includes(blockId));
}

function joinParts(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(" · ");
}

function buildProfileSummary(pages: NormalizedOcrPage[]): ProfileSummary | null {
  const blocks = getReviewableBlocks(pages);
  if (!blocks.length) return null;

  const nameIndex = blocks.findIndex((block) => {
    const text = block.text.trim();
    if (!text || RESERVED_HEADERS.has(normalizeLookup(text))) return false;
    if (/@|https?:|www\.|\d{4,}/i.test(text)) return false;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) return false;
    return block.type.toLowerCase() === "title" || text.length <= 34;
  });

  if (nameIndex < 0) return null;

  const nameBlock = blocks[nameIndex];
  const subtitleBlock = blocks
    .slice(nameIndex + 1, nameIndex + 4)
    .find((block) => {
      const text = block.text.trim();
      if (!text || RESERVED_HEADERS.has(normalizeLookup(text))) return false;
      if (/@|https?:|www\.|\d{4,}/i.test(text)) return false;
      return text.length <= 48;
    });

  return {
    name: nameBlock.text.trim(),
    title: subtitleBlock?.text.trim() ?? "",
    sourceBlockIds: [nameBlock.id, ...(subtitleBlock ? [subtitleBlock.id] : [])],
    pageIndexes: [nameBlock.pageIndex, ...(subtitleBlock ? [subtitleBlock.pageIndex] : [])],
  };
}

function SelectableRow({
  trace,
  activeBlockId,
  hoveredBlockId,
  onHover,
  onClick,
  tone,
  children,
}: {
  trace: SemanticSourceTrace;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onHover: (blockId: string | null) => void;
  onClick: (blockId: string) => void;
  tone: SectionTone;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const primaryBlockId = getPrimaryBlockId(trace);
  const active = includesBlock(trace, activeBlockId);
  const hovered = includesBlock(trace, hoveredBlockId);

  useEffect(() => {
    if (active) {
      ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [active]);

  if (!primaryBlockId) {
    return <div className="px-4 py-3">{children}</div>;
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "w-full px-4 py-3 text-left transition-colors duration-150",
        tone.hover,
        hovered && tone.active,
        active && cn(tone.active, "border-l-2", tone.border),
      )}
      onMouseEnter={() => onHover(primaryBlockId)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(primaryBlockId)}
      onBlur={() => onHover(null)}
      onClick={() => onClick(primaryBlockId)}
    >
      {children}
    </button>
  );
}

function renderItem(
  item: SemanticItem,
  activeBlockId: string | null,
  hoveredBlockId: string | null,
  onHover: (blockId: string | null) => void,
  onClick: (blockId: string) => void,
  tone: SectionTone,
) {
  switch (item.type) {
    case "paragraph":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.text}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] leading-6 text-slate-600">{item.text}</p>
        </SelectableRow>
      );
    case "list":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.items.join(":")}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <ul className="space-y-2 text-[13px] leading-6 text-slate-600">
            {item.items.map((entry, index) => (
              <li key={`${entry}-${index}`} className="flex gap-2.5">
                <span className="mt-[10px] h-1 w-1 rounded-full bg-slate-300" />
                <span>{entry}</span>
              </li>
            ))}
          </ul>
        </SelectableRow>
      );
    case "skill_group":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.groupName}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] font-semibold text-slate-900">{item.groupName}</p>
          <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{item.skills.join(", ")}</p>
        </SelectableRow>
      );
    case "education":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.institution}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] font-semibold text-slate-900">{item.institution}</p>
          {joinParts([item.degree, item.fieldOfStudy]) ? (
            <p className="mt-1 text-[13px] text-slate-500">{joinParts([item.degree, item.fieldOfStudy])}</p>
          ) : null}
          {item.dateText ? <p className="mt-1 text-[12px] font-medium text-slate-400">{item.dateText}</p> : null}
          {item.gpa ? <p className="mt-2 text-[13px] text-slate-600">GPA: {item.gpa}</p> : null}
          {item.description ? <p className="mt-2 text-[13px] leading-6 text-slate-600">{item.description}</p> : null}
        </SelectableRow>
      );
    case "project":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.name}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] font-semibold text-slate-900">{item.name}</p>
          {joinParts([item.role, item.dateText]) ? (
            <p className="mt-1 text-[12px] font-medium text-slate-400">{joinParts([item.role, item.dateText])}</p>
          ) : null}
          {item.description ? <p className="mt-2 text-[13px] leading-6 text-slate-600">{item.description}</p> : null}
          {item.techStack.length ? (
            <p className="mt-2 text-[12px] leading-5 text-slate-400">{item.techStack.join(", ")}</p>
          ) : null}
        </SelectableRow>
      );
    case "experience":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || joinParts([item.position, item.company])}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] font-semibold text-slate-900">{item.position || item.company}</p>
          {joinParts([item.company, item.location]) ? (
            <p className="mt-1 text-[13px] text-slate-500">{joinParts([item.company, item.location])}</p>
          ) : null}
          {item.dateText ? <p className="mt-1 text-[12px] font-medium text-slate-400">{item.dateText}</p> : null}
          {item.description ? <p className="mt-2 text-[13px] leading-6 text-slate-600">{item.description}</p> : null}
          {item.techStack.length ? (
            <p className="mt-2 text-[12px] leading-5 text-slate-400">{item.techStack.join(", ")}</p>
          ) : null}
        </SelectableRow>
      );
    case "certification":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.name}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] font-semibold text-slate-900">{item.name}</p>
          {joinParts([item.issuer, item.date]) ? (
            <p className="mt-1 text-[13px] text-slate-500">{joinParts([item.issuer, item.date])}</p>
          ) : null}
        </SelectableRow>
      );
    case "language":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.name}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] font-semibold text-slate-900">{item.name}</p>
          {joinParts([item.level, item.score]) ? (
            <p className="mt-1 text-[13px] text-slate-500">{joinParts([item.level, item.score])}</p>
          ) : null}
        </SelectableRow>
      );
    case "contact_info":
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || "contact-info"}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <div className="space-y-1 text-[13px] text-slate-600">
            {item.email ? <p>{item.email}</p> : null}
            {item.phone ? <p>{item.phone}</p> : null}
            {item.address ? <p>{item.address}</p> : null}
            {item.otherLines?.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
          </div>
        </SelectableRow>
      );
    case "other":
    default:
      return (
        <SelectableRow
          key={item.sourceBlockIds.join(":") || item.text}
          trace={item}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
          tone={tone}
        >
          <p className="text-[13px] leading-6 text-slate-600">{item.text}</p>
        </SelectableRow>
      );
  }
}

function ContactLine({
  icon,
  text,
  trace,
  activeBlockId,
  hoveredBlockId,
  onHover,
  onClick,
}: {
  icon: ReactNode;
  text: string;
  trace: SemanticSourceTrace;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onHover: (blockId: string | null) => void;
  onClick: (blockId: string) => void;
}) {
  const primaryBlockId = getPrimaryBlockId(trace);
  const active = includesBlock(trace, activeBlockId);
  const hovered = includesBlock(trace, hoveredBlockId);

  if (!primaryBlockId) {
    return (
      <div className="flex items-start gap-3 px-4 py-2.5 text-[13px] text-slate-600">
        <span className="mt-0.5 text-emerald-500">{icon}</span>
        <span>{text}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 px-4 py-2.5 text-left text-[13px] text-slate-600 transition-colors",
        hovered && "bg-emerald-50/80",
        active && "bg-emerald-50",
      )}
      onMouseEnter={() => onHover(primaryBlockId)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(primaryBlockId)}
      onBlur={() => onHover(null)}
      onClick={() => onClick(primaryBlockId)}
    >
      <span className="mt-0.5 text-emerald-500">{icon}</span>
      <span>{text}</span>
    </button>
  );
}

function SectionCard({
  section,
  activeBlockId,
  hoveredBlockId,
  onHover,
  onClick,
}: {
  section: SemanticSection;
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  onHover: (blockId: string | null) => void;
  onClick: (blockId: string) => void;
}) {
  const tone = SECTION_TONES[section.type];
  const active = includesBlock(section, activeBlockId);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]",
        active && cn(tone.border, "ring-1"),
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className={cn("h-4 w-1 rounded-full", tone.bar)} />
        <p className={cn("text-[12px] font-semibold tracking-[0.04em]", tone.label)}>
          {section.title || SECTION_TITLES[section.type]}
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {section.items.map((item) => renderItem(item, activeBlockId, hoveredBlockId, onHover, onClick, tone))}
      </div>
    </section>
  );
}

export function SemanticReviewPanel({
  pages,
  activeBlockId,
  hoveredBlockId,
  onHover,
  onClick,
}: SemanticReviewPanelProps) {
  const semantic = useMemo(() => transformOcrToSemanticJson(pages), [pages]);
  const blocks = useMemo(() => getReviewableBlocks(pages), [pages]);
  const profile = useMemo(() => buildProfileSummary(pages), [pages]);
  const hasContact = Boolean(
    semantic.contact.email || semantic.contact.phone || semantic.contact.address || semantic.contact.links.length,
  );
  const contactSectionTitle =
    semantic.sections.find((section) => section.type === "contact_info")?.title || SECTION_TITLES.contact_info;
  const sections = semantic.sections.filter(
    (section) => section.items.length > 0 && !(hasContact && section.type === "contact_info"),
  );

  if (!hasContact && !sections.length) {
    return (
      <ParsedBlockList
        pages={pages}
        activeBlockId={activeBlockId}
        hoveredBlockId={hoveredBlockId}
        onHover={onHover}
        onClick={onClick}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-3 pb-2">
      {profile ? (
        <section
          className={cn(
            "overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]",
            includesBlock(profile, activeBlockId) && "border-sky-200 ring-1 ring-sky-100",
          )}
        >
          <SelectableRow
            trace={profile}
            activeBlockId={activeBlockId}
            hoveredBlockId={hoveredBlockId}
            onHover={onHover}
            onClick={onClick}
            tone={SECTION_TONES.summary}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[18px] font-semibold text-slate-400">
                {profile.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">Ứng viên</p>
                <h3 className="mt-1 truncate text-[16px] font-semibold text-slate-900">{profile.name}</h3>
                {profile.title ? <p className="mt-1 text-[13px] text-slate-500">{profile.title}</p> : null}
              </div>
            </div>
          </SelectableRow>
        </section>
      ) : null}

      {hasContact ? (
        <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <span className="h-4 w-1 rounded-full bg-emerald-500" />
            <p className="text-[12px] font-semibold tracking-[0.04em] text-emerald-700">{contactSectionTitle}</p>
          </div>

          <div className="divide-y divide-slate-100">
            {semantic.contact.email ? (
              <ContactLine
                icon={<Mail size={15} />}
                text={semantic.contact.email}
                trace={semantic.contact}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onHover={onHover}
                onClick={onClick}
              />
            ) : null}
            {semantic.contact.phone ? (
              <ContactLine
                icon={<Phone size={15} />}
                text={semantic.contact.phone}
                trace={semantic.contact}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onHover={onHover}
                onClick={onClick}
              />
            ) : null}
            {semantic.contact.address ? (
              <ContactLine
                icon={<MapPin size={15} />}
                text={semantic.contact.address}
                trace={semantic.contact}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onHover={onHover}
                onClick={onClick}
              />
            ) : null}
            {semantic.contact.links.map((link, index) => (
              <ContactLine
                key={`${link.url}-${index}`}
                icon={<Link2 size={15} />}
                text={link.label || link.url}
                trace={semantic.contact}
                activeBlockId={activeBlockId}
                hoveredBlockId={hoveredBlockId}
                onHover={onHover}
                onClick={onClick}
              />
            ))}
          </div>
        </section>
      ) : null}

      {sections.map((section, index) => (
        <SectionCard
          key={`${section.type}-${index}-${section.sourceBlockIds.join(":")}`}
          section={section}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
        />
      ))}

      {!sections.length && blocks.length ? (
        <ParsedBlockList
          pages={pages}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHover={onHover}
          onClick={onClick}
        />
      ) : null}
    </div>
  );
}
