'use client';

import { useState, useMemo } from 'react';
import { EducationContent, EducationItem } from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';
import SuggestionInput from '../inputs/SuggestionInput';
import universitiesData from '@/data/suggestions/vn-universities.json';
import majorsData from '@/data/suggestions/majors.json';

interface EducationSectionProps {
  sectionId: string;
  content: EducationContent;
  isEditing: boolean;
}

export default function EducationSection({ sectionId, content, isEditing }: EducationSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<EducationItem>>({
    school: '',
    major: '',
    degree: 'Cử nhân',
    startYear: undefined,
    endYear: undefined,
    gpa: '',
  });

  const universities = universitiesData as string[];
  
  const allMajors = useMemo(() => {
    const result: string[] = [];
    Object.values(majorsData).forEach(items => {
      result.push(...(items as string[]));
    });
    return result;
  }, []);

  const degreeOptions = ['Cao đẳng', 'Cử nhân', 'Kỹ sư', 'Thạc sĩ', 'Tiến sĩ', 'Khác'];

  const addEducation = () => {
    if (!newItem.school?.trim() || !newItem.major?.trim()) return;

    const education: EducationItem = {
      id: crypto.randomUUID(),
      school: newItem.school.trim(),
      major: newItem.major.trim(),
      degree: newItem.degree || 'Cử nhân',
      startYear: newItem.startYear || new Date().getFullYear() - 4,
      endYear: newItem.endYear,
      gpa: newItem.gpa?.trim(),
    };

    updateSection(sectionId, {
      items: [...content.items, education],
    });

    setNewItem({ school: '', major: '', degree: 'Cử nhân', startYear: undefined, endYear: undefined, gpa: '' });
    setShowAddForm(false);
  };

  const removeEducation = (id: string) => {
    updateSection(sectionId, {
      items: content.items.filter(item => item.id !== id),
    });
  };

  const updateEducation = (id: string, updates: Partial<EducationItem>) => {
    updateSection(sectionId, {
      items: content.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  // View mode
  if (!isEditing) {
    if (content.items.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Chưa có thông tin học vấn</p>
          <button
            onClick={() => setEditingSection(sectionId)}
            className="text-primary font-bold hover:underline"
          >
            + Thêm học vấn
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {content.items.map((item) => (
          <div key={item.id} className="flex items-start gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="size-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-slate-900">{item.school}</h3>
              <p className="text-primary font-bold">{item.degree} - {item.major}</p>
              <p className="text-sm text-slate-400 mt-1">
                {item.startYear} - {item.endYear || 'Hiện tại'}
                {item.gpa && ` • GPA: ${item.gpa}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      {/* Existing education */}
      {content.items.map((item) => (
        <div key={item.id} className="p-5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <SuggestionInput
                value={item.school}
                onChange={(value) => updateEducation(item.id, { school: value })}
                suggestions={universities}
                placeholder="Tên trường"
                className="mb-3"
              />
              <SuggestionInput
                value={item.major}
                onChange={(value) => updateEducation(item.id, { major: value })}
                suggestions={allMajors}
                placeholder="Ngành học"
              />
            </div>
            <button
              onClick={() => removeEducation(item.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Bằng cấp</label>
              <select
                value={item.degree}
                onChange={(e) => updateEducation(item.id, { degree: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {degreeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Năm bắt đầu</label>
              <input
                type="number"
                value={item.startYear || ''}
                onChange={(e) => updateEducation(item.id, { startYear: parseInt(e.target.value) || undefined })}
                placeholder="2018"
                min="1950"
                max="2030"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Năm tốt nghiệp</label>
              <input
                type="number"
                value={item.endYear || ''}
                onChange={(e) => updateEducation(item.id, { endYear: parseInt(e.target.value) || undefined })}
                placeholder="2022"
                min="1950"
                max="2030"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">GPA (tùy chọn)</label>
              <input
                type="text"
                value={item.gpa || ''}
                onChange={(e) => updateEducation(item.id, { gpa: e.target.value })}
                placeholder="3.5/4.0"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add new education */}
      {showAddForm ? (
        <div className="p-5 bg-primary/5 rounded-xl border border-primary/20">
          <h4 className="font-bold text-slate-900 mb-4">Thêm học vấn</h4>
          <div className="space-y-4 mb-4">
            <SuggestionInput
              label="Trường"
              value={newItem.school || ''}
              onChange={(value) => setNewItem({ ...newItem, school: value })}
              suggestions={universities}
              placeholder="Đại học Bách khoa..."
            />
            <SuggestionInput
              label="Ngành học"
              value={newItem.major || ''}
              onChange={(value) => setNewItem({ ...newItem, major: value })}
              suggestions={allMajors}
              placeholder="Kỹ thuật Phần mềm..."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Bằng cấp</label>
                <select
                  value={newItem.degree || 'Cử nhân'}
                  onChange={(e) => setNewItem({ ...newItem, degree: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {degreeOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Năm bắt đầu</label>
                <input
                  type="number"
                  value={newItem.startYear || ''}
                  onChange={(e) => setNewItem({ ...newItem, startYear: parseInt(e.target.value) || undefined })}
                  placeholder="2018"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Năm tốt nghiệp</label>
                <input
                  type="number"
                  value={newItem.endYear || ''}
                  onChange={(e) => setNewItem({ ...newItem, endYear: parseInt(e.target.value) || undefined })}
                  placeholder="2022"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">GPA</label>
                <input
                  type="text"
                  value={newItem.gpa || ''}
                  onChange={(e) => setNewItem({ ...newItem, gpa: e.target.value })}
                  placeholder="3.5/4.0"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
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
              onClick={addEducation}
              disabled={!newItem.school?.trim() || !newItem.major?.trim()}
              className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
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
          Thêm học vấn
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
