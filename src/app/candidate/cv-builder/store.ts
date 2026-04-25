import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { CVContent, CVSection, CVMode, SectionType, CVProfile, AnySectionData, CVSelectedSectionItem } from './types';
import { normalizeCvSections, normalizeSectionDataIds } from './section-normalization';
import { appendDefaultItemToSection, createSectionFromSchema, exportCVRootJson, type CVRootJsonDocument } from './cv-json-system';
import { validateListSectionItem, validateSectionDataShape, validateSectionPayload } from './cv-json-validation';

interface CVJsonDebugSnapshot {
  action: string;
  timestamp: string;
  before: CVRootJsonDocument;
  after: CVRootJsonDocument;
}

// Redefine EditorState with new actions
interface EditorState {
  // Data
  cv: CVContent;
  mode: CVMode;
  metadata: Partial<CVProfile>; // Title, visibility, etc.
  
  // UI State
  selectedSectionId: string | null;
  selectedSectionItem: CVSelectedSectionItem | null;
  isSidebarOpen: boolean;
  scale: number;
  isSaving: boolean;
  isDirty: boolean;
  history: CVContent[]; // Simple history stack for undo
  historyIndex: number;
  aiSuggestions: string[]; // For the AI panel
  jsonDebugEnabled: boolean;
  jsonDebugSnapshot: CVJsonDebugSnapshot | null;

  // Actions
  initCV: (mode: CVMode, templateId?: string) => void;
  loadResumeIntoStore: (sections: CVSection[], styling?: Partial<CVContent['theme']>, templateId?: string) => void;
  
  // Section Management
  addSection: (type: SectionType) => void;
  duplicateSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<CVSection>) => void;
  updateSectionData: (sectionId: string, dataUpdates: Partial<AnySectionData>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  moveSectionUp: (sectionId: string) => void;
  moveSectionDown: (sectionId: string) => void;
  addListItem: (sectionId: string) => void;
  removeListItem: (sectionId: string, itemRef: number | string) => void;
  
  // Theme & Global
  updateTheme: (themeUpdates: Partial<CVContent['theme']>) => void;
  setMeta: (metaUpdates: Partial<CVContent['meta']>) => void;
  
  // UI Actions
  setSelectedSection: (id: string | null) => void;
  setSelectedSectionItem: (selection: CVSelectedSectionItem | null) => void;
  toggleSidebar: () => void;
  setScale: (scale: number) => void;
  setAISuggestions: (suggestions: string[]) => void;
  setJsonDebugEnabled: (enabled: boolean) => void;
  clearJsonDebugSnapshot: () => void;
  exportRootJson: () => CVRootJsonDocument;
  undo: () => void;
  redo: () => void;
}

function buildJsonDebugSnapshot(action: string, beforeCV: CVContent, afterCV: CVContent): CVJsonDebugSnapshot {
  return {
    action,
    timestamp: new Date().toISOString(),
    before: exportCVRootJson(beforeCV),
    after: exportCVRootJson(afterCV),
  };
}

const DEFAULT_THEME: CVContent['theme'] = {
  colors: {
    primary: '#00b14f',
    text: '#111827',
    background: '#ffffff',
    pattern: '#94a3b8',
  },
  fonts: { heading: 'Manrope', body: 'Manrope' }, // Clean sans-serif
  spacing: 4,
  appearance: {
    patternId: 'dots',
    syncPatternWithPrimary: true,
  },
};

