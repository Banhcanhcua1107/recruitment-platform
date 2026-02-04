'use client';

import { useMemo, useState } from 'react';
import { LanguagesContent, Language } from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';
import languagesData from '@/data/suggestions/languages.json';

interface LanguagesSectionProps {
  sectionId: string;
  content: LanguagesContent;
  isEditing: boolean;
}

export default function LanguagesSection({ sectionId, content, isEditing }: LanguagesSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ name: '', level: 'intermediate' as Language['level'], certification: '' });

  const languageNames = useMemo(() => {
    return (languagesData.languages as Array<{ name: string }>).map(l => l.name);
  }, []);

  const levelOptions = languagesData.levels as Array<{ id: string; name: string; description: string }>;

  const addLanguage = () => {
    if (!newLanguage.name.trim()) return;

    const language: Language = {
      id: crypto.randomUUID(),
      name: newLanguage.name.trim(),
      level: newLanguage.level,
      certification: newLanguage.certification.trim() || undefined,
    };

    updateSection(sectionId, {
      languages: [...content.languages, language],
    });

    setNewLanguage({ name: '', level: 'intermediate', certification: '' });
    setShowAddForm(false);
  };

  const removeLanguage = (id: string) => {
    updateSection(sectionId, {
      languages: content.languages.filter(l => l.id !== id),
    });
  };

  const updateLanguage = (id: string, updates: Partial<Language>) => {
    updateSection(sectionId, {
      languages: content.languages.map(l =>
        l.id === id ? { ...l, ...updates } : l
      ),
    });
  };

  const getLevelPercent = (level: Language['level']) => {
    const map: Record<string, number> = {
      beginner: 25,
      intermediate: 50,
      advanced: 75,
      native: 100,
    };
    return map[level] || 50;
  };

  const getLevelLabel = (level: Language['level']) => {
    const option = levelOptions.find(o => o.id === level);
    return option?.name || level;
  };

  // View mode
  if (!isEditing) {
    if (content.languages.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Chưa có thông tin ngoại ngữ</p>
          <button
            onClick={() => setEditingSection(sectionId)}
            className="text-primary font-bold hover:underline"
          >
            + Thêm ngoại ngữ
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {content.languages.map(lang => (
          <div key={lang.id}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">{lang.name}</p>
                {lang.certification && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-lg font-bold">
                    {lang.certification}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-slate-500">
                {getLevelLabel(lang.level)}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${getLevelPercent(lang.level)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      {/* Existing languages */}
      {content.languages.map(lang => (
        <div key={lang.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <input
              type="text"
              value={lang.name}
              onChange={(e) => updateLanguage(lang.id, { name: e.target.value })}
              className="text-lg font-bold bg-transparent border-none focus:outline-none text-slate-900"
            />
            <button
              onClick={() => removeLanguage(lang.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Trình độ</label>
              <select
                value={lang.level}
                onChange={(e) => updateLanguage(lang.id, { level: e.target.value as Language['level'] })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {levelOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Chứng chỉ (tùy chọn)</label>
              <input
                type="text"
                value={lang.certification || ''}
                onChange={(e) => updateLanguage(lang.id, { certification: e.target.value })}
                placeholder="IELTS 7.5, JLPT N2..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Level preview */}
          <div className="mt-4">
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${getLevelPercent(lang.level)}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add new language */}
      {showAddForm ? (
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h4 className="font-bold text-slate-900 mb-4">Thêm ngoại ngữ</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ngôn ngữ</label>
              <select
                value={newLanguage.name}
                onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Chọn --</option>
                {languageNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Trình độ</label>
              <select
                value={newLanguage.level}
                onChange={(e) => setNewLanguage({ ...newLanguage, level: e.target.value as Language['level'] })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {levelOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Chứng chỉ</label>
              <input
                type="text"
                value={newLanguage.certification}
                onChange={(e) => setNewLanguage({ ...newLanguage, certification: e.target.value })}
                placeholder="IELTS, TOEIC..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={addLanguage}
              disabled={!newLanguage.name}
              className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Thêm
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Thêm ngoại ngữ
        </button>
      )}

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
