"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils'; // Assuming utils exists, or I will use standard classnames

interface InlineTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string; // For styling the text
  onFocus?: () => void;
  onBlur?: () => void;
}

export const InlineText = ({ 
  value, 
  onChange, 
  placeholder = "Type here...", 
  className,
  onFocus,
  onBlur
}: InlineTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState('auto');

  useEffect(() => {
    if (spanRef.current) {
        // Measure width + a little buffer
        setWidth(`${spanRef.current.offsetWidth + 2}px`);
    }
  }, [value, isEditing]);

  const handleClick = () => {
    setIsEditing(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onBlur) onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <span className={cn("relative inline-block group", className)} onClick={handleClick}>
      {/* Invisible span to measure width */}
      <span 
        ref={spanRef} 
        className={cn("invisible absolute h-0 overflow-hidden whitespace-pre", className)}
        style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
      >
        {value || placeholder}
      </span>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-blue-50/60 border border-blue-400 rounded outline-none px-2 py-0.5 m-0 w-full text-inherit font-inherit placeholder:opacity-50 focus:ring-1 focus:ring-blue-400 transition-all"
          style={{ width: width, minWidth: '20px' }}
          placeholder={placeholder}
        />
      ) : (
        <span 
            className={cn(
                "cursor-text border-b border-transparent hover:border-slate-200 transition-colors", 
                !value && "text-slate-400 italic"
            )}
        >
          {value || placeholder}
        </span>
      )}
    </span>
  );
};
