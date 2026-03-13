"use client";

import React from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCVStore } from '../store';
import { CVComponentRenderer } from './registry';
import { EditableBlock } from './EditableBlock';

export const Canvas = () => {
    const { cv, reorderSections } = useCVStore();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px drag before activating to prevent accidental drags when clicking to type
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (active.id !== over?.id) {
            const oldIndex = cv.sections.findIndex((s) => s.id === active.id);
            const newIndex = cv.sections.findIndex((s) => s.id === over?.id);
            reorderSections(oldIndex, newIndex);
        }
    };

    const sidebarSections = cv.sections.filter(s => s.containerId === 'sidebar-column');
    const mainSections = cv.sections.filter(s => s.containerId !== 'sidebar-column');

    const renderSectionList = (sections: typeof cv.sections) => (
        <SortableContext 
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
        >
            {sections.map(section => (
                <EditableBlock key={section.id} id={section.id}>
                    <div className="mb-4">
                        <CVComponentRenderer section={section} theme={cv.theme} />
                    </div>
                </EditableBlock>
            ))}
        </SortableContext>
    );

    const hasSections = cv.sections.length > 0;

    return (
        <div 
            className="w-full h-full p-12 bg-white text-slate-900 shadow-sm min-h-[297mm] relative print:shadow-none print:p-0 transition-all duration-300 ease-in-out"
            style={{ 
                fontFamily: cv.theme.fonts.body,
                fontSize: `${cv.theme.spacing * 3.5}px` // Base size approx 14px
            }}
        >
             <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                {sidebarSections.length > 0 ? (
                    <div className="grid grid-cols-[minmax(240px,0.34fr)_minmax(0,0.66fr)] gap-8 items-start">
                        <aside className="min-h-full rounded-2xl bg-slate-50/90 px-5 py-6 border border-slate-200/80">
                            {renderSectionList(sidebarSections)}
                        </aside>
                        <section>
                            {renderSectionList(mainSections)}
                        </section>
                    </div>
                ) : (
                    <section>
                        {renderSectionList(mainSections)}
                    </section>
                )}
             </DndContext>

             {!hasSections && (
                 <div className="h-60 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                    <span className="material-symbols-outlined text-4xl mb-2">post_add</span>
                    <p>Your CV is empty.</p>
                    <p className="text-xs mt-1">Add sections from the sidebar.</p>
                 </div>
             )}
        </div>
    );
};
