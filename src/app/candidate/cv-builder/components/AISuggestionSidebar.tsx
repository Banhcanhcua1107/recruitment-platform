"use client";

import React, { useEffect } from "react";
import { useCVStore } from "../store";
import { Sparkles, X, Lightbulb, Wand2, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

export const AISuggestionSidebar = () => {
    const { selectedSectionId, cv, isSidebarOpen, toggleSidebar, aiSuggestions, setAISuggestions } = useCVStore();

    const selectedSection = cv.sections.find(s => s.id === selectedSectionId);

    // Mock AI Logic - In real app, this would call an API
    useEffect(() => {
        if (!selectedSection) {
            setAISuggestions([]);
            return;
        }

        const suggestions: Record<string, string[]> = {
            'header': [
                "Ensure your photo is professional and well-lit.",
                "Use a clear, standard job title like 'Fullstack Developer'.",
                "Double-check your email and phone number formatting."
            ],
            'summary': [
                "Start with your years of experience and key role.",
                "Highlight your biggest achievement in the second sentence.",
                "Mention key technologies you specialize in (React, Node.js).",
                "Keep it under 4 lines for readability."
            ],
            'experience_list': [
                "Use action verbs like 'Led', 'Developed', 'Optimized'.",
                "Include numbers: 'Increased efficiency by 20%'.",
                "Focus on results, not just responsibilities.",
                "Mention the tech stack used in each role."
            ],
            'education_list': [
                "List your highest degree first.",
                "Include relevant coursework if you are a new grad.",
                "Mention honors or awards (Dean's List, Cum Laude)."
            ],
            'skill_list': [
                "Group skills by category (Frontend, Backend, Tools).",
                "Don't list common skills like 'Microsoft Word'.",
                "Focus on hard skills relevant to the Job Description."
            ]
        };

        setAISuggestions(suggestions[selectedSection.type] || ["Select a section to get specific advice."]);

    }, [selectedSectionId, selectedSection?.type, setAISuggestions]);

    if (!selectedSectionId) return null;

    return (
        <div className={clsx(
            "fixed right-0 top-16 bottom-0 w-80 bg-slate-900 text-white shadow-2xl z-40 transform transition-transform duration-300 ease-out border-l border-slate-700",
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400">
                    <Sparkles size={20} />
                    <span className="font-bold tracking-wide uppercase text-xs">AI Assistant</span>
                </div>
                <button 
                    onClick={toggleSidebar}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto h-[calc(100%-60px)]">
                
                <div className="mb-6">
                    <h3 className="font-bold text-lg mb-1">{selectedSection?.title || selectedSection?.type.replace('_', ' ').toUpperCase()}</h3>
                    <p className="text-slate-400 text-sm">Optimization Checklist</p>
                </div>

                <div className="space-y-4">
                    {aiSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex gap-3 hover:border-emerald-500/50 transition-colors group cursor-default">
                             <div className="mt-1 shrink-0 text-emerald-500">
                                <Lightbulb size={18} />
                             </div>
                             <div>
                                <p className="text-sm text-slate-200 leading-relaxed font-medium">{suggestion}</p>
                                <button className="text-[10px] uppercase font-bold text-emerald-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:underline">
                                    <Wand2 size={12} />
                                    Apply this tip
                                </button>
                             </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-emerald-900/20 border border-emerald-900/50 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold uppercase">ATS Score Impact</span>
                    </div>
                    <p className="text-xs text-emerald-100/70 leading-relaxed">
                        Following these suggestions typically improves ATS parsing by 15-20%.
                    </p>
                </div>

            </div>
        </div>
    );
};
