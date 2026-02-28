"use client";

import React from "react";
import { useCVStore } from "../../store";
import { InlineText } from "../inline/InlineText";
import { InlineRichText } from "../inline/InlineRichText";
import { SectionWrapper } from "../SectionWrapper";
import { AddSectionButton } from "../AddSectionModal";
import {
  HeaderData,
  PersonalInfoData,
  ExperienceListSectionData,
  EducationListSectionData,
  SkillListSectionData,
  SummarySectionData,
  ProjectListSectionData,
  AwardListSectionData,
  CertificateListSectionData,
  CVSection,
} from "../../types";
import { Plus, X } from "lucide-react";

/* ───────────────────────────────────────────────────────
   Icon hình tròn xanh lá (giống f8.edu.vn mẫu CV)
   ─────────────────────────────────────────────────────── */
const GreenCircleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="14" fill="#4CAF50" />
    <circle cx="14" cy="14" r="7" fill="white" fillOpacity="0.3" />
    <circle cx="14" cy="7" r="2.5" fill="white" fillOpacity="0.5" />
    <circle cx="14" cy="21" r="2.5" fill="white" fillOpacity="0.5" />
    <circle cx="7" cy="14" r="2.5" fill="white" fillOpacity="0.5" />
    <circle cx="21" cy="14" r="2.5" fill="white" fillOpacity="0.5" />
    <circle cx="9" cy="9" r="2" fill="white" fillOpacity="0.35" />
    <circle cx="19" cy="9" r="2" fill="white" fillOpacity="0.35" />
    <circle cx="9" cy="19" r="2" fill="white" fillOpacity="0.35" />
    <circle cx="19" cy="19" r="2" fill="white" fillOpacity="0.35" />
  </svg>
);

/* ───────────────────────────────────────────────────────
   Section Title (Tổng quan, Kinh nghiệm, Học vấn…)
   ─────────────────────────────────────────────────────── */
const SectionTitle = ({ sectionId, title }: { sectionId: string; title: string }) => {
  const { updateSection } = useCVStore();
  return (
    <div className="flex items-center gap-2.5 mb-2 mt-1">
      <GreenCircleIcon />
      <h2 className="text-[17px] font-bold tracking-wide cv-green">
        <InlineText
          value={title}
          onChange={(v) => updateSection(sectionId, { title: v })}
          placeholder="Tên mục"
        />
      </h2>
    </div>
  );
};

/* ───────────────────────────────────────────────────────
   Add / Remove item button helpers
   ─────────────────────────────────────────────────────── */
const AddItemBtn = ({ sectionId, label }: { sectionId: string; label: string }) => {
  const { addListItem } = useCVStore();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); addListItem(sectionId); }}
      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-2 print:hidden transition-colors"
    >
      <Plus size={14} />
      {label}
    </button>
  );
};

const RemoveItemBtn = ({ sectionId, index }: { sectionId: string; index: number }) => {
  const { removeListItem } = useCVStore();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); removeListItem(sectionId, index); }}
      title="Xóa mục này"
      className="absolute -right-1 -top-1 size-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 opacity-0 group-hover/item:opacity-100 transition-opacity print:hidden z-10"
    >
      <X size={10} />
    </button>
  );
};

/* ═══════════════════════════════════════════════════════
   SECTION RENDERERS — each type has its own component
   ═══════════════════════════════════════════════════════ */

