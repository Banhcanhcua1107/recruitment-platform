'use client';

import { ReactNode } from 'react';
import { useProfileBuilder } from '../stores/profileBuilderStore';
import { Section, getSectionMeta, isSectionEmpty } from '../types/profile';

interface SectionCardProps {
  section: Section;
  children: ReactNode;
  onEdit?: () => void;
}

export default function SectionCard({ section, children, onEdit }: SectionCardProps) {
  const { removeSection, editingSectionId, setEditingSection, toggleSectionVisibility } = useProfileBuilder();
  
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

  const handleDelete = () => {
    if (confirm('Bạn có chắc muốn xóa mục này?')) {
      removeSection(section.id);
    }
  };

  return (
    <div 
      className={`
        bg-white rounded-[24px] border transition-all duration-300 overflow-hidden
        ${section.isHidden ? 'opacity-50' : ''}
        ${isEditing ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-100 shadow-sm hover:shadow-md'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50 bg-slate-50/50">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button 
            className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
            title="Kéo để sắp xếp"
          >
            <span className="material-symbols-outlined text-xl">drag_indicator</span>
          </button>
          
          {/* Icon & Title */}
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${isEmpty ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
              <span className="material-symbols-outlined">{meta?.icon || 'article'}</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{meta?.name || section.type}</h3>
              {isEmpty && (
                <p className="text-xs text-slate-400">Chưa có thông tin</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Visibility Toggle */}
          <button
            onClick={() => toggleSectionVisibility(section.id)}
            className={`p-2 rounded-lg transition-colors ${section.isHidden ? 'text-slate-300 hover:text-slate-500' : 'text-slate-400 hover:text-primary'}`}
            title={section.isHidden ? 'Hiện mục này' : 'Ẩn mục này'}
          >
            <span className="material-symbols-outlined text-xl">
              {section.isHidden ? 'visibility_off' : 'visibility'}
            </span>
          </button>
          
          {/* Edit */}
          <button
            onClick={handleEdit}
            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary hover:bg-primary/5'}`}
            title="Chỉnh sửa"
          >
            <span className="material-symbols-outlined text-xl">{isEditing ? 'close' : 'edit'}</span>
          </button>
          
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Xóa"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
