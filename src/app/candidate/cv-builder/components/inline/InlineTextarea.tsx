"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InlineTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const InlineTextarea = ({
  value,
  onChange,
  placeholder = "Type here...",
  className,
  onFocus,
  onBlur
}: InlineTextareaProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onBlur) onBlur();
  };

  return (
    <div className="w-full relative group">
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            "w-full bg-transparent border-none outline-none resize-none overflow-hidden p-0 text-inherit font-inherit focus:ring-0",
            className
          )}
          autoFocus
          placeholder={placeholder}
        />
      ) : (
        <div 
            onClick={handleFocus}
            className={cn(
                "w-full cursor-text whitespace-pre-wrap border border-transparent hover:border-slate-100 rounded px-1 -mx-1 transition-colors min-h-[1.5em]",
                !value && "text-slate-400 italic",
                className
            )}
        >
          {value || placeholder}
        </div>
      )}
    </div>
  );
};
