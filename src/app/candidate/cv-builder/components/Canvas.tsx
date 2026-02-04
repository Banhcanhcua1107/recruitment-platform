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
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCVStore } from '../store';
import { CVComponentRenderer } from './registry';
import clsx from 'clsx';

// -- Sortable Item Wrapper --
const SortableSection = ({ id, children, isSelected, onClick }: { id: string, children: React.ReactNode, isSelected: boolean, onClick: (e: React.MouseEvent) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={clsx(
                "relative transition-all mb-4 group",
                isSelected ? "ring-2 ring-primary z-20" : "hover:ring-1 hover:ring-blue-300"
            )}
            onClick={onClick}
        >
             {/* Drag Handle Overlay - Only visible on hover/selection for better UX */}
             <div 
                {...attributes} 
                {...listeners} 
                className={clsx(
                    "absolute -left-8 top-1/2 -translate-y-1/2 p-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary transition-colors",
                    "opacity-0 group-hover:opacity-100",
                    isSelected ? "opacity-100" : ""
                )}
             >
                <span className="material-symbols-outlined text-lg">drag_indicator</span>
             </div>

             {/* Content */}
             <div className="bg-transparent">
                {children}
             </div>
        </div>
    );
};


export const Canvas = () => {
    const { cv, reorderSections, setSelectedSection, selectedSectionId } = useCVStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
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

    // Filter sections for the main column (if we add sidebar later, we filter here)
    const sections = cv.sections.filter(s => s.containerId === 'main-column');

    return (
        <div className="w-full h-full p-10 bg-white shadow-sm min-h-[297mm] relative print:shadow-none print:p-0">
             <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
             >
                <SortableContext 
                    items={sections.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {sections.map(section => (
                        <SortableSection 
                            key={section.id} 
                            id={section.id}
                            isSelected={selectedSectionId === section.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSection(section.id);
                            }}
                        >
                            <CVComponentRenderer section={section} />
                        </SortableSection>
                    ))}
                </SortableContext>
             </DndContext>

             {sections.length === 0 && (
                 <div className="h-40 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">post_add</span>
                    <p>Drag content from the sidebar here</p>
                 </div>
             )}
        </div>
    );
};
