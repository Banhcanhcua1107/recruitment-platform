'use client';

import { useEffect } from 'react';
import { useProfileBuilder } from '../stores/profileBuilderStore';

interface ProfileHeaderProps {
  userName?: string;
  avatarUrl?: string;
  viewMode?: 'edit' | 'preview';
  onViewModeChange?: (mode: 'edit' | 'preview') => void;
}

export default function ProfileHeader({
  userName = 'Nguoi dung',
  avatarUrl,
  viewMode = 'edit',
  onViewModeChange,
}: ProfileHeaderProps) {
  const {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error,
    setAddPanelOpen,
  } = useProfileBuilder();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const getSaveStatusText = () => {
    if (error) return error;
    if (isSaving) return 'Dang luu...';
    if (lastSaved) {
      const time = lastSaved.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `Da luu luc ${time}`;
    }
    if (hasUnsavedChanges) return 'Chua luu';
    return 'Tu dong luu';
  };

  const getSaveStatusColor = () => {
    if (error) return 'text-red-500';
    if (isSaving || hasUnsavedChanges) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto max-w-[1360px] px-6 py-4 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="size-12 overflow-hidden rounded-2xl bg-slate-100">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Ho so cua {userName}</h1>
              <div className={`flex items-center gap-2 text-sm font-medium ${getSaveStatusColor()}`}>
                {isSaving ? (
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                ) : error ? (
                  <span className="material-symbols-outlined text-base">error</span>
                ) : (
                  <span className="material-symbols-outlined text-base">cloud_done</span>
                )}
                {getSaveStatusText()}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onViewModeChange ? (
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
                {(['edit', 'preview'] as const).map((mode) => {
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onViewModeChange(mode)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {mode === 'edit' ? 'Edit' : 'Preview'}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {viewMode === 'edit' ? (
              <button
                onClick={() => setAddPanelOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                Them muc
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