function mergeThemeWithDefaults(styling?: Partial<CVContent['theme']>): CVContent['theme'] {
  const safeColors = styling?.colors && typeof styling.colors === 'object'
    ? styling.colors
    : undefined;
  const safeFonts = styling?.fonts && typeof styling.fonts === 'object'
    ? styling.fonts
    : undefined;
  const safeAppearance = styling?.appearance && typeof styling.appearance === 'object'
    ? styling.appearance
    : undefined;
  const safeSpacing = typeof styling?.spacing === 'number' && Number.isFinite(styling.spacing)
    ? styling.spacing
    : DEFAULT_THEME.spacing;

  return {
    ...DEFAULT_THEME,
    ...styling,
    colors: {
      ...DEFAULT_THEME.colors,
      ...(safeColors ?? {}),
    },
    fonts: {
      ...DEFAULT_THEME.fonts,
      ...(safeFonts ?? {}),
    },
    spacing: safeSpacing,
    appearance: {
      ...DEFAULT_THEME.appearance,
      ...(safeAppearance ?? {}),
    },
  };
}

const INITIAL_TEMPLATE_SECTIONS: CVSection[] = [
  { 
    id: '1', 
    type: 'header', 
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      fullName: 'Nguyen Van A', 
      title: 'Fullstack Developer', 
      avatarUrl: '/avatars/default-avatar.png'
    } 
  },
  { 
    id: '2', 
    type: 'personal_info', 
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      email: 'nguyenvana@gmail.com', 
      phone: '+84 1234567890', 
      address: 'Ha Noi, Viet Nam', 
      dob: '01/01/2000' 
    } 
  },
  { 
    id: '3', 
    type: 'summary', 
    title: 'Overview',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      text: 'Fullstack Developer with over 2 years of experience building and maintaining web applications across frontend and backend systems. Strong foundation in HTML, CSS, JavaScript, ReactJS, PHP, and RESTful APIs, with practical experience in MySQL, NoSQL, Docker, Redis, and AWS services. Comfortable working in fast-paced environments, learning new technologies quickly, and collaborating to deliver scalable and maintainable solutions.' 
    } 
  },
  { 
    id: '4', 
    type: 'skill_list', 
    title: 'Skills',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      items: [
        { id: 'skill-1', name: 'Frontend: HTML, CSS, JavaScript, ReactJS, React Native, DOM manipulation', level: 90 },
        { id: 'skill-2', name: 'Backend: PHP, RESTful APIs, GraphQL, JSON API integration', level: 88 },
        { id: 'skill-3', name: 'Database: MySQL, NoSQL, Redis', level: 82 },
        { id: 'skill-4', name: 'DevOps: Docker, Kubernetes, Rancher, AWS services', level: 80 },
        { id: 'skill-5', name: 'Tools: Git, SVN', level: 78 },
        { id: 'skill-6', name: 'Other: Good understanding of ReactJS principles and workflows', level: 76 },
        { id: 'skill-7', name: 'Other: Familiar with EcmaScript specifications', level: 74 },
        { id: 'skill-8', name: 'Other: Experience with data structure libraries', level: 72 },
        { id: 'skill-9', name: 'Other: Able to learn and apply new technologies quickly', level: 78 },
        { id: 'skill-10', name: 'Other: Comfortable working on Linux, OSX, and Windows', level: 75 }
      ] 
    } 
  },
  { 
    id: '5', 
    type: 'experience_list', 
    title: 'Work Experience',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      items: [
        { 
          id: 'exp-1', 
          company: 'F8 TECHNOLOGY EDUCATION.,JSC', 
          position: 'Fullstack Developer', 
          startDate: '01/2018', 
          endDate: 'Present', 
          description: '- Participated in outsourcing software projects for different business domains.\n- Developed frontend and backend features based on project requirements.\n- Designed coding structures and database schemas from project descriptions.\n- Worked on application maintenance, feature enhancement, and system optimization.' 
        },
        { 
          id: 'exp-2', 
          company: 'AI&T JSC', 
          position: 'Fullstack Developer', 
          startDate: '07/2015', 
          endDate: '03/2018', 
          description: '- Worked on outsourcing software projects.\n- Developed web application modules for both frontend and backend.\n- Created coding frameworks and database designs based on project requirements.' 
        },
        {
          id: 'exp-3',
          company: 'FREELANCER',
          position: 'Fullstack Developer',
          startDate: '01/2015',
          endDate: '07/2015',
          description: '- Developed web modules for client and personal projects.\n- Implemented frontend and backend features according to project needs.'
        }
      ] 
    } 
  },
  {
    id: '6',
    type: 'project_list',
    title: 'Projects',
    isVisible: true,
    containerId: 'main-column',
    data: {
      items: [
        { 
          id: 'proj-1', 
          name: 'MYCV.VN', 
          role: 'Developer', 
          startDate: '06/2018', 
          endDate: 'Present', 
          customer: 'MyCV JSC',
          teamSize: 1,
          technologies: 'ReactJS, PHP (Laravel, Lumen), NodeJS, Apache Kafka, WebSocket, MongoDB, MariaDB, Redis, Docker, AWS EC2, AWS S3, Microservice architecture, Event-driven architecture, SSO, K8S',
          description: 'Standard CV writing application with free PDF download support. Responsibilities: Developer, Solution architect.' 
        },
        { 
          id: 'proj-2', 
          name: 'BOTAYRA.FULLSTACK.EDU.VN', 
          role: 'Developer', 
          startDate: '05/2020', 
          endDate: '06/2020', 
          customer: 'MyCV JSC',
          teamSize: 1,
          technologies: 'ReactJS, TensorFlow',
          description: 'A machine learning based application that helps users avoid touching their face using webcam tracking. Responsibilities: Developer.' 
        },
        { 
          id: 'proj-3', 
          name: 'FOODHUB.VN', 
          role: 'Fullstack Developer', 
          startDate: '10/2017', 
          endDate: '01/2018', 
          customer: "O'Green Food",
          teamSize: 2,
          technologies: 'React Native, PHP, CodeIgniter, MariaDB, Memcached',
          description: 'Application for connecting organic food store chains. Responsibilities: Built frontend, Built backend.' 
        },
        {
          id: 'proj-4',
          name: 'SIEU-DAO-CHICH GAME',
          role: 'Developer',
          startDate: '09/2016',
          endDate: '12/2016',
          customer: 'Personal project',
          teamSize: 1,
          technologies: 'HTML, CSS, jQuery, PHP, Symfony, MariaDB, Memcached, Raspberry Pi 2, IP Camera, Sensors',
          description: 'Remote control online game via computer using IoT. Responsibilities: Built frontend, Built backend, Built hardware integration.'
        }
      ]
    }
  }
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
  selectedSectionItem: null,
  isSidebarOpen: true,
  scale: 1,
  isSaving: false,
  isDirty: false,
  history: [],
  historyIndex: -1,
  aiSuggestions: [],
  jsonDebugEnabled: false,
  jsonDebugSnapshot: null,

  loadResumeIntoStore: (sections, styling, templateId) => {
    const normalizedSections = normalizeCvSections(sections);
    const initialCV: CVContent = {
      meta: { pageSize: 'A4', version: '1.0', templateId },
      theme: mergeThemeWithDefaults(styling),
      layout: { type: 'fixed', columns: 12 },
      sections: normalizedSections.map((s) => ({
        ...s,
        containerId: s.containerId || 'main-column',
      })),
    };
    set({
      cv: initialCV,
      mode: 'template',
      history: [initialCV],
      historyIndex: 0,
      isDirty: false,
      selectedSectionId: null,
      selectedSectionItem: null,
    });
  },

  initCV: (mode, templateId) => {
    const sections = mode === 'template' 
      ? JSON.parse(JSON.stringify(INITIAL_TEMPLATE_SECTIONS)) 
      : []; 

    const normalizedSections = normalizeCvSections(sections as CVSection[]);
    const initialCV = {
        meta: { pageSize: 'A4', version: '1.0', templateId },
        theme: DEFAULT_THEME,
        layout: { type: mode === 'canvas' ? 'grid' : 'fixed', columns: 12 },
        sections: normalizedSections.map((s: CVSection) => ({ ...s, containerId: s.containerId || 'main-column' })),
      } as CVContent;

    set({
      mode,
      cv: initialCV,
      history: [initialCV],
      historyIndex: 0,
      selectedSectionId: null,
      selectedSectionItem: null,
    });
  },

  addSection: (type) => {
    const stateBefore = get();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CVBuilder:addSection] Before:', {
        sectionType: type,
        sectionCount: stateBefore.cv.sections.length,
      });
    }

    const newSection = createSectionFromSchema(type);
    if (!validateSectionPayload(newSection) && process.env.NODE_ENV !== 'production') {
      console.warn('[CVBuilder:addSection] Created section payload does not match expected schema', {
        sectionType: type,
        sectionId: newSection.id,
        data: newSection.data,
      });
    }
    
    set((state) => {
        const newCV = { ...state.cv, sections: [...state.cv.sections, newSection] };
        const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
        const nextDebugSnapshot = state.jsonDebugEnabled
          ? buildJsonDebugSnapshot('addSection', state.cv, newCV)
          : state.jsonDebugSnapshot;

        if (process.env.NODE_ENV !== 'production') {
          console.log('[CVBuilder:addSection] After:', {
            sectionType: type,
            insertedSectionId: newSection.id,
            sectionCount: newCV.sections.length,
          });
        }

        return {
            cv: newCV,
            selectedSectionId: newSection.id,
          selectedSectionItem: null,
            isDirty: true,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            jsonDebugSnapshot: nextDebugSnapshot,
        };
    });
  },

  duplicateSection: (sectionId) => set((state) => {
    const section = state.cv.sections.find(s => s.id === sectionId);
    if (!section) return {};
    const cloned: CVSection = JSON.parse(JSON.stringify(section));
    cloned.id = uuidv4();
    if (cloned.title) cloned.title = `${cloned.title} (bản sao)`;
    // Regenerate item IDs for list data
    const data = cloned.data as Record<string, unknown>;
    if (data.items && Array.isArray(data.items)) {
      data.items = (data.items as Record<string, unknown>[]).map(item => ({ ...item, id: uuidv4() }));
    }
    const idx = state.cv.sections.findIndex(s => s.id === sectionId);
    const sections = [...state.cv.sections];
    sections.splice(idx + 1, 0, cloned);
    const newCV = { ...state.cv, sections };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    return {
      cv: newCV,
      selectedSectionId: cloned.id,
      selectedSectionItem: null,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    };
  }),

  updateSection: (sectionId, updates) => set((state) => {
      const newCV = {
        ...state.cv,
        sections: state.cv.sections.map((s) => 
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      };
      return { cv: newCV, isDirty: true }; 
  }),

  updateSectionData: (sectionId, dataUpdates) => set((state) => {
    const newCV = {
      ...state.cv,
      sections: state.cv.sections.map((s) => 
        s.id === sectionId
          ? {
              ...s,
              data: normalizeSectionDataIds(s.type, {
                ...s.data,
                ...dataUpdates,
              } as AnySectionData),
            }
          : s
      ),
    };
    return { cv: newCV, isDirty: true };
  }),

  removeSection: (sectionId) => set((state) => {
    const sectionToRemove = state.cv.sections.find((s) => s.id === sectionId);
    if (!sectionToRemove) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CVBuilder:removeSection] Invalid sectionId: section not found', { sectionId });
      }
      return {};
    }

    const newCV = {
      ...state.cv,
      sections: state.cv.sections.filter((s) => s.id !== sectionId),
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    const nextDebugSnapshot = state.jsonDebugEnabled
      ? buildJsonDebugSnapshot('removeSection', state.cv, newCV)
      : state.jsonDebugSnapshot;
    
    return {
      cv: newCV,
      selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
      selectedSectionItem:
        state.selectedSectionItem && state.selectedSectionItem.sectionId === sectionId
          ? null
          : state.selectedSectionItem,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      jsonDebugSnapshot: nextDebugSnapshot,
    };
  }),

  reorderSections: (oldIndex, newIndex) => set((state) => {
    const sections = [...state.cv.sections];
    const [movedSection] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, movedSection);
    
    const newCV = { ...state.cv, sections };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];

    return {
      cv: newCV,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),

  moveSectionUp: (sectionId) => {
    const state = get();
    const idx = state.cv.sections.findIndex(s => s.id === sectionId);
    if (idx <= 0) return;
    const sections = [...state.cv.sections];
    [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
    const newCV = { ...state.cv, sections };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    set({ cv: newCV, isDirty: true, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  moveSectionDown: (sectionId) => {
    const state = get();
    const idx = state.cv.sections.findIndex(s => s.id === sectionId);
    if (idx < 0 || idx >= state.cv.sections.length - 1) return;
    const sections = [...state.cv.sections];
    [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
    const newCV = { ...state.cv, sections };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    set({ cv: newCV, isDirty: true, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  addListItem: (sectionId) => {
    const state = get();
    const section = state.cv.sections.find(s => s.id === sectionId);
    if (!section) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CVBuilder:addListItem] Invalid sectionId: section not found', { sectionId });
      }
      return;
    }

    const currentData = section.data as Record<string, unknown>;
    const currentItemsCount = Array.isArray(currentData.items) ? currentData.items.length : 0;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CVBuilder:addListItem] Before:', {
        sectionId,
        sectionType: section.type,
        itemsCount: currentItemsCount,
        hasValidItemsArray: Array.isArray(currentData.items),
      });
    }

    const updatedSection = appendDefaultItemToSection(section);
    if (!updatedSection) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CVBuilder:addListItem] Unable to append item for section', {
          sectionId,
          sectionType: section.type,
        });
      }
      return;
    }

    if (!validateSectionDataShape(section.type, section.data) && process.env.NODE_ENV !== 'production') {
      console.warn('[CVBuilder:addListItem] Section data is malformed before append', {
        sectionId,
        sectionType: section.type,
        data: section.data,
      });
    }

    const updatedData = updatedSection.data as Record<string, unknown>;
    const updatedItemsCount = Array.isArray(updatedData.items) ? updatedData.items.length : 0;
    const lastItem = Array.isArray(updatedData.items) && updatedData.items.length > 0
      ? updatedData.items[updatedData.items.length - 1]
      : null;
    if (lastItem && !validateListSectionItem(updatedSection.type, lastItem) && process.env.NODE_ENV !== 'production') {
      console.warn('[CVBuilder:addListItem] Added item payload is malformed', {
        sectionId,
        sectionType: updatedSection.type,
        item: lastItem,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CVBuilder:addListItem] After:', {
        sectionId,
        sectionType: section.type,
        itemsCount: updatedItemsCount,
      });
    }

    const newCV = {
      ...state.cv,
      sections: state.cv.sections.map(s => s.id === sectionId ? updatedSection : s),
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    const nextDebugSnapshot = state.jsonDebugEnabled
      ? buildJsonDebugSnapshot('addListItem', state.cv, newCV)
      : state.jsonDebugSnapshot;
    set({
      cv: newCV,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      jsonDebugSnapshot: nextDebugSnapshot,
    });
  },

  removeListItem: (sectionId, itemRef) => {
    const state = get();
    const section = state.cv.sections.find(s => s.id === sectionId);
    if (!section) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CVBuilder:removeListItem] Invalid sectionId: section not found', { sectionId, itemRef });
      }
      return;
    }

    const data = section.data as Record<string, unknown>;
    if (!data.items || !Array.isArray(data.items)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CVBuilder:removeListItem] Section has no removable items[]', {
          sectionId,
          sectionType: section.type,
          data,
        });
      }
      return;
    }

    const items = [...(data.items as Record<string, unknown>[])];
    if (items.length <= 1) {
      return;
    }

    const removeIndex = typeof itemRef === 'number'
      ? itemRef
      : items.findIndex((item) => {
          const rawId = item && typeof item === 'object' ? (item as Record<string, unknown>).id : undefined;
          return typeof rawId === 'string' && rawId === itemRef;
        });

    if (removeIndex < 0 || removeIndex >= items.length) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CVBuilder:removeListItem] Invalid item reference for removal', {
          sectionId,
          itemRef,
          itemsLength: items.length,
        });
      }
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CVBuilder:removeListItem] Before:', {
        sectionId,
        sectionType: section.type,
        itemRef,
        removeIndex,
        itemsCount: items.length,
      });
    }

    items.splice(removeIndex, 1);
    if (!validateSectionDataShape(section.type, { ...section.data, items }) && process.env.NODE_ENV !== 'production') {
      console.warn('[CVBuilder:removeListItem] Section data malformed after remove operation', {
        sectionId,
        sectionType: section.type,
        items,
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CVBuilder:removeListItem] After:', {
        sectionId,
        sectionType: section.type,
        itemRef,
        removeIndex,
        itemsCount: items.length,
      });
    }

    const newCV = {
      ...state.cv,
      sections: state.cv.sections.map(s => s.id === sectionId ? { ...s, data: { ...s.data, items } } : s),
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    const nextDebugSnapshot = state.jsonDebugEnabled
      ? buildJsonDebugSnapshot('removeListItem', state.cv, newCV)
      : state.jsonDebugSnapshot;
    set({
      cv: newCV,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      jsonDebugSnapshot: nextDebugSnapshot,
    });
  },

  updateTheme: (themeUpdates) => set((state) => {
    const nextTheme = {
      ...state.cv.theme,
      ...themeUpdates,
      colors: {
        ...state.cv.theme.colors,
        ...(themeUpdates.colors ?? {}),
      },
      fonts: {
        ...state.cv.theme.fonts,
        ...(themeUpdates.fonts ?? {}),
      },
      spacing: typeof themeUpdates.spacing === 'number' && Number.isFinite(themeUpdates.spacing)
        ? themeUpdates.spacing
        : state.cv.theme.spacing,
      appearance: {
        ...(state.cv.theme.appearance ?? {}),
        ...(themeUpdates.appearance ?? {}),
      },
    };

    return {
      cv: { ...state.cv, theme: nextTheme },
      isDirty: true,
    };
  }),

  setMeta: (metaUpdates) => set((state) => ({
    cv: { ...state.cv, meta: { ...state.cv.meta, ...metaUpdates } },
    isDirty: true
  })),

  setSelectedSection: (id) =>
    set((state) => {
      const nextSelectedSectionItem =
        id && state.selectedSectionItem?.sectionId === id
          ? state.selectedSectionItem
          : null;

      if (state.selectedSectionId === id && state.selectedSectionItem === nextSelectedSectionItem) {
        return state;
      }

      return {
        selectedSectionId: id,
        selectedSectionItem: nextSelectedSectionItem,
      };
    }),
  setSelectedSectionItem: (selection) =>
    set((state) => {
      const previous = state.selectedSectionItem;

      if (!previous && !selection) {
        return state;
      }

      if (
        previous &&
        selection &&
        previous.sectionId === selection.sectionId &&
        previous.itemIndex === selection.itemIndex &&
        previous.itemId === selection.itemId &&
        previous.itemPath === selection.itemPath
      ) {
        return state;
      }

      return { selectedSectionItem: selection };
    }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setScale: (scale) => set({ scale }),
  setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  setJsonDebugEnabled: (enabled) => set((state) => ({
    jsonDebugEnabled: enabled,
    jsonDebugSnapshot: enabled ? state.jsonDebugSnapshot : null,
  })),
  clearJsonDebugSnapshot: () => set({ jsonDebugSnapshot: null }),
  exportRootJson: () => exportCVRootJson(get().cv),

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
