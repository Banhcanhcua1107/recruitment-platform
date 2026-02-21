"use client";

import React from "react";
import { useCVStore } from "../store";
import { Type, Palette, ZoomIn, ZoomOut, Download, LayoutTemplate } from "lucide-react";

export const FloatingToolbar = () => {
    const { scale, setScale, cv, updateTheme } = useCVStore();

    const handleZoomIn = () => setScale(Math.min(1.5, scale + 0.1));
    const handleZoomOut = () => setScale(Math.max(0.5, scale - 0.1));

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-lg border border-slate-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4">
            
            {/* Font Family */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                <Type size={18} className="text-slate-400" />
                <select 
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                    value={cv.theme.fonts.body}
                    onChange={(e) => updateTheme({ fonts: { ...cv.theme.fonts, body: e.target.value, heading: e.target.value } })}
                >
                    <option value="Inter">Inter</option>
                    <option value="Manrope">Manrope</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                </select>
            </div>

            {/* Color Theme */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                <Palette size={18} className="text-slate-400" />
                <div className="flex gap-2">
                    {['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#6366F1', '#111827'].map(color => (
                        <button
                            key={color}
                            className={`w-5 h-5 rounded-full border border-slate-100 transition-transform hover:scale-110 ${cv.theme.colors.primary === color ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => updateTheme({ colors: { ...cv.theme.colors, primary: color } })}
                        />
                    ))}
                </div>
            </div>

            {/* Page View */}
            <div className="flex items-center gap-2">
                <button onClick={handleZoomOut} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                    <ZoomOut size={18} />
                </button>
                <span className="text-xs font-bold w-8 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                    <ZoomIn size={18} />
                </button>
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-slate-200"></div>

            <button className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors">
                 <LayoutTemplate size={18} />
                 Templates
            </button>

            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg"
            >
                <Download size={16} />
                Download PDF
            </button>
        </div>
    );
};
