'use client';

import { useState, useMemo } from 'react';
import { useProfileBuilder } from '../stores/profileBuilderStore';
import { SECTION_DEFINITIONS, SectionType, SectionMeta } from '../types/profile';

export default function AddSectionPanel() {
  const { isAddPanelOpen, setAddPanelOpen, addSection, document } = useProfileBuilder();
  const [searchQuery, setSearchQuery] = useState('');

  // Get already added section types
  const addedTypes = useMemo(() => {
    return new Set(document?.sections.map(s => s.type) || []);
  }, [document?.sections]);

  // Filter sections by search and group by category
  const filteredSections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return SECTION_DEFINITIONS.filter(section => {
      if (query) {
        return section.name.toLowerCase().includes(query) ||
               section.description.toLowerCase().includes(query);
      }
      return true;
    });
  }, [searchQuery]);

  // Group by category
  const groupedSections = useMemo(() => {
    const groups: Record<string, SectionMeta[]> = {
      basic: [],
      skills: [],
      experience: [],
      other: [],
    };

    filteredSections.forEach(section => {
      groups[section.category].push(section);
    });

    return groups;
  }, [filteredSections]);

  const categoryLabels: Record<string, string> = {
    basic: 'Thông tin cơ bản',
    skills: 'Kỹ năng & Ngôn ngữ',
    experience: 'Kinh nghiệm',
    other: 'Khác',
  };

  const handleAddSection = (type: SectionType) => {
    addSection(type);
    setSearchQuery('');
  };

  if (!isAddPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={() => setAddPanelOpen(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900">Thêm mục mới</h2>
          <button
            onClick={() => setAddPanelOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.entries(groupedSections).map(([category, sections]) => {
            if (sections.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {sections.map((section) => {
                    const isAdded = addedTypes.has(section.id);
                    const isSingleInstance = ['personal_info', 'summary', 'skills', 'languages', 'career_goal', 'links'].includes(section.id);

                    return (
                      <button
                        key={section.id}
                        onClick={() => handleAddSection(section.id)}
                        disabled={isAdded && isSingleInstance}
                        className={`
                          w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left
                          ${isAdded && isSingleInstance
                            ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                            : 'bg-white border-slate-100 hover:border-primary hover:bg-primary/5 hover:shadow-md'
                          }
                        `}
                      >
                        <div className={`
                          size-12 rounded-xl flex items-center justify-center shrink-0
                          ${isAdded && isSingleInstance ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}
                        `}>
                          <span className="material-symbols-outlined text-xl">{section.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900">{section.name}</p>
                          <p className="text-sm text-slate-500 truncate">{section.description}</p>
                        </div>
                        {isAdded && isSingleInstance ? (
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                            Đã thêm
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-primary">add_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-slate-200">search_off</span>
              <p className="text-slate-500 mt-4">Không tìm thấy mục phù hợp</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
