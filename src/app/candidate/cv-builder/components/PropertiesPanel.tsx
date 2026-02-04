"use client";

import React from 'react';
import { useCVStore } from '../store';
import clsx from 'clsx';
import { PersonalInfoData, SummarySectionData } from '../types';

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

    return (
        <div className="flex flex-col h-full bg-white font-['Manrope']">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                    {section.type.replace('_', ' ')}
                </h3>
                <button 
                    onClick={() => removeSection(section.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete Section"
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                
                {/* 1. Content Editor - Dynamic based on type */}
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Content</h4>
                    
                    {/* Common: Title Loopback Loop */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Section Title</label>
                        <input 
                            type="text" 
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            value={section.title || ''}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            placeholder="e.g. Work Experience"
                        />
                    </div>

                    {/* Specific Data Inputs */}
                    {section.type === 'personal_info' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700">Full Name</label>
                                <input 
                                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-primary focus:ring-primary outline-none"
                                    value={(section.data as PersonalInfoData).fullName || ''}
                                    onChange={(e) => updateSectionData(section.id, { fullName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700">Job Title</label>
                                <input 
                                    className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:border-primary focus:ring-primary outline-none"
                                    value={(section.data as PersonalInfoData).title || ''}
                                    onChange={(e) => updateSectionData(section.id, { title: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                     
                    {section.type === 'summary' && (
                         <div>
                            <label className="text-xs font-bold text-slate-700">Summary Text</label>
                            <textarea 
                                className="w-full h-32 p-3 text-sm border border-slate-200 rounded-md focus:border-primary focus:ring-primary outline-none resize-none"
                                value={(section.data as SummarySectionData).text || ''}
                                onChange={(e) => updateSectionData(section.id, { text: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {/* 2. Styling */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Appearance</h4>
                    
                    {/* Typography */}
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 mb-1 block">Align</label>
                            <div className="flex bg-slate-100 p-1 rounded-md">
                                {['left', 'center', 'right'].map((align) => (
                                    <button 
                                        key={align}
                                        onClick={() => updateSection(section.id, { styles: { ...section.styles, align: align as 'left' | 'center' | 'right' }}) }
                                        className={clsx(
                                            "flex-1 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-primary transition-all",
                                            section.styles?.align === align ? "bg-white text-primary shadow-sm font-bold" : ""
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
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Bottom Spacing (px)</label>
                        <input 
                            type="range" 
                            min="0" max="64" step="4"
                            className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            value={section.styles?.marginBottom ?? 16} // Default 16/4 = 4 tailwind units
                            onChange={(e) => updateSection(section.id, { styles: { ...section.styles, marginBottom: parseInt(e.target.value) }}) }
                        />
                        <div className="text-right text-xs text-slate-400 font-medium mt-1">
                            {section.styles?.marginBottom ?? 16}px
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
