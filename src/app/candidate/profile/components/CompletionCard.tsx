'use client';

import { useProfileBuilder, useProfileSections } from '../stores/profileBuilderStore';
import { isSectionEmpty } from '../types/profile';

interface CompletionCardProps {
  variant?: 'default' | 'template';
}

export default function CompletionCard({ variant = 'default' }: CompletionCardProps) {
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

  const getSuggestionIcon = () => {
    if (!suggestion) {
      return 'task_alt';
    }

    const value = suggestion.text.toLowerCase();
    if (value.includes('kinh nghiệm')) return 'work_history';
    if (value.includes('học vấn')) return 'school';
    if (value.includes('kỹ năng')) return 'psychology';
    if (value.includes('thông tin cá nhân')) return 'person';
    if (value.includes('giới thiệu')) return 'article';
    return 'description';
  };

  if (variant === 'default') {
    return (
      <div className="rounded-xl border border-slate-300/80 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
        <div className="mb-6">
          <div className="mb-2 flex items-end justify-between">
            <h3 className="font-bold text-slate-900">Do hoan thien ho so</h3>
            <span className="text-2xl font-extrabold text-primary">{percentage}%</span>
          </div>

          <progress
            className="h-3 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary"
            max={100}
            value={percentage}
          />

          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-lg px-2 py-1 text-xs font-bold ${getStatusColor()}`}>
              Trang thai
            </span>
            <p className="text-xs text-slate-500">Cap nhat theo du lieu thoi gian thuc</p>
          </div>
        </div>

        {percentage >= 80 ? (
          <div className="mb-6 rounded-xl border border-emerald-300/70 bg-emerald-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-xl text-emerald-600">verified_user</span>
              <p className="text-sm font-medium text-emerald-700">Tuyet voi! Ho so cua ban da kha hoan thien.</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Viec can lam</h4>

          {suggestion ? (
            <div className="rounded-lg border border-slate-300/80 bg-slate-50 p-3 transition-all hover:border-primary/40 hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-500">{getSuggestionIcon()}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{suggestion.text}</p>
                    <p className="text-xs font-semibold text-primary">Tang {suggestion.boost}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAddPanelOpen(true)}
                  className="text-xs font-bold text-primary transition hover:underline"
                >
                  Them ngay
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-500">
              Ho so cua ban da day du. Ban co the tiep tuc cap nhat de noi bat hon.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-blue-900/10 bg-linear-to-br from-primary to-blue-700 p-6 text-white shadow-lg shadow-blue-900/15">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white/80">AI Insight</p>
          <p className="mt-1 text-lg font-black">Do hoan thien ho so</p>
        </div>
        <span className={`rounded-xl px-3 py-1 text-sm font-black ${percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : getStatusColor()}`}>
          {percentage}%
        </span>
      </div>
      
      <progress
        className="h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/25 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-white [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-white"
        max={100}
        value={percentage}
      />

      {suggestion && (
        <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-white">lightbulb</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">
                {suggestion.text} để tăng 
                <span className="font-black text-white"> {suggestion.boost}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setAddPanelOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-bold text-white transition hover:opacity-90"
          >
            Thêm ngay
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      )}

      {percentage >= 80 && (
        <div className="mt-4 rounded-xl border border-emerald-200/60 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-emerald-600">verified</span>
            <p className="text-sm font-medium text-emerald-700">
              Hồ sơ của bạn đã khá hoàn thiện!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
