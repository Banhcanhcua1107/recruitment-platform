'use client';

import { useEffect } from 'react';
import { useProfileBuilder } from '../stores/profileBuilderStore';

interface ProfileHeaderProps {
  userName?: string;
  viewMode?: 'edit' | 'preview';
  onViewModeChange?: (mode: 'edit' | 'preview') => void;
}

export default function ProfileHeader({
  userName = 'Ứng viên',
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
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveStatus = (() => {
    if (error) {
      return {
        icon: 'error',
        tone: 'text-rose-600 bg-rose-50 border-rose-200',
        label: error,
      };
    }

    if (isSaving) {
      return {
        icon: 'sync',
        tone: 'text-amber-600 bg-amber-50 border-amber-200',
        label: 'Đang lưu thay đổi...',
      };
    }

    if (lastSaved) {
      const time = lastSaved.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        icon: 'cloud_done',
        tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        label: `Đã lưu lúc ${time}`,
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: 'schedule',
        tone: 'text-amber-600 bg-amber-50 border-amber-200',
        label: 'Có thay đổi chưa lưu',
      };
    }

    return {
      icon: 'check_circle',
      tone: 'text-slate-600 bg-slate-50 border-slate-200',
      label: 'Tự động lưu đang bật',
    };
  })();

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.28)] sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Quản lý hồ sơ
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Hồ sơ của {userName}
            </h2>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${saveStatus.tone}`}
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                isSaving ? 'animate-spin' : ''
              }`}
            >
              {saveStatus.icon}
            </span>
            <span>{saveStatus.label}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onViewModeChange ? (
            <div className="inline-flex items-center rounded-2xl bg-slate-100 p-1">
              {(['edit', 'preview'] as const).map((mode) => {
                const isActive = viewMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onViewModeChange(mode)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-primary'
                    }`}
                  >
                    {mode === 'edit' ? 'Chỉnh sửa' : 'Xem hồ sơ'}
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === 'edit' ? (
            <button
              type="button"
              onClick={() => setAddPanelOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm mục
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
