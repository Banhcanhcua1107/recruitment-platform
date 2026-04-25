'use client';

import { useEffect, useMemo, useState } from 'react';
import { getOrderedProfileSections } from '@/lib/candidate-profile-document';
import AddSectionPanel from './components/AddSectionPanel';
import CompletionCard from './components/CompletionCard';
import EmptyState from './components/EmptyState';
import ProfileHeader from './components/ProfileHeader';
import SectionRenderer from './components/SectionRenderer';
import {
  useProfileBuilder,
  useProfileDocument,
  useProfileLoading,
  useProfilePreviewSource,
  useProfileVisibility,
} from './stores/profileBuilderStore';
import { getSectionMeta, isSectionEmpty, type SectionType } from './types/profile';

type ViewMode = 'edit' | 'preview';

const SECTION_NAV_ORDER: SectionType[] = [
  'personal_info',
  'summary',
  'career_goal',
  'experience',
  'education',
  'skills',
  'certifications',
  'languages',
  'links',
  'projects',
];

function extractText(content: unknown) {
  if (!content || typeof content !== 'object' || !('content' in content)) {
    return '';
  }

  const value = (content as { content?: string }).content;
  return typeof value === 'string' ? value.trim() : '';
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function scrollToSection(sectionId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const element = document.getElementById(`section-${sectionId}`);
  if (!element) {
    return;
  }

  element.scrollIntoView({
    block: 'start',
    behavior: 'smooth',
  });
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-330 space-y-6">
      <div className="h-32 animate-pulse rounded-[28px] bg-slate-200" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="h-64 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-[28px] bg-slate-200" />
          <div className="h-60 animate-pulse rounded-[28px] bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function CandidateProfileBuilderPage() {
  const loadProfile = useProfileBuilder((state) => state.loadProfile);
  const setAddPanelOpen = useProfileBuilder((state) => state.setAddPanelOpen);
  const setEditingSection = useProfileBuilder((state) => state.setEditingSection);
  const setProfileVisibility = useProfileBuilder((state) => state.setProfileVisibility);
  const document = useProfileDocument();
  const previewSource = useProfilePreviewSource();
  const profileVisibility = useProfileVisibility();
  const isLoading = useProfileLoading();
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (viewMode === 'preview') {
      setAddPanelOpen(false);
    }
  }, [setAddPanelOpen, viewMode]);

  const orderedSections = useMemo(() => {
    if (!document) {
      return [];
    }

    return getOrderedProfileSections(document);
  }, [document]);

  const previewSections = useMemo(
    () => orderedSections.filter((section) => !section.isHidden && !isSectionEmpty(section)),
    [orderedSections]
  );

  const sectionChecklist = useMemo(
    () =>
      SECTION_NAV_ORDER.map((type) => {
        const section = orderedSections.find((item) => item.type === type);
        return {
          type,
          section,
          label: getSectionMeta(type)?.name || type,
          isReady: Boolean(section && !section.isHidden && !isSectionEmpty(section)),
        };
      }),
    [orderedSections]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const personalInfoSection = orderedSections.find((section) => section.type === 'personal_info');
  const summarySection = orderedSections.find((section) => section.type === 'summary');
  const careerGoalSection = orderedSections.find((section) => section.type === 'career_goal');
  const personalInfoContent = personalInfoSection?.content as
    | {
        fullName?: string;
        email?: string;
        phone?: string;
        address?: string;
        avatarUrl?: string;
      }
    | undefined;

  const displayName =
    personalInfoContent?.fullName || previewSource?.fullName || 'Ứng viên';
  const displayHeadline =
    previewSource?.headline || 'Bổ sung tiêu đề nghề nghiệp để hồ sơ rõ định hướng hơn.';
  const avatarUrl =
    personalInfoContent?.avatarUrl || previewSource?.avatarUrl || undefined;
  const summaryText = extractText(summarySection?.content || null);
  const careerGoalText = extractText(careerGoalSection?.content || null);
  const bioPreview = truncateText(
    summaryText ||
      'Hãy thêm phần giới thiệu ngắn gọn để nhà tuyển dụng hiểu nhanh về kinh nghiệm, điểm mạnh và mục tiêu của bạn.',
    220
  );
  const completionPercentage =
    sectionChecklist.length === 0
      ? 0
      : Math.round(
          (sectionChecklist.filter((item) => item.isReady).length / sectionChecklist.length) * 100
        );
  const isPublic = profileVisibility === 'public';

  const contactItems = [
    {
      icon: 'mail',
      label: 'Email',
      value: personalInfoContent?.email || previewSource?.email || '',
    },
    {
      icon: 'call',
      label: 'Điện thoại',
      value: personalInfoContent?.phone || previewSource?.phone || '',
    },
    {
      icon: 'location_on',
      label: 'Khu vực',
      value: personalInfoContent?.address || previewSource?.location || '',
    },
  ].filter((item) => item.value);

  const highlightStats = [
    {
      label: 'Mục đã hoàn thiện',
      value: `${sectionChecklist.filter((item) => item.isReady).length}/${sectionChecklist.length || 1}`,
    },
    {
      label: 'Kinh nghiệm hiện có',
      value: String(previewSource?.workExperiences.length || 0),
    },
    {
      label: 'CV liên kết',
      value: previewSource?.cvUrl ? 'Đã có' : 'Chưa có',
    },
  ];

  const handleEditProfile = () => {
    setViewMode('edit');

    if (personalInfoSection) {
      setEditingSection(personalInfoSection.id);
      setTimeout(() => scrollToSection(personalInfoSection.id), 0);
      return;
    }

    setAddPanelOpen(true);
  };

  const primaryEmail = personalInfoContent?.email || previewSource?.email || '';
  const primaryPhone = personalInfoContent?.phone || previewSource?.phone || '';

  if (viewMode === 'preview') {
    return (
      <div className="mx-auto w-full max-w-330 space-y-6 pb-8">
        <ProfileHeader
          userName={displayName}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
          <div className="h-40 bg-[linear-gradient(120deg,#0f172a_0%,#2f5fe8_42%,#38bdf8_100%)] sm:h-52" />

          <div className="px-6 pt-4 pb-6 sm:px-8 sm:pt-5">
            <div className="-mt-8 flex flex-col gap-5 lg:-mt-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-3xl font-black text-slate-700 shadow-lg sm:size-28">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[34px] text-slate-400">person</span>
                  )}
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950">{displayName}</h1>
                  <p className="mt-1 text-base font-semibold text-slate-500">{displayHeadline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {primaryEmail ? (
                  <a
                    href={`mailto:${primaryEmail}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                    Gửi email
                  </a>
                ) : null}

                {primaryPhone ? (
                  <a
                    href={`tel:${primaryPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    Gọi điện
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleEditProfile}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Chỉnh sửa hồ sơ
                </button>
              </div>
            </div>

            {previewSections.length > 0 ? (
              <nav className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                {previewSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"
                  >
                    {getSectionMeta(section.type)?.name || section.type}
                  </button>
                ))}
              </nav>
            ) : null}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
              <h2 className="text-2xl font-black text-slate-950">Giới thiệu</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{bioPreview}</p>
            </section>

            <CompletionCard />
          </aside>

          <main className="space-y-6">
            {previewSections.length > 0 ? (
              previewSections.map((section) => (
                <SectionRenderer key={section.id} section={section} readOnly />
              ))
            ) : (
              <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
                <p className="text-lg font-black text-slate-900">Chưa có nội dung để hiển thị.</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                  Chuyển sang chế độ chỉnh sửa để bổ sung thông tin quan trọng cho hồ sơ của bạn.
                </p>
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  Chuyển sang chỉnh sửa
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-330 space-y-6 pb-8">
      <ProfileHeader
        userName={displayName}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="order-2 space-y-6 xl:order-1">
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
            <div className="bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(14,165,233,0.04))] px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[34px] text-slate-400">
                        person
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Tóm tắt hồ sơ
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {displayName}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500 sm:text-base">
                      {displayHeadline}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] ${
                          isPublic
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isPublic ? 'Hồ sơ công khai' : 'Hồ sơ riêng tư'}
                      </span>
                      <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
                        Hoàn thiện {completionPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleEditProfile}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                  >
                    Chỉnh sửa thông tin
                  </button>
                  {previewSource?.cvUrl ? (
                    <a
                      href={previewSource.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
                    >
                      Xem CV liên kết
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {highlightStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <div>
                <p className="text-sm font-medium leading-7 text-slate-600">{bioPreview}</p>
                {careerGoalText ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                      Mục tiêu nghề nghiệp
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-amber-900">
                      {truncateText(careerGoalText, 160)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                {contactItems.length > 0 ? (
                  contactItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">
                          {item.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {item.label}
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium leading-6 text-slate-500">
                    Thêm email, số điện thoại và khu vực để nhà tuyển dụng liên hệ với bạn thuận tiện hơn.
                  </div>
                )}
              </div>
            </div>
          </section>

          {orderedSections.length > 0 ? (
            orderedSections.map((section) => <SectionRenderer key={section.id} section={section} />)
          ) : (
            <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <EmptyState
                variant="page"
                title="Bắt đầu xây dựng hồ sơ"
                description="Thêm những phần cốt lõi như thông tin cá nhân, kinh nghiệm, học vấn và kỹ năng để hồ sơ rõ ràng hơn."
                actionLabel="Thêm mục đầu tiên"
              />
            </div>
          )}
        </main>

        <aside className="order-1 space-y-6 xl:order-2">
          <div className="space-y-6 xl:sticky xl:top-27">
            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Hiển thị hồ sơ
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    {isPublic ? 'Công khai với nhà tuyển dụng' : 'Giữ ở chế độ riêng tư'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileVisibility(isPublic ? 'private' : 'public')}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-primary' : 'bg-slate-300'
                  }`}
                  aria-label="Chuyển trạng thái hiển thị hồ sơ"
                >
                  <span
                    className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                {isPublic
                  ? 'Hồ sơ công khai có thể được hiển thị trong kho ứng viên khi thông tin đã đủ rõ ràng.'
                  : 'Khi để riêng tư, hồ sơ sẽ không xuất hiện trong các bề mặt tìm kiếm công khai.'}
              </p>
            </section>

            <CompletionCard />

            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Điều hướng nhanh
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">Các mục trong hồ sơ</h3>
                </div>
                {viewMode === 'edit' ? (
                  <button
                    type="button"
                    onClick={() => setAddPanelOpen(true)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:border-primary hover:text-primary"
                  >
                    Thêm
                  </button>
                ) : null}
              </div>

              <div className="mt-4 space-y-2">
                {sectionChecklist.map((item) => {
                  const isVisibleInCurrentMode = Boolean(item.section);

                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={!item.section}
                      onClick={() => {
                        if (!item.section) {
                          return;
                        }

                        setEditingSection(item.section.id);

                        setTimeout(() => scrollToSection(item.section!.id), 0);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        item.section
                          ? isVisibleInCurrentMode
                            ? 'border-slate-200 bg-white text-slate-700 hover:border-primary/20 hover:bg-slate-50'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-primary/20'
                          : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${
                          item.isReady
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.section
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {item.isReady ? 'check' : item.section ? 'edit_note' : 'add'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className="text-xs font-medium text-slate-400">
                          {item.isReady
                            ? 'Đã sẵn sàng'
                            : item.section
                              ? 'Cần bổ sung thêm'
                              : 'Chưa thêm mục'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {viewMode === 'edit' ? <AddSectionPanel /> : null}
    </div>
  );
}
