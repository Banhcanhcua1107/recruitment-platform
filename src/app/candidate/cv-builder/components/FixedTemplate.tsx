import React from 'react';
import { useCVStore } from '../store';
import { CVComponentRenderer } from './registry';

export const FixedTemplate = () => {
  const { cv } = useCVStore();

  // Sort by some criteria if needed, or just map
  // In template mode, sections might have a fixed order defined by the template meta
  // For now, we render in array order.
  
  return (
    <div className="w-full h-full bg-white text-slate-900 p-12 space-y-8">
        {cv.sections.map(section => (
            <div key={section.id} className="relative group hover:bg-slate-50 transition-colors p-2 -m-2 rounded-lg border border-transparent hover:border-slate-100">
                <CVComponentRenderer section={section} />
            </div>
        ))}

        {cv.sections.length === 0 && (
            <div className="text-center text-slate-300 py-20 font-bold uppercase tracking-widest text-sm border-2 border-dashed border-slate-100 rounded-xl">
                Empty CV - Add Content to Start
            </div>
        )}
    </div>
  );
};
