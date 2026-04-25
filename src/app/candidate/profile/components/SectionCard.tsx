'use client';

import { ReactNode } from 'react';
import { useProfileBuilder } from '../stores/profileBuilderStore';
import { Section, getSectionMeta, isSectionEmpty } from '../types/profile';
import { useAppDialog } from '@/components/ui/app-dialog';

interface SectionCardProps {
  section: Section;
  children: ReactNode;
  onEdit?: () => void;
  readOnly?: boolean;
}

export default function SectionCard({ section, children, onEdit, readOnly = false }: SectionCardProps) {
  const { removeSection, editingSectionId, setEditingSection, toggleSectionVisibility } = useProfileBuilder();
  const { confirm } = useAppDialog();
  
  const meta = getSectionMeta(section.type);
  const isEmpty = isSectionEmpty(section);
  const isEditing = editingSectionId === section.id;

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      setEditingSection(isEditing ? null : section.id);
    }
  };

  const handleDelete = async () => {
    const approved = await confirm({
      title: "Xóa mục hồ sơ",
      description: "Bạn có chắc muốn xóa mục này?",
      confirmText: "Xóa mục",
      cancelText: "Giữ lại",
      tone: "danger",
    });

    if (approved) {
      removeSection(section.id);
    }
  };

  if (readOnly) {
    return (
      <div
        id={`section-${section.id}`}
        className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-2 h-8 rounded-full bg-primary" />
            <h3 className="text-2xl font-bold text-slate-900">{meta?.name || section.type}</h3>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    );
  }

  return (
    <div
      id={`section-${section.id}`}
      className={`
        overflow-hidden rounded-xl border bg-white p-8 transition-all duration-300
        ${section.isHidden ? 'opacity-60' : ''}
        ${isEditing ? 'border-primary/45 ring-2 ring-primary/20 shadow-[0_20px_44px_rgba(37,99,235,0.2)]' : 'border-slate-300/80 shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:border-slate-400/80'}
      `}
    >
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200/70 pb-5">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <span className="material-symbols-outlined text-primary">{meta?.icon || 'article'}</span>
            {meta?.name || section.type}
          </h3>
          {isEmpty ? (
            <p className="text-sm text-slate-400">Chua co thong tin</p>
          ) : null}
          {section.isHidden ? (
            <p className="text-sm font-semibold text-amber-600">Muc dang an trong preview</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleSectionVisibility(section.id)}
            className={`rounded-lg p-2 transition-colors ${section.isHidden ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600' : 'text-slate-500 hover:bg-slate-100 hover:text-primary'}`}
            title={section.isHidden ? 'Hien muc nay' : 'An muc nay'}
          >
            <span className="material-symbols-outlined text-xl">
              {section.isHidden ? 'visibility_off' : 'visibility'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleEdit}
            className={`rounded-lg p-2 transition-colors ${isEditing ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-100 hover:text-primary'}`}
            title={isEditing ? 'Dong chinh sua' : 'Chinh sua'}
          >
            <span className="material-symbols-outlined text-xl">{isEditing ? 'close' : 'edit'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
            title="Xoa"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-slate-50/65 p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
}