/* ── Header ────────────────────────────────────────── */
function HeaderSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as HeaderData;
  const update = (d: Partial<HeaderData>) => updateSectionData(section.id, d);

  return (
    <SectionWrapper sectionId={section.id} label="Header" disableDelete>
      <div className="mb-1">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="text-[32px] font-bold leading-tight cv-green">
              <InlineText value={data.fullName} onChange={(v) => update({ fullName: v })} placeholder="Nguyễn Văn A" />
            </div>
            <div className="text-[15px] text-gray-600 mt-0.5">
              <InlineText value={data.title} onChange={(v) => update({ title: v })} placeholder="Lập trình viên Fullstack" />
            </div>
          </div>
          <div className="w-25 h-30 bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0 ml-4 overflow-hidden">
            {data.avatarUrl && data.avatarUrl !== "/avatars/default-avatar.png" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <svg width="48" height="56" viewBox="0 0 48 56" fill="none">
                <circle cx="24" cy="18" r="10" fill="#bdbdbd" />
                <ellipse cx="24" cy="44" rx="16" ry="12" fill="#bdbdbd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

/* ── Personal Info ─────────────────────────────────── */
function PersonalInfoSection({ section, headerSection }: { section: CVSection; headerSection?: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as PersonalInfoData;
  const header = headerSection?.data as HeaderData | undefined;
  const update = (d: Partial<PersonalInfoData>) => updateSectionData(section.id, d);

  return (
    <SectionWrapper sectionId={section.id} label="Thông tin">
      <div className="grid grid-cols-2 gap-y-1 gap-x-6 mb-3 text-[12.5px] mt-1">
        <div className="flex">
          <span className="font-bold w-18 shrink-0 text-gray-700">Họ tên</span>
          <InlineText
            value={header?.fullName || ""}
            onChange={(v) => headerSection && updateSectionData(headerSection.id, { fullName: v })}
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div className="flex">
          <span className="font-bold w-18 shrink-0 text-gray-700">Ngày sinh</span>
          <InlineText value={data.dob || ""} onChange={(v) => update({ dob: v })} placeholder="01/01/2000" />
        </div>
        <div className="flex">
          <span className="font-bold w-18 shrink-0 text-gray-700">Điện thoại</span>
          <InlineText value={data.phone} onChange={(v) => update({ phone: v })} placeholder="+84 1234567890" />
        </div>
        <div className="flex">
          <span className="font-bold w-18 shrink-0 text-gray-700">Email</span>
          <InlineText value={data.email} onChange={(v) => update({ email: v })} placeholder="email@gmail.com" />
        </div>
        <div className="flex">
          <span className="font-bold w-18 shrink-0 text-gray-700">Địa chỉ</span>
          <InlineText value={data.address} onChange={(v) => update({ address: v })} placeholder="Hà Nội, Việt Nam" />
        </div>
      </div>
      <hr className="border-gray-200 mb-2" />
    </SectionWrapper>
  );
}

/* ── Summary / Overview ────────────────────────────── */
function SummarySection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as SummarySectionData;

  return (
    <SectionWrapper sectionId={section.id} label="Tổng quan">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Tổng quan"} />
        <div className="text-[12.5px] leading-relaxed pl-1">
          <InlineRichText
            value={data.text}
            onChange={(v) => updateSectionData(section.id, { text: v })}
            placeholder="- Hơn 2 năm kinh nghiệm lập trình..."
          />
        </div>
      </div>
    </SectionWrapper>
  );
}

/* ── Work Experience ───────────────────────────────── */
function ExperienceSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as ExperienceListSectionData;

  const updateItem = (items: typeof data.items, index: number, field: string, value: unknown) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateSectionData(section.id, { items: newItems });
  };

  return (
    <SectionWrapper sectionId={section.id} label="Kinh nghiệm">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Kinh nghiệm làm việc"} />
        <div className="space-y-2.5">
          {data.items.map((item, idx) => (
            <div key={item.id} className="group/item relative grid grid-cols-[135px_1fr] gap-x-4">
              <RemoveItemBtn sectionId={section.id} index={idx} />
              <div className="text-[12px] font-bold pt-0.5 cv-date-accent">
                <InlineText value={item.startDate} onChange={(v) => updateItem(data.items, idx, "startDate", v)} placeholder="MM/YYYY" />
                <span className="mx-0.5">-</span>
                <InlineText value={item.endDate} onChange={(v) => updateItem(data.items, idx, "endDate", v)} placeholder="Hiện tại" />
              </div>
              <div>
                <div className="font-bold text-[13px] uppercase text-gray-900">
                  <InlineText value={item.company} onChange={(v) => updateItem(data.items, idx, "company", v)} placeholder="TÊN CÔNG TY" />
                </div>
                <div className="italic text-[12.5px] text-gray-600 mb-1">
                  <InlineText value={item.position} onChange={(v) => updateItem(data.items, idx, "position", v)} placeholder="Vị trí của bạn" />
                </div>
                <div className="text-[12px] text-gray-700 leading-relaxed">
                  <InlineRichText value={item.description} onChange={(v) => updateItem(data.items, idx, "description", v)} placeholder="• Mô tả công việc..." />
                </div>
              </div>
            </div>
          ))}
        </div>
        <AddItemBtn sectionId={section.id} label="Thêm kinh nghiệm" />
      </div>
    </SectionWrapper>
  );
}

