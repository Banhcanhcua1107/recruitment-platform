"use client";

import React from 'react';
import { useCVStore } from '../store';
import clsx from 'clsx';
import { 
    HeaderData, 
    PersonalInfoData, 
    SummarySectionData, 
    ExperienceListSectionData, 
    EducationListSectionData,
    SkillListSectionData,
    ExperienceItem,
    EducationItem,
    SkillItem
} from '../types';
import { Plus, Trash, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const PropertiesPanel = () => {
    const { 
        selectedSectionId, 
        cv, 
        updateSection, 
        updateSectionData, 
        removeSection
    } = useCVStore();

    const section = cv.sections.find(s => s.id === selectedSectionId);

    if (!selectedSectionId || !section) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                <span className="material-symbols-outlined text-4xl mb-4 text-slate-200">settings_suggest</span>
                <p className="font-medium text-sm">Select an element on the canvas to edit its properties.</p>
            </div>
        );
    }

    const renderHeaderForm = (data: HeaderData) => (
        <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input 
                    placeholder="Họ và tên"
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-emerald-500 outline-none"
                    value={data.fullName || ''}
                    onChange={(e) => updateSectionData(section.id, { fullName: e.target.value })}
                />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-700">Professional Title</label>
                <input 
                    placeholder="Chức danh"
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-emerald-500 outline-none"
                    value={data.title || ''}
                    onChange={(e) => updateSectionData(section.id, { title: e.target.value })}
                />
            </div>
             <div>
                <label className="text-xs font-bold text-slate-700">Avatar URL</label>
                <input 
                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-emerald-500 outline-none"
                    value={data.avatarUrl || ''}
                    onChange={(e) => updateSectionData(section.id, { avatarUrl: e.target.value })}
                    placeholder="https://..."
                />
            </div>
        </div>
    );

    const renderPersonalInfoForm = (data: PersonalInfoData) => (
        <div className="space-y-4">
            {(['email', 'phone', 'address', 'dob'] as const).map((field) => (
                <div key={field}>
                    <label className="text-xs font-bold text-slate-700 capitalize">{field}</label>
                    <input 
                        placeholder={field}
                        className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-emerald-500 outline-none"
                        value={data[field] || ''}
                        onChange={(e) => updateSectionData(section.id, { [field]: e.target.value })}
                    />
                </div>
            ))}
        </div>
    );

    const renderExperienceForm = (data: ExperienceListSectionData) => {
        const items = data.items || [];
        
        const updateItem = (itemId: string, updates: Partial<ExperienceItem>) => {
            const newItems = items.map(item => item.id === itemId ? { ...item, ...updates } : item);
            updateSectionData(section.id, { items: newItems });
        };

        const addItem = () => {
            const newItem: ExperienceItem = {
                id: uuidv4(),
                company: 'New Company',
                position: 'Position',
                startDate: '2023',
                endDate: 'Present',
                description: 'Description of your role...'
            };
            updateSectionData(section.id, { items: [...items, newItem] });
        };

        const removeItem = (itemId: string) => {
            updateSectionData(section.id, { items: items.filter(i => i.id !== itemId) });
        };

        return (
            <div className="space-y-6">
                {items.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative group">
                        <button 
                            type="button"
                            title="Xóa mục này"
                            aria-label="Xóa mục này"
                            onClick={() => removeItem(item.id)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                            <Trash size={14} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2 pr-6">
                             <input 
                                title="Vị trí"
                                className="text-sm font-bold bg-white border border-slate-200 rounded px-2 py-1" 
                                value={item.position}
                                onChange={(e) => updateItem(item.id, { position: e.target.value })}
                                placeholder="Position"
                             />
                             <input 
                                title="Công ty"
                                className="text-sm bg-white border border-slate-200 rounded px-2 py-1" 
                                value={item.company}
                                onChange={(e) => updateItem(item.id, { company: e.target.value })}
                                placeholder="Company"
                             />
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                             <input 
                                className="text-xs bg-white border border-slate-200 rounded px-2 py-1" 
                                value={item.startDate}
                                onChange={(e) => updateItem(item.id, { startDate: e.target.value })}
                                placeholder="Start"
                             />
                             <input 
                                className="text-xs bg-white border border-slate-200 rounded px-2 py-1" 
                                value={item.endDate}
                                onChange={(e) => updateItem(item.id, { endDate: e.target.value })}
                                placeholder="End"
                             />
                        </div>
                        <textarea 
                             title="Mô tả"
                             className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 min-h-15"
                             value={item.description}
                             onChange={(e) => updateItem(item.id, { description: e.target.value })}
                             placeholder="Description..."
                        />
                    </div>
                ))}
                
                <button 
                    onClick={addItem}
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 border-dashed transition-colors"
                >
                    <Plus size={14} /> Add Position
                </button>
            </div>
        );
    };

    const renderSkillsForm = (data: SkillListSectionData) => {
        const items = data.items || [];
        
        const updateItem = (itemId: string, name: string) => {
            const newItems = items.map(item => item.id === itemId ? { ...item, name } : item);
            updateSectionData(section.id, { items: newItems });
        };

        const addItem = () => {
            updateSectionData(section.id, { items: [...items, { id: uuidv4(), name: 'New Skill', level: 50 }] });
        };
        
        const removeItem = (itemId: string) => {
             updateSectionData(section.id, { items: items.filter(i => i.id !== itemId) });
        };

        return (
            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center gap-1 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 text-sm">
                            <input 
                                placeholder="Kỹ năng"
                                title="Tên kỹ năng"
                                className="bg-transparent outline-none w-20"
                                value={item.name}
                                onChange={(e) => updateItem(item.id, e.target.value)}
                            />
                             <button type="button" title="Xóa kỹ năng" aria-label="Xóa kỹ năng" onClick={() => removeItem(item.id)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500">
                                <Trash size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                <button 
                    onClick={addItem}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                    <Plus size={12} /> Add Skill
                </button>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white font-['Manrope'] border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                    {section.type.replace(/_/g, ' ')}
                </h3>
                <button 
                    onClick={() => removeSection(section.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete Section"
                >
                    <Trash size={16} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                
                {/* 1. Content Editor - Dynamic based on type */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Section Content</h4>
                         <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">
                             ID: {section.id.slice(0,4)}
                         </span>
                    </div>

                    
                    {/* Common: Title */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Section Title (Optional)</label>
                        <input 
                            type="text" 
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                            value={section.title || ''}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            placeholder="e.g. Work Experience"
                        />
                    </div>

                    {/* Specific Data Inputs */}
                    {section.type === 'header' && renderHeaderForm(section.data as HeaderData)}
                    {section.type === 'personal_info' && renderPersonalInfoForm(section.data as PersonalInfoData)}
                    {section.type === 'experience_list' && renderExperienceForm(section.data as ExperienceListSectionData)}
                    {section.type === 'skill_list' && renderSkillsForm(section.data as SkillListSectionData)}
                     
                    {section.type === 'summary' && (
                         <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Summary Text</label>
                            <textarea 
                                title="Giới thiệu bản thân"
                                placeholder="Viết giới thiệu bản thân..."
                                className="w-full h-40 p-3 text-sm border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
                                value={(section.data as SummarySectionData).text || ''}
                                onChange={(e) => updateSectionData(section.id, { text: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {/* 2. Styling */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Properties</h4>
                    
                    {/* Typography */}
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 mb-2 block">Alignment</label>
                            <div className="flex bg-slate-100 p-1 rounded-md">
                                {['left', 'center', 'right'].map((align) => (
                                    <button 
                                        key={align}
                                        onClick={() => updateSection(section.id, { styles: { ...section.styles, align: align as 'left' | 'center' | 'right' }}) }
                                        className={clsx(
                                            "flex-1 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-emerald-600 transition-all",
                                            section.styles?.align === align ? "bg-white text-emerald-600 shadow-sm font-bold" : ""
                                        )}
                                    >
                                        <span className="material-symbols-outlined text-sm">format_align_{align}</span>
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>

                    {/* Spacing */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-700">Bottom Spacing</label>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded">
                                {section.styles?.marginBottom ?? 16}px
                            </span>
                        </div>
                        <input 
                            type="range" 
                            title="Khoảng cách dưới"
                            aria-label="Khoảng cách dưới"
                            min="0" max="64" step="4"
                            className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            value={section.styles?.marginBottom ?? 16}
                            onChange={(e) => updateSection(section.id, { styles: { ...section.styles, marginBottom: parseInt(e.target.value) }}) }
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};
