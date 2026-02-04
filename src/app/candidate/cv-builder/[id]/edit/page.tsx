"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCVStore } from "../../store";
import { CVMode, SectionType } from "../../types";
import { Canvas } from "../../components/Canvas";
// import { FixedTemplate } from "../../components/FixedTemplate"; // Legacy, replaced by block canvas
import { PropertiesPanel } from "../../components/PropertiesPanel";

export default function CVEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const id = params?.id as string;
  const modeParam = searchParams?.get('mode') as CVMode;
  
  const { 
    cv, 
    mode, 
    initCV, 
    scale, 
    setScale, 
    addSection, 
    undo, 
    redo,
    historyIndex,
    history 
  } = useCVStore();

  const [isReady, setIsReady] = useState(false);
  const didInit = useRef(false);

  useEffect(() => {
    if (id && !didInit.current) {
      didInit.current = true;
      initCV(modeParam || 'template');
      setTimeout(() => setIsReady(true), 0);
    }
  }, [id, modeParam, initCV]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
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


  if (!isReady) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading editor...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-['Manrope'] text-slate-900 overflow-hidden">
      
      {/* 1. HEADER / TOOLBAR */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shrink-0 shadow-sm relative">
        <div className="flex items-center gap-4">
          <Link href="/candidate/cv-builder" className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500">
             <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
             <h1 className="text-sm font-black text-slate-900">{cv.meta.version ? `CV Draft - ${id.slice(0, 8)}` : 'Untitled CV'}</h1>
             <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-300"></span>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Saved locally</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           
           {/* History Controls */}
           <div className="flex items-center mr-4">
              <button 
                onClick={undo} 
                disabled={historyIndex <= 0}
                className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Undo (Ctrl+Z)"
              >
                 <span className="material-symbols-outlined text-xl">undo</span>
              </button>
              <button 
                onClick={redo} 
                disabled={historyIndex >= history.length - 1}
                className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Redo (Ctrl+Shift+Z)"
              >
                 <span className="material-symbols-outlined text-xl">redo</span>
              </button>
           </div>

           {/* Zoom Controls */}
           <div className="flex items-center bg-slate-100 rounded-lg p-1 mr-4">
              <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="size-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm transition-all text-slate-600">
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span className="text-xs font-bold text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(Math.min(2, scale + 0.1))} className="size-7 flex items-center justify-center rounded hover:bg-white hover:shadow-sm transition-all text-slate-600">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
           </div>

           <button 
             onClick={() => window.print()}
             className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-hover transition-all"
           >
             <span className="material-symbols-outlined text-lg">download</span>
             Export PDF
           </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT PANEL: COMPONENT LIBRARY */}
        <aside className="w-[300px] bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">
           <div className="h-12 border-b border-slate-100 flex items-center px-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                 Add to CV
              </h2>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                   {[
                       { label: 'Text Block', type: 'summary', icon: 'notes' },
                       { label: 'Image', type: 'custom_image', icon: 'image' },
                       { label: 'Experience', type: 'experience_list', icon: 'work' },
                       { label: 'Education', type: 'education_list', icon: 'school' },
                       { label: 'Skills', type: 'skill_list', icon: 'verified' },
                       { label: 'Personal', type: 'personal_info', icon: 'person' },
                   ].map(item => (
                     <button 
                        key={item.label} 
                        onClick={() => addSection(item.type as SectionType)}
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-primary hover:shadow-md hover:-translate-y-1 transition-all group"
                     >
                        <span className="material-symbols-outlined text-slate-400 mb-2 group-hover:text-primary transition-colors">{item.icon}</span>
                        <span className="text-xs font-bold text-slate-700">{item.label}</span>
                     </button>
                   ))}
                </div>
                
                <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Clicking an item adds it to the bottom of the page. You can drag to reorder inside the canvas.
                    </p>
                </div>
           </div>
        </aside>

        {/* CENTER: CANVAS AREA */}
        <section className="flex-1 bg-slate-200/50 overflow-auto flex items-start justify-center p-12 relative remove-scrollbar print:p-0 print:overflow-visible print:bg-white" id="canvas-viewport">
            {/* The A4 Page Wrapper */}
            <div 
              className="bg-white shadow-xl transition-transform origin-top print:shadow-none print:transform-none"
              style={{
                width: '210mm',
                minHeight: '297mm',
                transform: `scale(${scale})`,
                marginBottom: '100px' // Extra space for scroll
              }}
            >
               <Canvas />
            </div>
        </section>

        {/* RIGHT PANEL: PROPERTIES */}
        <aside className="w-[320px] bg-white border-l border-slate-200 flex flex-col z-10 shrink-0 print:hidden">
            <PropertiesPanel />
        </aside>

      </main>
    </div>
  );
}