/* ── Education ─────────────────────────────────────── */
function EducationSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as EducationListSectionData;

  const updateItem = (items: typeof data.items, index: number, field: string, value: unknown) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateSectionData(section.id, { items: newItems });
  };

  return (
    <SectionWrapper sectionId={section.id} label="Học vấn">
      <div className="mb-2">
        <SectionTitle sectionId={section.id} title={section.title || "Học vấn"} />
        <div className="space-y-2">
          {data.items.map((item, idx) => (
            <div key={item.id} className="group/item relative grid grid-cols-[135px_1fr] gap-x-4">
              <RemoveItemBtn sectionId={section.id} index={idx} />
              <div className="text-[12px] font-bold pt-0.5 text-gray-700">
                <InlineText value={item.startDate} onChange={(v) => updateItem(data.items, idx, "startDate", v)} placeholder="YYYY" />
                <span className="mx-0.5">–</span>
                <InlineText value={item.endDate} onChange={(v) => updateItem(data.items, idx, "endDate", v)} placeholder="YYYY" />
              </div>
              <div>
                <div className="font-bold text-[13px] text-gray-900">
                  <InlineText value={item.institution} onChange={(v) => updateItem(data.items, idx, "institution", v)} placeholder="Tên trường" />
                </div>
                <div className="text-[12px] text-gray-700">
                  <span className="font-bold">Chuyên ngành</span> -{" "}
                  <InlineText value={item.degree} onChange={(v) => updateItem(data.items, idx, "degree", v)} placeholder="Chuyên ngành" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <AddItemBtn sectionId={section.id} label="Thêm học vấn" />
      </div>
    </SectionWrapper>
  );
}

/* ── Skills ────────────────────────────────────────── */
function SkillSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as SkillListSectionData;
  const mainSkills = data.items.filter((s) => (s.level ?? 0) >= 75);
  const otherSkills = data.items.filter((s) => (s.level ?? 0) < 75);

  const updateItem = (id: string, field: string, value: unknown) => {
    const allItems = [...data.items];
    const idx = allItems.findIndex((s) => s.id === id);
    if (idx >= 0) {
      allItems[idx] = { ...allItems[idx], [field]: value };
      updateSectionData(section.id, { items: allItems });
    }
  };

  const removeByGlobalIndex = (skillId: string) => {
    const idx = data.items.findIndex((s) => s.id === skillId);
    if (idx >= 0) {
      const items = [...data.items];
      if (items.length <= 1) return;
      items.splice(idx, 1);
      updateSectionData(section.id, { items });
    }
  };

  return (
    <SectionWrapper sectionId={section.id} label="Kỹ năng">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Kỹ năng"} />
        <div className="pl-1 text-[12.5px]">
          {mainSkills.length > 0 && (
            <div className="flex gap-4 mb-3">
              <span className="font-bold text-gray-700 w-14 shrink-0 pt-0.5">Chính</span>
              <ul className="list-disc ml-4 space-y-0.5 flex-1">
                {mainSkills.map((item) => (
                  <li key={item.id} className="group/item relative">
                    <InlineText value={item.name} onChange={(v) => updateItem(item.id, "name", v)} placeholder="Tên kỹ năng" />
                    <button
                      type="button"
                      title="Xóa kỹ năng"
                      onClick={(e) => { e.stopPropagation(); removeByGlobalIndex(item.id); }}
                      className="absolute -right-4 top-0.5 size-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity print:hidden"
                    >
                      <X size={8} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {otherSkills.length > 0 && (
            <div className="flex gap-4">
              <span className="font-bold text-gray-700 w-14 shrink-0 pt-0.5">Khác</span>
              <ul className="list-disc ml-4 space-y-0.5 flex-1">
                {otherSkills.map((item) => (
                  <li key={item.id} className="group/item relative">
                    <InlineText value={item.name} onChange={(v) => updateItem(item.id, "name", v)} placeholder="Tên kỹ năng" />
                    <button
                      type="button"
                      title="Xóa kỹ năng"
                      onClick={(e) => { e.stopPropagation(); removeByGlobalIndex(item.id); }}
                      className="absolute -right-4 top-0.5 size-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity print:hidden"
                    >
                      <X size={8} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <AddItemBtn sectionId={section.id} label="Thêm kỹ năng" />
      </div>
    </SectionWrapper>
  );
}

/* ── Awards ─────────────────────────────────────────── */
function AwardSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as AwardListSectionData;

  const updateItem = (items: typeof data.items, index: number, field: string, value: unknown) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateSectionData(section.id, { items: newItems });
  };

  return (
    <SectionWrapper sectionId={section.id} label="Giải thưởng">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Giải thưởng"} />
        {data.items.length > 0 && (
          <div className="text-[12px] text-gray-700 mb-2 pl-1 leading-relaxed">
            <InlineRichText
              value={data.items[0].description || ""}
              onChange={(v) => updateItem(data.items, 0, "description", v)}
              placeholder="Tóm tắt giải thưởng..."
            />
          </div>
        )}
        <div className="space-y-2.5 pl-1">
          {data.items.map((item, idx) => (
            <div key={item.id} className="group/item relative grid grid-cols-[80px_1fr] gap-x-4 text-[12.5px]">
              <RemoveItemBtn sectionId={section.id} index={idx} />
              <div className="font-bold text-gray-900">
                <InlineText value={item.date} onChange={(v) => updateItem(data.items, idx, "date", v)} placeholder="MM/YYYY" />
              </div>
              <div>
                <div className="font-bold text-gray-900">
                  <InlineText value={item.title} onChange={(v) => updateItem(data.items, idx, "title", v)} placeholder="Tên giải thưởng" />
                </div>
                {item.issuer && (
                  <div className="text-gray-500 text-[11.5px]">
                    <InlineText value={item.issuer} onChange={(v) => updateItem(data.items, idx, "issuer", v)} placeholder="Đơn vị trao" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <AddItemBtn sectionId={section.id} label="Thêm giải thưởng" />
      </div>
    </SectionWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROJECT BLOCK — Table-style layout
   ═══════════════════════════════════════════════════════════ */
interface ProjectBlockProps {
  item: {
    id: string;
    name: string;
    role: string;
    startDate: string;
    endDate: string | "Present";
    description: string;
    technologies: string;
    customer?: string;
    teamSize?: number;
  };
  idx: number;
  sectionId: string;
  allItems: unknown[];
  updateListItem: (sectionId: string, items: unknown[], index: number, field: string, value: unknown) => void;
}

const ProjectBlock = ({ item, idx, sectionId, allItems, updateListItem }: ProjectBlockProps) => {
  const techLines = item.technologies.split("\n").filter(Boolean);

  return (
    <div className="group/item relative text-[12.5px]">
      <RemoveItemBtn sectionId={sectionId} index={idx} />

      <div className="font-bold text-[13px] text-gray-900 uppercase mb-0.5">
        <InlineText value={item.name} onChange={(v) => updateListItem(sectionId, allItems, idx, "name", v)} placeholder="TÊN DỰ ÁN" />
      </div>
      <div className="text-[11.5px] text-gray-500 mb-2">
        (<InlineText value={item.startDate} onChange={(v) => updateListItem(sectionId, allItems, idx, "startDate", v)} placeholder="MM/YYYY" />
        {" – "}
        <InlineText value={typeof item.endDate === "string" ? item.endDate : "Present"} onChange={(v) => updateListItem(sectionId, allItems, idx, "endDate", v)} placeholder="Hiện tại" />)
      </div>

      <table className="w-full border-collapse text-[12px]">
        <tbody>
          <tr>
            <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 bg-gray-50 w-35 align-top">Khách hàng</td>
            <td className="border border-gray-300 px-3 py-1.5">
              <InlineText value={item.customer || ""} onChange={(v) => updateListItem(sectionId, allItems, idx, "customer", v)} placeholder="Tên khách hàng" />
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 bg-gray-50 align-top">Mô tả</td>
            <td className="border border-gray-300 px-3 py-1.5">
              <InlineText value={item.description} onChange={(v) => updateListItem(sectionId, allItems, idx, "description", v)} placeholder="Mô tả dự án" />
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 bg-gray-50 align-top">Số thành viên</td>
            <td className="border border-gray-300 px-3 py-1.5">{item.teamSize ?? 1}</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 bg-gray-50 align-top">Vị trí</td>
            <td className="border border-gray-300 px-3 py-1.5">
              <InlineText value={item.role} onChange={(v) => updateListItem(sectionId, allItems, idx, "role", v)} placeholder="Vị trí của bạn" />
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 bg-gray-50 align-top">Trách nhiệm</td>
            <td className="border border-gray-300 px-3 py-1.5 whitespace-pre-wrap">
              <InlineRichText value={item.description} onChange={(v) => updateListItem(sectionId, allItems, idx, "description", v)} placeholder="- Trách nhiệm 1" />
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-700 bg-gray-50 align-top">Công nghệ sử dụng</td>
            <td className="border border-gray-300 px-3 py-1.5">
              {techLines.length > 0 ? (
                <div className="space-y-0.5">
                  {techLines.map((line, i) => (
                    <div key={i} className="text-[12px]">- {line.replace(/^-\s*/, "")}</div>
                  ))}
                </div>
              ) : (
                <InlineRichText value={item.technologies} onChange={(v) => updateListItem(sectionId, allItems, idx, "technologies", v)} placeholder="- Frontend: React" />
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/* ── Projects ──────────────────────────────────────── */
function ProjectSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as ProjectListSectionData;

  const updateItem = (_sectionId: string, items: unknown[], index: number, field: string, value: unknown) => {
    const newItems = [...items] as Record<string, unknown>[];
    newItems[index] = { ...newItems[index], [field]: value };
    updateSectionData(section.id, { items: newItems });
  };

  return (
    <SectionWrapper sectionId={section.id} label="Dự án">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Dự án"} />
        <div className="space-y-4">
          {data.items.map((item, idx) => (
            <ProjectBlock
              key={item.id}
              item={item}
              idx={idx}
              sectionId={section.id}
              allItems={data.items}
              updateListItem={updateItem}
            />
          ))}
        </div>
        <AddItemBtn sectionId={section.id} label="Thêm dự án" />
      </div>
    </SectionWrapper>
  );
}

/* ── Certificates ──────────────────────────────────── */
function CertificateSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as CertificateListSectionData;

  const updateItem = (items: typeof data.items, index: number, field: string, value: unknown) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateSectionData(section.id, { items: newItems });
  };

  return (
    <SectionWrapper sectionId={section.id} label="Chứng chỉ">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Chứng chỉ"} />
        <div className="space-y-2 pl-1">
          {data.items.map((item, idx) => (
            <div key={item.id} className="group/item relative grid grid-cols-[80px_1fr] gap-x-4 text-[12.5px]">
              <RemoveItemBtn sectionId={section.id} index={idx} />
              <div className="font-bold text-gray-900">
                <InlineText value={item.date} onChange={(v) => updateItem(data.items, idx, "date", v)} placeholder="MM/YYYY" />
              </div>
              <div>
                <div className="font-bold text-gray-900">
                  <InlineText value={item.name} onChange={(v) => updateItem(data.items, idx, "name", v)} placeholder="Tên chứng chỉ" />
                </div>
                <div className="text-gray-500 text-[11.5px]">
                  <InlineText value={item.issuer} onChange={(v) => updateItem(data.items, idx, "issuer", v)} placeholder="Đơn vị cấp" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <AddItemBtn sectionId={section.id} label="Thêm chứng chỉ" />
      </div>
    </SectionWrapper>
  );
}

/* ── Custom Text ───────────────────────────────────── */
function CustomTextSection({ section }: { section: CVSection }) {
  const { updateSectionData } = useCVStore();
  const data = section.data as { text?: string };

  return (
    <SectionWrapper sectionId={section.id} label="Tùy chỉnh">
      <div className="mb-3">
        <SectionTitle sectionId={section.id} title={section.title || "Mục tùy chỉnh"} />
        <div className="text-[12.5px] leading-relaxed pl-1">
          <InlineRichText
            value={data.text || ""}
            onChange={(v) => updateSectionData(section.id, { text: v })}
            placeholder="Nhập nội dung..."
          />
        </div>
      </div>
    </SectionWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION RENDERER — dispatches to the right component
   ═══════════════════════════════════════════════════════════ */
function RenderSection({ section, allSections }: { section: CVSection; allSections: CVSection[] }) {
  if (!section.isVisible) return null;

  switch (section.type) {
    case "header":
      return <HeaderSection section={section} />;
    case "personal_info": {
      const headerSection = allSections.find((s) => s.type === "header");
      return <PersonalInfoSection section={section} headerSection={headerSection} />;
    }
    case "summary":
      return <SummarySection section={section} />;
    case "experience_list":
      return <ExperienceSection section={section} />;
    case "education_list":
      return <EducationSection section={section} />;
    case "skill_list":
      return <SkillSection section={section} />;
    case "award_list":
      return <AwardSection section={section} />;
    case "project_list":
      return <ProjectSection section={section} />;
    case "certificate_list":
      return <CertificateSection section={section} />;
    case "custom_text":
      return <CustomTextSection section={section} />;
    default:
      return (
        <SectionWrapper sectionId={section.id} label={section.type}>
          <div className="mb-3 p-3 border border-dashed border-gray-300 rounded text-sm text-gray-400 italic">
            Mục chưa được hỗ trợ: {section.type}
          </div>
        </SectionWrapper>
      );
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN TEMPLATE — Dynamic section rendering
   ═══════════════════════════════════════════════════════════ */
export const GreenModernTemplate = () => {
  const { cv, setSelectedSection } = useCVStore();
  const sections = cv.sections;

  return (
    <div className="cv-f8-green bg-white" onClick={() => setSelectedSection(null)}>
      {/* Single continuous page (auto-paginated for print) */}
      <div className="cv-page relative">
        {sections.map((section) => (
          <RenderSection key={section.id} section={section} allSections={sections} />
        ))}

        {/* Add Section Button */}
        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          <AddSectionButton />
        </div>
      </div>
    </div>
  );
};

export default GreenModernTemplate;