'use client';

import { SectionType, getSectionMeta } from '../types/profile';
import { useProfileBuilder } from '../stores/profileBuilderStore';

interface EmptyStateProps {
  sectionType?: SectionType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'section' | 'page';
}

export default function EmptyState({
  sectionType,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'section',
}: EmptyStateProps) {
  const { setAddPanelOpen } = useProfileBuilder();
  
  const meta = sectionType ? getSectionMeta(sectionType) : null;

  // Page-level empty state (no sections at all)
  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="size-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl text-slate-300">person_add</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">
          {title || 'Bắt đầu xây dựng hồ sơ'}
        </h2>
        <p className="text-slate-500 max-w-md mb-8">
          {description || 'Thêm các mục thông tin để hoàn thiện hồ sơ của bạn. Hồ sơ đầy đủ sẽ giúp nhà tuyển dụng hiểu rõ hơn về bạn.'}
        </p>
        <button
          onClick={onAction || (() => setAddPanelOpen(true))}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary/25"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
          {actionLabel || 'Thêm mục đầu tiên'}
        </button>
      </div>
    );
  }

  // Section-level empty state
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-slate-300">
          {meta?.icon || 'add_circle'}
        </span>
      </div>
      <p className="text-slate-500 mb-4">
        {description || meta?.description || 'Chưa có thông tin'}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {actionLabel || 'Thêm thông tin'}
        </button>
      )}
    </div>
  );
}
