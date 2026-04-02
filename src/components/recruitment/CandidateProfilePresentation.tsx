import type { ReactNode } from "react";
import { formatDateRange, formatProfileUpdatedAt } from "@/lib/candidate-profile-shared";
import type { PublicProfileViewModel } from "@/lib/candidate-profile-document";
import type { PublicCandidateSearchResult } from "@/types/candidate-profile";
import { RecruiterContactCandidateButton } from "@/components/hr/RecruiterContactCandidateButton";
import { getSectionMeta, type Section } from "@/app/candidate/profile/types/profile";

function createInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function scrollToPublicSection(sectionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const element = document.getElementById(`section-${sectionId}`);
  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

function InfoPill({
  icon,
  value,
}: {
  icon: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
      <span className="material-symbols-outlined text-base">{icon}</span>
      {value}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
        <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </section>
  );
}

function renderPublicSection(section: Section) {
  const meta = getSectionMeta(section.type);

  switch (section.type) {
    case "summary":
    case "career_goal": {
      const content = section.content as { content?: string };
      if (!content.content?.trim()) {
        return null;
      }

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">{content.content}</p>
        </SectionCard>
      );
    }

    case "skills": {
      const content = section.content as {
        skills: Array<{ id: string; name: string; category?: string }>;
      };
      if (!content.skills.length) {
        return null;
      }

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="flex flex-wrap gap-3">
            {content.skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </SectionCard>
      );
    }

    case "languages": {
      const content = section.content as {
        languages: Array<{
          id: string;
          name: string;
          level: "beginner" | "intermediate" | "advanced" | "native";
          certification?: string;
        }>;
      };

      const levelLabels: Record<string, string> = {
        beginner: "Cơ bản",
        intermediate: "Trung cấp",
        advanced: "Nâng cao",
        native: "Bản ngữ",
      };

      const levelPercent: Record<string, number> = {
        beginner: 25,
        intermediate: 50,
        advanced: 75,
        native: 100,
      };

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="space-y-6">
            {content.languages.map((language) => (
              <div key={language.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{language.name}</p>
                    {language.certification ? (
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        {language.certification}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-slate-500">
                    {levelLabels[language.level] || language.level}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${levelPercent[language.level] ?? 50}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    }

    case "experience": {
      const content = section.content as {
        items: Array<{
          id: string;
          title: string;
          company: string;
          startDate: string;
          endDate?: string;
          isCurrent: boolean;
          description: string[];
        }>;
      };

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="space-y-6">
            {content.items.map((item) => (
              <article key={item.id} className="relative pl-8">
                <div className="absolute left-0 top-2 h-full w-px bg-slate-200" />
                <div className="absolute left-[-7px] top-2 size-4 rounded-full border-4 border-white bg-primary shadow" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                      <p className="text-sm font-semibold text-slate-600">{item.company}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {formatDateRange(item.startDate, item.endDate, item.isCurrent)}
                    </span>
                  </div>
                  {item.description.length > 0 ? (
                    <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                      {item.description.map((entry, index) => (
                        <li key={`${item.id}-${index}`}>{entry}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      );
    }

    case "education": {
      const content = section.content as {
        items: Array<{
          id: string;
          school: string;
          degree: string;
          major: string;
          startYear?: number;
          endYear?: number;
          gpa?: string;
        }>;
      };

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="space-y-6">
            {content.items.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{item.school}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {[item.degree, item.major].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                  {item.startYear || item.endYear ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {[item.startYear, item.endYear || "Hiện tại"].filter(Boolean).join(" - ")}
                    </span>
                  ) : null}
                </div>
                {item.gpa ? (
                  <p className="mt-3 text-sm font-medium text-slate-500">GPA: {item.gpa}</p>
                ) : null}
              </article>
            ))}
          </div>
        </SectionCard>
      );
    }

    case "projects": {
      const content = section.content as {
        items: Array<{
          id: string;
          name: string;
          description: string;
          technologies: string[];
          url?: string;
          startDate?: string;
          endDate?: string;
        }>;
      };

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="space-y-6">
            {content.items.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{item.name}</h3>
                    {item.startDate || item.endDate ? (
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {[item.startDate, item.endDate].filter(Boolean).join(" - ")}
                      </p>
                    ) : null}
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Xem dự án
                    </a>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                ) : null}
                {item.technologies.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.technologies.map((technology, index) => (
                      <span
                        key={`${item.id}-${technology}-${index}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </SectionCard>
      );
    }

    case "certifications": {
      const content = section.content as {
        items: Array<{
          id: string;
          name: string;
          issuer: string;
          issueDate: string;
          expiryDate?: string;
          url?: string;
        }>;
      };

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="space-y-4">
            {content.items.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{item.name}</h3>
                    <p className="text-sm font-semibold text-slate-600">{item.issuer}</p>
                    {item.issueDate ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Cấp ngày {item.issueDate}
                        {item.expiryDate ? ` • Hết hạn ${item.expiryDate}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Xem chứng chỉ
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      );
    }

    case "links": {
      const content = section.content as {
        items: Array<{
          id: string;
          url: string;
          label?: string;
          type: string;
        }>;
      };

      return (
        <SectionCard
          key={section.id}
          title={meta?.name || section.type}
          description={meta?.description}
        >
          <div className="space-y-3">
            {content.items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary/30 hover:text-primary"
              >
                <span>{item.label || item.type || item.url}</span>
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            ))}
          </div>
        </SectionCard>
      );
    }

    default:
      return null;
  }
}

export function CandidateProfilePresentation({
  viewModel,
  candidate,
}: {
  viewModel: PublicProfileViewModel;
  candidate?: PublicCandidateSearchResult;
}) {
  const {
    mainSections,
    displayName,
    displayHeadline,
    displayEmail,
    displayPhone,
    displayLocation,
    avatarUrl,
    cvUrl,
    updatedAt,
    hasContactCard,
    currentExperience,
  } = viewModel;

  return (
    <>
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="h-40 bg-[linear-gradient(120deg,#0f172a_0%,#2f5fe8_42%,#38bdf8_100%)] sm:h-52" />
        <div className="px-6 pt-4 pb-6 sm:px-8 sm:pt-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="-mt-10 flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-3xl font-black text-slate-700 shadow-lg sm:-mt-12 sm:size-28">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  createInitials(displayName || "UV")
                )}
              </div>

              <div className="space-y-3 pt-1 sm:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {displayName}
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    Công khai
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-700 sm:text-xl">{displayHeadline}</p>
                  {currentExperience?.company ? (
                    <p className="text-sm font-medium text-slate-500 sm:text-base">
                      {currentExperience.company}
                    </p>
                  ) : null}
                  {hasContactCard ? (
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      {displayLocation ? <InfoPill icon="location_on" value={displayLocation} /> : null}
                      {displayEmail ? <InfoPill icon="mail" value={displayEmail} /> : null}
                      {displayPhone ? <InfoPill icon="call" value={displayPhone} /> : null}
                    </div>
                  ) : null}
                </div>

                <p className="text-sm text-slate-500">
                  Cập nhật lần cuối: {formatProfileUpdatedAt(updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:self-start">
              {candidate ? (
                <RecruiterContactCandidateButton
                  candidateId={candidate.candidateId}
                  candidateName={candidate.fullName || displayName}
                  candidateEmail={candidate.email || displayEmail}
                  label="Gửi email"
                  variant="outline"
                />
              ) : displayEmail ? (
                <a
                  href={`mailto:${displayEmail}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-lg">mail</span>
                  Gửi email
                </a>
              ) : null}
              {displayPhone ? (
                <a
                  href={`tel:${displayPhone.replace(/\s+/g, "")}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-lg">call</span>
                  Gọi điện
                </a>
              ) : null}
              {cvUrl ? (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  <span className="material-symbols-outlined text-lg">description</span>
                  Xem CV
                </a>
              ) : null}
            </div>
          </div>

          {mainSections.length > 0 ? (
            <nav className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
              {mainSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToPublicSection(section.id)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
                >
                  {getSectionMeta(section.type)?.name || section.type}
                </button>
              ))}
            </nav>
          ) : null}
        </div>
      </section>

      {mainSections.length > 0 || hasContactCard || cvUrl ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            {mainSections.map((section) => (
              <div key={section.id} id={`section-${section.id}`}>
                {renderPublicSection(section)}
              </div>
            ))}
          </div>

          {hasContactCard || cvUrl ? (
            <aside className="space-y-6">
              {hasContactCard ? (
                <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black text-slate-900">Thông tin liên hệ</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Nhà tuyển dụng chỉ thấy các thông tin mà ứng viên đã bật hiển thị và đã cập nhật.
                  </p>
                  <div className="mt-5 space-y-4 text-sm text-slate-600">
                    {displayEmail ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
                        <p className="mt-2 font-semibold text-slate-900">{displayEmail}</p>
                      </div>
                    ) : null}
                    {displayPhone ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Số điện thoại
                        </p>
                        <p className="mt-2 font-semibold text-slate-900">{displayPhone}</p>
                      </div>
                    ) : null}
                    {displayLocation ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Địa điểm
                        </p>
                        <p className="mt-2 font-semibold text-slate-900">{displayLocation}</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {cvUrl ? (
                <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black text-slate-900">CV / Hồ sơ đính kèm</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Tải về hoặc xem nhanh hồ sơ đính kèm mà ứng viên đang công khai.
                  </p>
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-sm font-semibold text-primary hover:underline"
                    >
                      Mở CV của ứng viên
                    </a>
                  </div>
                </section>
              ) : null}
            </aside>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
