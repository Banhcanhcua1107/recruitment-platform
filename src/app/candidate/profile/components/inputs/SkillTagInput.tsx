'use client';

import { useState, useRef, KeyboardEvent, useMemo } from 'react';
import skillsData from '@/data/suggestions/skills.json';

interface SkillTagInputProps {
  skills: Array<{ id: string; name: string; category?: string }>;
  onChange: (skills: Array<{ id: string; name: string; category?: string }>) => void;
  placeholder?: string;
  maxSkills?: number;
}

export default function SkillTagInput({
  skills,
  onChange,
  placeholder = 'Nhập kỹ năng...',
  maxSkills = 20,
}: SkillTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all skills for suggestions
  const allSkills = useMemo(() => {
    const result: Array<{ name: string; category: string }> = [];
    Object.entries(skillsData).forEach(([category, items]) => {
      (items as string[]).forEach(name => {
        result.push({ name, category });
      });
    });
    return result;
  }, []);

  // Filter suggestions
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    
    const query = inputValue.toLowerCase();
    const addedNames = new Set(skills.map(s => s.name.toLowerCase()));
    
    return allSkills
      .filter(s => 
        s.name.toLowerCase().includes(query) && 
        !addedNames.has(s.name.toLowerCase())
      )
      .slice(0, 6);
  }, [inputValue, skills, allSkills]);

  const showDropdown = isFocused && suggestions.length > 0;

  const addSkill = (name: string, category?: string) => {
    if (skills.length >= maxSkills) return;
    
    // Check for duplicates
    const exists = skills.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setInputValue('');
      return;
    }

    const newSkill = {
      id: crypto.randomUUID(),
      name,
      category,
    };

    onChange([...skills, newSkill]);
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeSkill = (id: string) => {
    onChange(skills.filter(s => s.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        if (showDropdown) {
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        if (showDropdown) {
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          const s = suggestions[highlightedIndex];
          addSkill(s.name, s.category);
        } else if (inputValue.trim()) {
          addSkill(inputValue.trim());
        }
        break;
      case 'Backspace':
        if (!inputValue && skills.length > 0) {
          removeSkill(skills[skills.length - 1].id);
        }
        break;
      case 'Escape':
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Category colors
  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      frontend: 'bg-blue-100 text-blue-700 border-blue-200',
      backend: 'bg-green-100 text-green-700 border-green-200',
      database: 'bg-purple-100 text-purple-700 border-purple-200',
      devops: 'bg-orange-100 text-orange-700 border-orange-200',
      mobile: 'bg-pink-100 text-pink-700 border-pink-200',
      data: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      design: 'bg-rose-100 text-rose-700 border-rose-200',
      soft_skills: 'bg-amber-100 text-amber-700 border-amber-200',
      tools: 'bg-slate-100 text-slate-700 border-slate-200',
      marketing: 'bg-violet-100 text-violet-700 border-violet-200',
    };
    return colors[category || ''] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="relative">
      {/* Tags Container */}
      <div 
        className={`
          min-h-[56px] px-4 py-2 bg-slate-50 border rounded-xl flex flex-wrap gap-2 items-center
          transition-all cursor-text
          ${isFocused ? 'border-primary ring-2 ring-primary/20 bg-white' : 'border-slate-200'}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing Tags */}
        {skills.map(skill => (
          <span
            key={skill.id}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${getCategoryColor(skill.category)}`}
          >
            {skill.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSkill(skill.id);
              }}
              className="hover:bg-black/10 rounded p-0.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </span>
        ))}

        {/* Input */}
        {skills.length < maxSkills && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={skills.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none p-1 text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        )}
      </div>

      {/* Counter */}
      <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
        <span>Nhấn Enter để thêm</span>
        <span>{skills.length}/{maxSkills}</span>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.name}
              onMouseDown={() => addSkill(suggestion.name, suggestion.category)}
              className={`
                w-full px-4 py-3 text-left flex items-center justify-between transition-colors
                ${index === highlightedIndex ? 'bg-primary/10' : 'hover:bg-slate-50'}
              `}
            >
              <span className="font-medium text-slate-900">{suggestion.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(suggestion.category)}`}>
                {suggestion.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
