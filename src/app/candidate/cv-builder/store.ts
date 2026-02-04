import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { CVContent, CVSection, CVMode, SectionType, CVProfile, AnySectionData } from './types';

// Redefine EditorState with new actions
interface EditorState {
  // Data
  cv: CVContent;
  mode: CVMode;
  metadata: Partial<CVProfile>; // Title, visibility, etc.
  
  // UI State
  selectedSectionId: string | null;
  isSidebarOpen: boolean;
  scale: number;
  isSaving: boolean;
  isDirty: boolean;
  history: CVContent[]; // Simple history stack for undo
  historyIndex: number;

  // Actions
  initCV: (mode: CVMode, templateId?: string) => void;
  
  // Section Management
  addSection: (type: SectionType) => void;
  updateSection: (sectionId: string, updates: Partial<CVSection>) => void;
  updateSectionData: (sectionId: string, dataUpdates: Partial<AnySectionData>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void; 
  
  // Theme & Global
  updateTheme: (themeUpdates: Partial<CVContent['theme']>) => void;
  setMeta: (metaUpdates: Partial<CVContent['meta']>) => void;
  
  // UI Actions
  setSelectedSection: (id: string | null) => void;
  toggleSidebar: () => void;
  setScale: (scale: number) => void;
  undo: () => void;
  redo: () => void;
}

const DEFAULT_THEME = {
  colors: { primary: '#2563eb', text: '#0f172a', background: '#ffffff' },
  fonts: { heading: 'Inter', body: 'Inter' },
  spacing: 4,
};

const INITIAL_TEMPLATE_SECTIONS: CVSection[] = [
  { id: '1', type: 'personal_info', isVisible: true, containerId: 'main-column', data: { fullName: 'Your Name', email: 'email@example.com' } },
  { id: '2', type: 'summary', isVisible: true, containerId: 'main-column', data: { text: 'Professional summary goes here...' } },
  { id: '3', type: 'experience_list', isVisible: true, containerId: 'main-column', data: { items: [] } },
  { id: '4', type: 'education_list', isVisible: true, containerId: 'main-column', data: { items: [] } },
  { id: '5', type: 'skill_list', isVisible: true, containerId: 'main-column', data: { items: [] } },
];

export const useCVStore = create<EditorState>((set, get) => ({
  cv: {
    meta: { pageSize: 'A4', version: '1.0' },
    theme: DEFAULT_THEME,
    layout: { type: 'fixed', columns: 12 },
    sections: [],
  },
  mode: 'template',
  metadata: { title: 'Untitled CV' },
  
  selectedSectionId: null,
  isSidebarOpen: true,
  scale: 1,
  isSaving: false,
  isDirty: false,
  history: [],
  historyIndex: -1,

  initCV: (mode, templateId) => {
    const sections = mode === 'template' 
      ? JSON.parse(JSON.stringify(INITIAL_TEMPLATE_SECTIONS)) 
      : []; 

    const initialCV = {
        meta: { pageSize: 'A4', version: '1.0', templateId },
        theme: DEFAULT_THEME,
        layout: { type: mode === 'canvas' ? 'grid' : 'fixed', columns: 12 },
        sections: sections.map((s: CVSection) => ({ ...s, id: s.id || uuidv4(), containerId: s.containerId || 'main-column' })),
      } as CVContent;

    set({
      mode,
      cv: initialCV,
      history: [initialCV],
      historyIndex: 0
    });
  },

  addSection: (type) => {
    const newSection: CVSection = {
      id: uuidv4(),
      type,
      isVisible: true,
      containerId: 'main-column',
      data: {}, 
    };
    
    set((state) => {
        const newCV = { ...state.cv, sections: [...state.cv.sections, newSection] };
        const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
        return {
            cv: newCV,
            selectedSectionId: newSection.id,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1
        };
    });
  },

  updateSection: (sectionId, updates) => set((state) => {
      const newCV = {
        ...state.cv,
        sections: state.cv.sections.map((s) => 
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      };
      return { cv: newCV, isDirty: true }; // Should optimize history push here (debounce?)
  }),

  updateSectionData: (sectionId, dataUpdates) => set((state) => {
    const newCV = {
      ...state.cv,
      sections: state.cv.sections.map((s) => 
        s.id === sectionId ? { ...s, data: { ...s.data, ...dataUpdates } } : s
      ),
    };
    return { cv: newCV, isDirty: true };
  }),

  removeSection: (sectionId) => set((state) => {
    const newCV = {
      ...state.cv,
      sections: state.cv.sections.filter((s) => s.id !== sectionId),
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    
    return {
      cv: newCV,
      selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  reorderSections: (oldIndex, newIndex) => set((state) => {
    const sections = [...state.cv.sections];
    const [movedSection] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, movedSection);
    
    const newCV = { ...state.cv, sections };
    // Creating history point for reordering
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];

    return {
      cv: newCV,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  updateTheme: (themeUpdates) => set((state) => ({
    cv: { ...state.cv, theme: { ...state.cv.theme, ...themeUpdates } },
    isDirty: true
  })),

  setMeta: (metaUpdates) => set((state) => ({
    cv: { ...state.cv, meta: { ...state.cv.meta, ...metaUpdates } },
    isDirty: true
  })),

  setSelectedSection: (id) => set({ selectedSectionId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setScale: (scale) => set({ scale }),

  undo: () => set((state) => {
      if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          return {
              cv: state.history[newIndex],
              historyIndex: newIndex
          };
      }
      return {};
  }),

  redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          return {
              cv: state.history[newIndex],
              historyIndex: newIndex
          };
      }
      return {};
  }),
}));
