'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  label?: string;
  icon?: string;
  className?: string;
}

export default function SuggestionInput({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  icon,
  className = '',
}: SuggestionInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    const query = value.toLowerCase();
    const matches = suggestions
      .filter(s => s.toLowerCase().includes(query))
      .slice(0, 8);
    
    setFilteredSuggestions(matches);
    setHighlightedIndex(-1);
  }, [value, suggestions]);

  const showDropdown = isFocused && filteredSuggestions.length > 0;

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setFilteredSuggestions([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setFilteredSuggestions([]);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-slate-600 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full rounded-xl border border-slate-300/90 bg-white/75 px-4 py-3
            text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] backdrop-blur-[2px] placeholder:text-slate-400
            focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25
            transition-all
            ${icon ? 'pl-12' : ''}
          `}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onMouseDown={() => handleSelect(suggestion)}
              className={`
                w-full px-4 py-3 text-left text-sm font-medium transition-colors
                ${index === highlightedIndex 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-700 hover:bg-slate-50'
                }
                ${index === 0 ? 'rounded-t-xl' : ''}
                ${index === filteredSuggestions.length - 1 ? 'rounded-b-xl' : ''}
              `}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
