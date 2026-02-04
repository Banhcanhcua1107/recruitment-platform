'use client';

import { useState } from 'react';
import { ExperienceContent, ExperienceItem } from '../../types/profile';
import { useProfileBuilder } from '../../stores/profileBuilderStore';

interface ExperienceSectionProps {
  sectionId: string;
  content: ExperienceContent;
  isEditing: boolean;
}

export default function ExperienceSection({ sectionId, content, isEditing }: ExperienceSectionProps) {
  const { updateSection, setEditingSection } = useProfileBuilder();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ExperienceItem>>({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: [],
  });
  const [newBullet, setNewBullet] = useState('');

  const addExperience = () => {
    if (!newItem.title?.trim() || !newItem.company?.trim()) return;

    const experience: ExperienceItem = {
      id: crypto.randomUUID(),
      title: newItem.title.trim(),
      company: newItem.company.trim(),
      location: newItem.location?.trim(),
      startDate: newItem.startDate || '',
      endDate: newItem.isCurrent ? undefined : newItem.endDate,
      isCurrent: newItem.isCurrent || false,
      description: newItem.description || [],
    };

    updateSection(sectionId, {
      items: [...content.items, experience],
    });

    setNewItem({ title: '', company: '', location: '', startDate: '', endDate: '', isCurrent: false, description: [] });
    setShowAddForm(false);
  };

  const removeExperience = (id: string) => {
    updateSection(sectionId, {
      items: content.items.filter(item => item.id !== id),
    });
  };

  const updateExperience = (id: string, updates: Partial<ExperienceItem>) => {
    updateSection(sectionId, {
      items: content.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  };

  const addBulletPoint = (itemId: string, text: string) => {
    const item = content.items.find(i => i.id === itemId);
    if (!item || !text.trim()) return;

    updateExperience(itemId, {
      description: [...item.description, text.trim()],
    });
  };

  const removeBulletPoint = (itemId: string, index: number) => {
    const item = content.items.find(i => i.id === itemId);
    if (!item) return;

    updateExperience(itemId, {
      description: item.description.filter((_, i) => i !== index),
    });
  };

  const formatDateRange = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const start = startDate ? new Date(startDate).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '';
    if (isCurrent) return `${start} - Hiện tại`;
    const end = endDate ? new Date(endDate).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : '';
    return `${start} - ${end}`;
  };

  // View mode
  if (!isEditing) {
    if (content.items.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">Chưa có kinh nghiệm làm việc</p>
          <button
            onClick={() => setEditingSection(sectionId)}
            className="text-primary font-bold hover:underline"
          >
            + Thêm kinh nghiệm
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
        {content.items.map((item, index) => (
          <div key={item.id} className="relative pl-10">
            <div className="absolute left-1 top-1.5 size-5 rounded-full bg-primary border-4 border-white shadow z-10" />
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                <p className="text-primary font-bold">{item.company}</p>
              </div>
              <p className="text-sm text-slate-400 font-medium shrink-0">
                {formatDateRange(item.startDate, item.endDate, item.isCurrent)}
              </p>
            </div>

            {item.description.length > 0 && (
              <ul className="list-disc pl-5 space-y-2 text-slate-600">
                {item.description.map((desc, i) => (
                  <li key={i}>{desc}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-6">
      {/* Existing experiences */}
      {content.items.map((item) => (
        <div key={item.id} className="p-5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={item.title}
                onChange={(e) => updateExperience(item.id, { title: e.target.value })}
                placeholder="Vị trí công việc"
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="text"
                value={item.company}
                onChange={(e) => updateExperience(item.id, { company: e.target.value })}
                placeholder="Tên công ty"
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => removeExperience(item.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Bắt đầu</label>
              <input
                type="month"
                value={item.startDate?.slice(0, 7) || ''}
                onChange={(e) => updateExperience(item.id, { startDate: e.target.value + '-01' })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Kết thúc</label>
              <input
                type="month"
                value={item.endDate?.slice(0, 7) || ''}
                onChange={(e) => updateExperience(item.id, { endDate: e.target.value + '-01' })}
                disabled={item.isCurrent}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.isCurrent}
                  onChange={(e) => updateExperience(item.id, { isCurrent: e.target.checked })}
                  className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-600">Đang làm việc tại đây</span>
              </label>
            </div>
          </div>

          {/* Bullet points */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Mô tả công việc</label>
            <ul className="space-y-2 mb-3">
              {item.description.map((desc, i) => (
                <li key={i} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span className="flex-1 text-sm text-slate-700">{desc}</span>
                  <button
                    onClick={() => removeBulletPoint(item.id, i)}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </li>
              ))}
            </ul>
            {editingItemId === item.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBullet}
                  onChange={(e) => setNewBullet(e.target.value)}
                  placeholder="Thêm mô tả..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBullet.trim()) {
                      addBulletPoint(item.id, newBullet);
                      setNewBullet('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newBullet.trim()) {
                      addBulletPoint(item.id, newBullet);
                      setNewBullet('');
                    }
                    setEditingItemId(null);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                >
                  Thêm
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingItemId(item.id)}
                className="text-sm text-primary font-bold hover:underline"
              >
                + Thêm mô tả
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add new experience */}
      {showAddForm ? (
        <div className="p-5 bg-primary/5 rounded-xl border border-primary/20">
          <h4 className="font-bold text-slate-900 mb-4">Thêm kinh nghiệm mới</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={newItem.title || ''}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="Vị trí công việc *"
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="text"
              value={newItem.company || ''}
              onChange={(e) => setNewItem({ ...newItem, company: e.target.value })}
              placeholder="Tên công ty *"
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="month"
              value={newItem.startDate?.slice(0, 7) || ''}
              onChange={(e) => setNewItem({ ...newItem, startDate: e.target.value + '-01' })}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-4">
              <input
                type="month"
                value={newItem.endDate?.slice(0, 7) || ''}
                onChange={(e) => setNewItem({ ...newItem, endDate: e.target.value + '-01' })}
                disabled={newItem.isCurrent}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={newItem.isCurrent}
                  onChange={(e) => setNewItem({ ...newItem, isCurrent: e.target.checked })}
                  className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-slate-600">Hiện tại</span>
              </label>
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
              onClick={addExperience}
              disabled={!newItem.title?.trim() || !newItem.company?.trim()}
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
          Thêm kinh nghiệm làm việc
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
