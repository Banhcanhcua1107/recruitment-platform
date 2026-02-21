"use client";

import React, { useEffect } from 'react';
import { useCVStore } from '../../store';
import { AISuggestionSidebar } from '../../components/AISuggestionSidebar';
import { GreenModernTemplate } from '../../components/templates/GreenModernTemplate';
import { ArrowLeft, Save, PanelRight, Download } from 'lucide-react';
import Link from 'next/link';

export default function EditCVPage({ params }: { params: { id: string } }) {
    const { 
        initCV, 
        cv, 
        isSidebarOpen, 
        toggleSidebar,
        undo,
        redo,
        historyIndex,
        history,
        scale
    } = useCVStore();
    
    // Initialize
    useEffect(() => {
        initCV('template'); // Force template mode
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    if (!cv) return <div className="flex items-center justify-center h-screen bg-slate-50">Loading Editor...</div>;

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Top Navigation Bar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <Link href="/candidate/cv-builder" className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <h1 className="font-bold text-slate-800 text-lg editable outline-none focus:ring-2 focus:ring-emerald-500 rounded px-2">
                            {cv.meta.templateId || "Untitled CV"}
                        </h1>
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            Auto-saving
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-50 rounded-lg p-1 mr-4 border border-slate-200">
                            <button 
                                onClick={undo} 
                                disabled={historyIndex <= 0}
                                className="size-8 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                title="Undo (Ctrl+Z)"
                            >
                                <span className="material-symbols-outlined text-xl">undo</span>
                            </button>
                            <button 
                                onClick={redo} 
                                disabled={historyIndex >= history.length - 1}
                                className="size-8 flex items-center justify-center rounded hover:bg-white hover:shadow-sm text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                title="Redo (Ctrl+Shift+Z)"
                            >
                                <span className="material-symbols-outlined text-xl">redo</span>
                            </button>
                        </div>

                        <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors" onClick={() => window.print()}>
                            <Download size={18} />
                            <span>Download PDF</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium shadow-sm transition-all hover:shadow-md">
                            <Save size={18} />
                            <span>Save</span>
                        </button>
                        <button 
                            onClick={toggleSidebar}
                            className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <PanelRight size={20} />
                        </button>
                    </div>
                </header>

                {/* Editor Workspace */}
                <main className="flex-1 overflow-auto bg-slate-100 relative custom-scrollbar flex justify-center p-8">
                    <div 
                        className="transform origin-top transition-transform duration-200 ease-in-out bg-white shadow-2xl"
                        style={{ transform: `scale(${scale})` }}
                    >
                        <GreenModernTemplate />
                    </div>
                    
                    {/* Floating Toolbar removed as requested */}
                </main>
            </div>

            {/* Right Sidebar: AI Suggestions */}
            <div 
                className={`w-80 bg-white border-l border-slate-200 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                    isSidebarOpen ? 'translate-x-0 opacity-100' : 'translate-x-full w-0 opacity-0 overflow-hidden'
                }`}
            >
                <AISuggestionSidebar />
            </div>
        </div>
    );
}
