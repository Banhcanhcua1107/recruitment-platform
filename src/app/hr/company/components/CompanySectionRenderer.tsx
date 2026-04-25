"use client";

import { Fragment } from "react";
import { ImageUploadField } from "@/components/recruitment/ImageUploadField";
import type {
  CompanyInfoContent,
  CompanyIntroContent,
  CompanySection,
  ContactsContent,
  OperationsContent,
  RecruitmentOverviewContent,
  VisionMissionContent,
  WorkplaceContent,
} from "@/types/company-profile";
import { useCompanyProfileBuilder } from "../stores/companyProfileBuilderStore";
import CompanySectionCard from "./CompanySectionCard";

interface CompanySectionRendererProps {
  section: CompanySection;
  readOnly?: boolean;
}

function normalizeLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function linesToText(items: string[]) {
  return items.join("\n");
}

function FieldLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {children}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </label>
  );
}

function fieldClassName(multiline = false) {
  return `${multiline ? "min-h-[132px] resize-y" : ""} w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10`;
}

function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
      >
        <span className="material-symbols-outlined text-[18px]">check</span>
        Xong
      </button>
    </div>
  );
}

function EmptyReadOnlyMessage({ message }: { message: string }) {
  return <p className="text-sm font-medium leading-6 text-slate-500">{message}</p>;
}

