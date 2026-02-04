'use client';

import { useEffect } from 'react';
import { useProfileBuilder } from '../stores/profileBuilderStore';

interface ProfileHeaderProps {
  userName?: string;
  avatarUrl?: string;
}

export default function ProfileHeader({ userName = 'Người dùng', avatarUrl }: ProfileHeaderProps) {
  const { 
    isSaving, 
    lastSaved, 
    hasUnsavedChanges, 
    error,
    setAddPanelOpen 
  } = useProfileBuilder();

  // Warn before leaving with unsaved changes
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
    if (isSaving) return 'Đang lưu...';
    if (lastSaved) {
      const time = lastSaved.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `Đã lưu lúc ${time}`;
    }
    if (hasUnsavedChanges) return 'Chưa lưu';
    return 'Tự động lưu';
  };

  const getSaveStatusColor = () => {
    if (error) return 'text-red-500';
    if (isSaving) return 'text-amber-500';
    if (hasUnsavedChanges) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-100">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-4">
        <div className="flex items-center justify-between">
          {/* Left: User info */}
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-slate-100 overflow-hidden">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Hồ sơ của {userName}</h1>
              <div className={`flex items-center gap-2 text-sm font-medium ${getSaveStatusColor()}`}>
                {isSaving ? (
                  <span className="material-symbols-outlined text-base animate-spin">sync</span>
                ) : error ? (
                  <span className="material-symbols-outlined text-base">error</span>
                ) : (
                  <span className="material-symbols-outlined text-base">cloud_done</span>
                )}
                {getSaveStatusText()}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddPanelOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Thêm mục
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
