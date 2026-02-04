'use client';

import { SummaryContent, CareerGoalContent } from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';

interface TextSectionProps {
  sectionId: string;
  content: SummaryContent | CareerGoalContent;
  isEditing: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

export default function TextSection({ 
  sectionId, 
  content, 
  isEditing, 
  placeholder = 'Nhập nội dung...',
  emptyMessage = 'Chưa có nội dung'
}: TextSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();

  const handleChange = (value: string) => {
    updateSection(sectionId, { content: value });
  };

  // View mode
  if (!isEditing) {
    if (!content.content?.trim()) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">{emptyMessage}</p>
          <button
            onClick={() => setEditingSection(sectionId)}
            className="text-primary font-bold hover:underline"
          >
            + Thêm nội dung
          </button>
        </div>
      );
    }

    return (
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
          {content.content}
        </p>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4">
      <textarea
        value={content.content || ''}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all resize-none"
      />
      
      <p className="text-xs text-slate-400">
        {content.content?.length || 0} / 1000 ký tự
      </p>

      {/* Done button */}
      <div className="flex justify-end">
        <button
          onClick={() => setEditingSection(null)}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all"
        >
          Xong
        </button>
      </div>
    </div>
  );
}
