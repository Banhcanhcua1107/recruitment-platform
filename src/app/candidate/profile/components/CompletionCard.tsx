'use client';

import { useProfileBuilder, useProfileSections } from '../stores/profileBuilderStore';
import { isSectionEmpty } from '../types/profile';

export default function CompletionCard() {
  const { document, setAddPanelOpen } = useProfileBuilder();
  const sections = useProfileSections();

  if (!document || sections.length === 0) return null;

  // Calculate completion percentage
  const filledSections = sections.filter(s => !isSectionEmpty(s)).length;
  const totalSections = sections.length;
  const percentage = Math.round((filledSections / Math.max(totalSections, 5)) * 100);

  // Get suggestions for improvement
  const getSuggestion = () => {
    const sectionTypes = new Set(sections.map(s => s.type));
    
    if (!sectionTypes.has('personal_info')) {
      return { text: 'Thêm thông tin cá nhân', boost: '+20%' };
    }
    if (!sectionTypes.has('skills')) {
      return { text: 'Thêm kỹ năng', boost: '+15%' };
    }
    if (!sectionTypes.has('experience')) {
      return { text: 'Thêm kinh nghiệm làm việc', boost: '+20%' };
    }
    if (!sectionTypes.has('education')) {
      return { text: 'Thêm học vấn', boost: '+10%' };
    }
    if (!sectionTypes.has('summary')) {
      return { text: 'Thêm giới thiệu bản thân', boost: '+10%' };
    }
    
    // Check for empty sections
    const emptySection = sections.find(s => isSectionEmpty(s));
    if (emptySection) {
      return { text: 'Hoàn thiện các mục đã thêm', boost: '+10%' };
    }
    
    return null;
  };

  const suggestion = getSuggestion();

  const getStatusColor = () => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <p className="font-bold text-slate-900">Độ hoàn thiện hồ sơ</p>
        <span className={`px-3 py-1 rounded-xl text-sm font-black ${getStatusColor()}`}>
          {percentage}%
        </span>
      </div>
      
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {suggestion && (
        <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="flex gap-3 items-start">
            <span className="material-symbols-outlined text-primary text-xl">lightbulb</span>
            <div className="flex-1">
              <p className="text-sm text-slate-600 font-medium">
                {suggestion.text} để tăng 
                <span className="text-primary font-black"> {suggestion.boost}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setAddPanelOpen(true)}
            className="w-full mt-3 text-sm font-bold text-primary hover:underline flex items-center justify-center gap-1"
          >
            Thêm ngay
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      )}

      {percentage >= 80 && (
        <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="flex gap-3 items-center">
            <span className="material-symbols-outlined text-green-600 text-xl">verified</span>
            <p className="text-sm text-green-700 font-medium">
              Hồ sơ của bạn đã khá hoàn thiện!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