function InfoGridItem({
  label,
  value,
  isPlaceholder = false,
}: {
  label: string;
  value: string;
  isPlaceholder?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        isPlaceholder
          ? "border-dashed border-slate-200 bg-white"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p
        className={`mt-1.5 text-sm font-semibold leading-6 ${
          isPlaceholder ? "text-slate-400" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-primary/10 bg-primary/6 px-3 py-1.5 text-xs font-bold text-primary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3">
          <span className="mt-1.5 size-2 rounded-full bg-primary" />
          <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
        </div>
      ))}
    </div>
  );
}

export default function CompanySectionRenderer({
  section,
  readOnly = false,
}: CompanySectionRendererProps) {
  const { editingSectionId, setEditingSection, updateSection } = useCompanyProfileBuilder();
  const isEditing = editingSectionId === section.id;

  const renderCompanyInfo = () => {
    const content = section.content as CompanyInfoContent;

    if (readOnly || !isEditing) {
      const hasData =
        content.companyName ||
        content.legalName ||
        content.tagline ||
        content.foundedYear;

      if (!hasData) {
        return (
          <EmptyReadOnlyMessage message="Chua co thong tin nhan dien cong ty. Hay bo sung ten, logo va hinh anh de trang preview ro rang hon." />
        );
      }

      return (
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {[
            {
              label: "Ten hien thi",
              value: content.companyName,
            },
            {
              label: "Ten phap ly",
              value: content.legalName,
            },
            {
              label: "Nam thanh lap",
              value: content.foundedYear,
            },
            {
              label: "Tagline",
              value: content.tagline,
              fullWidth: true,
            },
          ].map((item) => (
            <div key={item.label} className={item.fullWidth ? "sm:col-span-2" : ""}>
              <InfoGridItem
                label={item.label}
                value={item.value || "Chua cap nhat"}
                isPlaceholder={!item.value}
              />
            </div>
          ))}
        </div>
      );
    }

    const patch = (partial: Partial<CompanyInfoContent>) =>
      updateSection(section.id, { ...content, ...partial });

    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <FieldLabel required>Ten cong ty</FieldLabel>
            <input
              type="text"
              value={content.companyName}
              onChange={(event) => patch({ companyName: event.target.value })}
              placeholder="Vi du: TalentFlow Vietnam"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Ten phap ly</FieldLabel>
            <input
              type="text"
              value={content.legalName}
              onChange={(event) => patch({ legalName: event.target.value })}
              placeholder="Cong ty TNHH TalentFlow Vietnam"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Nam thanh lap</FieldLabel>
            <input
              type="text"
              value={content.foundedYear}
              onChange={(event) => patch({ foundedYear: event.target.value })}
              placeholder="2020"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Tagline</FieldLabel>
            <input
              type="text"
              value={content.tagline}
              onChange={(event) => patch({ tagline: event.target.value })}
              placeholder="Build better hiring journeys with clarity and speed."
              className={fieldClassName()}
            />
          </div>

          <ImageUploadField
            label="Logo cong ty"
            name={`logo-${section.id}`}
            value={content.logoUrl}
            onChange={(value) => patch({ logoUrl: value })}
            placeholder="URL logo cong ty"
            folder="talentflow/company-logos"
          />

          <ImageUploadField
            label="Anh bia cong ty"
            name={`cover-${section.id}`}
            value={content.coverUrl}
            onChange={(value) => patch({ coverUrl: value })}
            placeholder="URL cover cong ty"
            folder="talentflow/company-covers"
          />
        </div>

        <DoneButton onClick={() => setEditingSection(null)} />
      </div>
    );
  };

  const renderCompanyIntro = () => {
    const content = section.content as CompanyIntroContent;

    if (readOnly || !isEditing) {
      if (!content.content.trim()) {
        return (
          <EmptyReadOnlyMessage message="Chua co phan gioi thieu cong ty. Hay mo ta ngoc nhin ve san pham, thi truong va diem khac biet cua doanh nghiep." />
        );
      }

      return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{content.content}</p>;
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <FieldLabel>Gioi thieu cong ty</FieldLabel>
          <textarea
            value={content.content}
            onChange={(event) => updateSection(section.id, { content: event.target.value })}
            placeholder="Mo ta ngan gon ve doanh nghiep, nhom san pham, khach hang muc tieu va cach cong ty dang phat trien."
            className={fieldClassName(true)}
            rows={7}
          />
        </div>
        <DoneButton onClick={() => setEditingSection(null)} />
      </div>
    );
  };

  const renderVisionMission = () => {
    const content = section.content as VisionMissionContent;

    if (readOnly || !isEditing) {
      const hasData = content.vision || content.mission || content.coreValues.length > 0;

      if (!hasData) {
        return (
          <EmptyReadOnlyMessage message="Chua co tam nhin va su menh. Hay bo sung de ung vien hieu duoc huong di va gia tri cot loi cua cong ty." />
        );
      }

      return (
        <div className="space-y-5">
          {content.vision ? <InfoGridItem label="Tam nhin" value={content.vision} /> : null}
          {content.mission ? <InfoGridItem label="Su menh" value={content.mission} /> : null}
          {content.coreValues.length > 0 ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Gia tri cot loi
              </p>
              <div className="mt-3">
                <ChipList items={content.coreValues} />
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    const patch = (partial: Partial<VisionMissionContent>) =>
      updateSection(section.id, { ...content, ...partial });

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <FieldLabel>Tam nhin</FieldLabel>
          <textarea
            value={content.vision}
            onChange={(event) => patch({ vision: event.target.value })}
            placeholder="Cong ty huong toi dieu gi trong 3-5 nam toi."
            className={fieldClassName(true)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Su menh</FieldLabel>
          <textarea
            value={content.mission}
            onChange={(event) => patch({ mission: event.target.value })}
            placeholder="Gia tri ma doanh nghiep muon tao ra cho khach hang va doi ngu."
            className={fieldClassName(true)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Gia tri cot loi</FieldLabel>
          <textarea
            value={linesToText(content.coreValues)}
            onChange={(event) => patch({ coreValues: normalizeLines(event.target.value) })}
            placeholder={"Minh bach\nToc do\nLai nghe"}
            className={fieldClassName(true)}
            rows={4}
          />
          <p className="text-xs text-slate-500">Moi dong mot gia tri cot loi.</p>
        </div>

        <DoneButton onClick={() => setEditingSection(null)} />
      </div>
    );
  };

  const renderOperations = () => {
    const content = section.content as OperationsContent;

    if (readOnly || !isEditing) {
      const hasData =
        content.industries.length > 0 ||
        content.companySize ||
        content.headquarters ||
        content.regions.length > 0;

      if (!hasData) {
        return (
          <EmptyReadOnlyMessage message="Chua co thong tin linh vuc hoat dong va quy mo. Hay bo sung de ho so cong ty phu hop voi context tuyen dung." />
        );
      }

      return (
        <div className="space-y-5">
          <div className="grid content-start gap-4 md:grid-cols-2">
            {content.companySize ? <InfoGridItem label="Quy mo cong ty" value={content.companySize} /> : null}
            {content.headquarters ? <InfoGridItem label="Tru so / khu vuc chinh" value={content.headquarters} /> : null}
          </div>

          {content.industries.length > 0 ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Linh vuc hoat dong
              </p>
              <div className="mt-3">
                <ChipList items={content.industries} />
              </div>
            </div>
          ) : null}

          {content.regions.length > 0 ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Khu vuc van hanh
              </p>
              <div className="mt-3">
                <BulletList items={content.regions} />
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    const patch = (partial: Partial<OperationsContent>) =>
      updateSection(section.id, { ...content, ...partial });

    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Linh vuc hoat dong</FieldLabel>
            <textarea
              value={linesToText(content.industries)}
              onChange={(event) => patch({ industries: normalizeLines(event.target.value) })}
              placeholder={"SaaS tuyển dụng\nHR Tech\nB2B Software"}
              className={fieldClassName(true)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Quy mo cong ty</FieldLabel>
            <input
              type="text"
              value={content.companySize}
              onChange={(event) => patch({ companySize: event.target.value })}
              placeholder="Vi du: 50 - 200 nhan su"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Tru so / khu vuc chinh</FieldLabel>
            <input
              type="text"
              value={content.headquarters}
              onChange={(event) => patch({ headquarters: event.target.value })}
              placeholder="Quan 1, TP. Ho Chi Minh"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Khu vuc van hanh</FieldLabel>
            <textarea
              value={linesToText(content.regions)}
              onChange={(event) => patch({ regions: normalizeLines(event.target.value) })}
              placeholder={"TP. Ho Chi Minh\nHa Noi\nLam viec hybrid toan quoc"}
              className={fieldClassName(true)}
              rows={4}
            />
            <p className="text-xs text-slate-500">Moi dong mot khu vuc hoac cum van hanh.</p>
          </div>
        </div>

        <DoneButton onClick={() => setEditingSection(null)} />
      </div>
    );
  };

  const renderContacts = () => {
    const content = section.content as ContactsContent;

    if (readOnly || !isEditing) {
      const items = [
        ["Website", content.website],
        ["Email", content.email],
        ["So dien thoai", content.phone],
        ["Dia chi", content.address],
        ["Dau moi tuyen dung", content.recruitmentContact],
      ].filter((item) => item[1]);

      if (items.length === 0) {
        return (
          <EmptyReadOnlyMessage message="Chua co thong tin website va lien he. Hay bo sung de HR team va ung vien co diem cham ro rang." />
        );
      }

      return (
        <div className="grid content-start gap-4 md:grid-cols-2">
          {items.map(([label, value]) => (
            <InfoGridItem key={label} label={label} value={value} />
          ))}
        </div>
      );
    }

    const patch = (partial: Partial<ContactsContent>) =>
      updateSection(section.id, { ...content, ...partial });

    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>Website</FieldLabel>
          <input
            type="url"
            value={content.website}
            onChange={(event) => patch({ website: event.target.value })}
            placeholder="https://company.com"
            className={fieldClassName()}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel required>Email lien he</FieldLabel>
          <input
            type="email"
            value={content.email}
            onChange={(event) => patch({ email: event.target.value })}
            placeholder="hello@company.com"
            className={fieldClassName()}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>So dien thoai</FieldLabel>
          <input
            type="text"
            value={content.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder="028 1234 5678"
            className={fieldClassName()}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Dau moi tuyen dung</FieldLabel>
          <input
            type="text"
            value={content.recruitmentContact}
            onChange={(event) => patch({ recruitmentContact: event.target.value })}
            placeholder="Talent Acquisition Team - talent@company.com"
            className={fieldClassName()}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FieldLabel>Dia chi / khu vuc</FieldLabel>
          <textarea
            value={content.address}
            onChange={(event) => patch({ address: event.target.value })}
            placeholder="Tang 12, Toa nha ABC, Quan 1, TP. Ho Chi Minh"
            className={fieldClassName(true)}
            rows={4}
          />
        </div>

        <div className="md:col-span-2">
          <DoneButton onClick={() => setEditingSection(null)} />
        </div>
      </div>
    );
  };

  const renderWorkplace = () => {
    const content = section.content as WorkplaceContent;

    if (readOnly || !isEditing) {
      const hasData =
        content.benefits.length > 0 || content.environment || content.cultureHighlights.length > 0;

      if (!hasData) {
        return (
          <EmptyReadOnlyMessage message="Chua co noi dung ve phuc loi va van hoa. Hay viet ro nhung trai nghiem ma doanh nghiep mang lai cho nhan su." />
        );
      }

      return (
        <div className="space-y-5">
          {content.benefits.length > 0 ? (
            <Fragment>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Phuc loi</p>
              <BulletList items={content.benefits} />
            </Fragment>
          ) : null}

          {content.environment ? <InfoGridItem label="Moi truong lam viec" value={content.environment} /> : null}

          {content.cultureHighlights.length > 0 ? (
            <Fragment>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Van hoa cong ty</p>
              <ChipList items={content.cultureHighlights} />
            </Fragment>
          ) : null}
        </div>
      );
    }

    const patch = (partial: Partial<WorkplaceContent>) =>
      updateSection(section.id, { ...content, ...partial });

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <FieldLabel>Phuc loi / che do</FieldLabel>
          <textarea
            value={linesToText(content.benefits)}
            onChange={(event) => patch({ benefits: normalizeLines(event.target.value) })}
            placeholder={"Bao hiem suc khoe\nHybrid 3 ngay/tu an toan\nNgan sach hoc tap hang nam"}
            className={fieldClassName(true)}
            rows={5}
          />
          <p className="text-xs text-slate-500">Moi dong mot phuc loi hoac chinh sach noi bat.</p>
        </div>

        <div className="space-y-2">
          <FieldLabel>Moi truong lam viec</FieldLabel>
          <textarea
            value={content.environment}
            onChange={(event) => patch({ environment: event.target.value })}
            placeholder="Mo ta cach doi ngu hop tac, cach van hanh va trai nghiem lam viec hang ngay."
            className={fieldClassName(true)}
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Van hoa cong ty</FieldLabel>
          <textarea
            value={linesToText(content.cultureHighlights)}
            onChange={(event) => patch({ cultureHighlights: normalizeLines(event.target.value) })}
            placeholder={"Open feedback\nOwnership cao\nRa quyet dinh nhanh"}
            className={fieldClassName(true)}
            rows={4}
          />
        </div>

        <DoneButton onClick={() => setEditingSection(null)} />
      </div>
    );
  };

  const renderRecruitmentOverview = () => {
    const content = section.content as RecruitmentOverviewContent;

    if (readOnly || !isEditing) {
      const hasData =
        content.hiringFocus ||
        content.workModel ||
        content.hiringProcess.length > 0 ||
        content.talentMessage;

      if (!hasData) {
        return (
          <EmptyReadOnlyMessage message="Chua co tong quan tuyen dung. Hay bo sung nhu cau hiring focus, model lam viec va thong diep gui toi ung vien." />
        );
      }

      return (
        <div className="space-y-5">
          <div className="grid content-start gap-4 md:grid-cols-2">
            {content.hiringFocus ? <InfoGridItem label="Hiring focus" value={content.hiringFocus} /> : null}
            {content.workModel ? <InfoGridItem label="Mo hinh lam viec" value={content.workModel} /> : null}
          </div>

          {content.hiringProcess.length > 0 ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Quy trinh tuyen dung
              </p>
              <div className="mt-3">
                <BulletList items={content.hiringProcess} />
              </div>
            </div>
          ) : null}

          {content.talentMessage ? (
            <InfoGridItem label="Thong diep gui ung vien" value={content.talentMessage} />
          ) : null}
        </div>
      );
    }

    const patch = (partial: Partial<RecruitmentOverviewContent>) =>
      updateSection(section.id, { ...content, ...partial });

    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Hiring focus</FieldLabel>
            <input
              type="text"
              value={content.hiringFocus}
              onChange={(event) => patch({ hiringFocus: event.target.value })}
              placeholder="Tuyen ky su san pham, growth va business operations"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Mo hinh lam viec</FieldLabel>
            <input
              type="text"
              value={content.workModel}
              onChange={(event) => patch({ workModel: event.target.value })}
              placeholder="Onsite / Hybrid / Remote"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Quy trinh tuyen dung</FieldLabel>
            <textarea
              value={linesToText(content.hiringProcess)}
              onChange={(event) => patch({ hiringProcess: normalizeLines(event.target.value) })}
              placeholder={"Screen CV\nInterview voi team lead\nInterview culture fit\nOffer"}
              className={fieldClassName(true)}
              rows={5}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <FieldLabel>Thong diep gui ung vien</FieldLabel>
            <textarea
              value={content.talentMessage}
              onChange={(event) => patch({ talentMessage: event.target.value })}
              placeholder="Noi dieu cong ty muon ung vien cam nhan khi doc job va company profile."
              className={fieldClassName(true)}
              rows={5}
            />
          </div>
        </div>

        <DoneButton onClick={() => setEditingSection(null)} />
      </div>
    );
  };

  const renderContent = () => {
    switch (section.type) {
      case "company_info":
        return renderCompanyInfo();
      case "company_intro":
        return renderCompanyIntro();
      case "vision_mission":
        return renderVisionMission();
      case "operations":
        return renderOperations();
      case "contacts":
        return renderContacts();
      case "workplace":
        return renderWorkplace();
      case "recruitment_overview":
        return renderRecruitmentOverview();
      default:
        return (
          <EmptyReadOnlyMessage message="Section nay hien chua duoc ho tro trong company profile." />
        );
    }
  };

  return (
    <CompanySectionCard section={section} readOnly={readOnly}>
      {renderContent()}
    </CompanySectionCard>
  );
}
