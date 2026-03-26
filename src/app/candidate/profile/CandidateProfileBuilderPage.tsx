'use client';

import { useEffect, useMemo, useState } from 'react';
import CandidateProfilePreview from '@/components/candidate/CandidateProfilePreview';
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
} from './stores/profileBuilderStore';
import { getOrderedProfileSections } from '@/lib/candidate-profile-document';

type ViewMode = 'edit' | 'preview';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1360px] space-y-6 px-6 py-8 lg:px-10">
        <div className="h-20 animate-pulse rounded-[24px] bg-slate-200" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="h-64 animate-pulse rounded-[24px] bg-slate-200" />
            <div className="h-64 animate-pulse rounded-[24px] bg-slate-200" />
          </div>
          <div className="h-56 animate-pulse rounded-[24px] bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function CandidateProfileBuilderPage() {
  const loadProfile = useProfileBuilder((state) => state.loadProfile);
  const setAddPanelOpen = useProfileBuilder((state) => state.setAddPanelOpen);
  const document = useProfileDocument();
  const previewSource = useProfilePreviewSource();
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

  const personalInfoSection = orderedSections.find((section) => section.type === 'personal_info');
  const personalInfoContent = personalInfoSection?.content as
    | {
        fullName?: string;
        avatarUrl?: string;
      }
    | undefined;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const displayName =
    personalInfoContent?.fullName || previewSource?.fullName || 'ung vien';
  const avatarUrl = personalInfoContent?.avatarUrl || previewSource?.avatarUrl || undefined;

  return (
    <div
      className={
        viewMode === 'preview'
          ? 'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_24%,#f8fafc_100%)] pb-14'
          : 'min-h-screen bg-slate-50 pb-12'
      }
    >
      <ProfileHeader
        userName={displayName}
        avatarUrl={avatarUrl}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'preview' ? (
        <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-8 lg:px-10">
          {document ? (
            <CandidateProfilePreview
              document={document}
              avatarUrl={previewSource?.avatarUrl || null}
              headline={previewSource?.headline || ''}
              fullName={previewSource?.fullName || ''}
              email={previewSource?.email || ''}
              phone={previewSource?.phone || ''}
              location={previewSource?.location || ''}
              cvUrl={previewSource?.cvUrl || null}
              updatedAt={previewSource?.updatedAt || document.meta.updatedAt || null}
              workExperiences={previewSource?.workExperiences || []}
            />
          ) : null}
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-[1360px] px-6 py-8 lg:px-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <main className="space-y-6">
                {orderedSections.length > 0 ? (
                  orderedSections.map((section) => (
                    <SectionRenderer key={section.id} section={section} />
                  ))
                ) : (
                  <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                    <EmptyState
                      variant="page"
                      title="Bat dau xay dung ho so"
                      description="Chi nhung phan ban them va co du lieu moi hien thi tren ho so public. Hay them cac muc quan trong truoc de hoan thien ho so."
                      actionLabel="Them thanh phan"
                    />
                  </div>
                )}
              </main>

              <aside className="space-y-6">
                <CompletionCard />
              </aside>
            </div>
          </div>

          <AddSectionPanel />
        </>
      )}
    </div>
  );
}
