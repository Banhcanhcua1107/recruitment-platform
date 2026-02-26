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
  aiSuggestions: string[]; // For the AI panel

  // Actions
  initCV: (mode: CVMode, templateId?: string) => void;
  loadResumeIntoStore: (sections: CVSection[], styling?: Partial<CVContent['theme']>, templateId?: string) => void;
  
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
  setAISuggestions: (suggestions: string[]) => void;
  undo: () => void;
  redo: () => void;
}

const DEFAULT_THEME = {
  colors: { primary: '#00b14f', text: '#111827', background: '#ffffff' }, // User requested Green
  fonts: { heading: 'Manrope', body: 'Manrope' }, // Clean sans-serif
  spacing: 4,
};

const INITIAL_TEMPLATE_SECTIONS: CVSection[] = [
  { 
    id: '1', 
    type: 'header', 
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      fullName: 'Nguyễn Văn A', 
      title: 'Fullstack Developer', 
      avatarUrl: '/avatars/default-avatar.png' // We'll need a real placeholder
    } 
  },
  { 
    id: '2', 
    type: 'personal_info', 
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      email: 'nguyenvana@gmail.com', 
      phone: '0123 456 789', 
      address: 'Hà Nội, Việt Nam', 
      dob: '01/01/2000' 
    } 
  },
  { 
    id: '3', 
    type: 'summary', 
    title: 'Giới thiệu chung',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      text: '- Hơn 2 năm kinh nghiệm lập trình với khả năng giao tiếp tốt và học hỏi nhanh.\n- Điểm mạnh: Công nghệ Front-end và phát triển ứng dụng web Back-end.\n- Thành thạo HTML, CSS, JavaScript.\n- Có kiến thức sâu về ReactJS và các nguyên lý cốt lõi.\n- Có kinh nghiệm với các quy trình React.js phổ biến (như Flux hoặc Redux).' 
    } 
  },
  { 
    id: '4', 
    type: 'experience_list', 
    title: 'Kinh nghiệm làm việc',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      items: [
        { 
          id: 'exp-1', 
          company: 'F8 TECHNOLOGY EDUCATION.,JSC', 
          position: 'Full-stack Developer', 
          startDate: '01/2018', 
          endDate: 'Present', 
          description: '- Lập trình các dự án outsourcing.\n- Tạo khung coding và thiết kế cơ sở dữ liệu dựa trên mô tả dự án.' 
        },
        { 
          id: 'exp-2', 
          company: 'AI&T JSC', 
          position: 'Full-stack Developer', 
          startDate: '07/2015', 
          endDate: '03/2018', 
          description: '- Tham gia phát triển dự án thương mại điện tử.\n- Tối ưu hóa hiệu năng website.' 
        }
      ] 
    } 
  },
  { 
    id: '5', 
    type: 'education_list', 
    title: 'Học vấn',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      items: [
        { 
          id: 'edu-1', 
          institution: 'FPT Polytechnic', 
          degree: 'Chuyên ngành - Lập trình Website, Mobile', 
          startDate: '10/2011', 
          endDate: '09/2014' 
        }
      ] 
    } 
  },
  { 
    id: '6', 
    type: 'skill_list', 
    title: 'Kỹ năng',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      items: [
        { id: 'skill-1', name: 'HTML, CSS, JavaScript (ReactJS, React-Native, Lit)', level: 90 },
        { id: 'skill-2', name: 'PHP (Laravel, Symfony, Codeigniter, Yii)', level: 85 },
        { id: 'skill-3', name: 'Node (ExpressJS)', level: 80 },
        { id: 'skill-4', name: 'RESTful API, GraphQL', level: 85 },
        { id: 'skill-5', name: 'MySQL, PostgreSQL, NoSQL (MongoDB)', level: 80 }
      ] 
    } 
  },
  {
    id: '7',
    type: 'award_list',
    title: 'Giải thưởng',
    isVisible: true,
    containerId: 'main-column',
    data: {
      items: [
        { id: 'aw-1', title: 'Giải nhất cuộc thi Poly', date: '06/2016', issuer: 'Poly Creative Competition 2016', description: 'Cuộc thi sáng tạo Poly' },
        { id: 'aw-2', title: 'Nhân viên xuất sắc', date: '02/2016', issuer: 'AI&T JSC', description: 'Giải thưởng nhân viên của năm' }
      ]
    }
  },
  {
    id: '8',
    type: 'project_list',
    title: 'Dự án',
    isVisible: true,
    containerId: 'main-column',
    data: {
      items: [
        { 
          id: 'proj-1', 
          name: 'FULLSTACK.EDU.VN', 
          role: 'Product Owner, BA, Developer', 
          startDate: '01/2019', 
          endDate: 'Present', 
          customer: 'F8 TECHNOLOGY EDUCATION.,JSC',
          teamSize: 1,
          technologies: 'Frontend: ReactJS\nBackend: PHP (Laravel), NodeJS, MySQL',
          description: 'Học lập trình online tại f8.edu.vn' 
        },
        { 
          id: 'proj-2', 
          name: 'MYCV.VN', 
          role: 'Developer', 
          startDate: '06/2018', 
          endDate: 'Present', 
          customer: 'MyCV JSC.',
          teamSize: 1,
          technologies: 'Frontend: ReactJS\nBackend: Node.js, MongolDB',
          description: 'Ứng dụng viết CV chuẩn, hỗ trợ tải PDF miễn phí.' 
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
  isSidebarOpen: true,
  scale: 1,
  isSaving: false,
  isDirty: false,
  history: [],
  historyIndex: -1,
  aiSuggestions: [],

  loadResumeIntoStore: (sections, styling, templateId) => {
    const initialCV: CVContent = {
      meta: { pageSize: 'A4', version: '1.0', templateId },
      theme: styling
        ? { ...DEFAULT_THEME, ...styling }
        : DEFAULT_THEME,
      layout: { type: 'fixed', columns: 12 },
      sections: sections.map((s) => ({
        ...s,
        id: s.id || uuidv4(),
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
    });
  },

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
      data: type === 'experience_list' ? { items: [] } : type === 'education_list' ? { items: [] } : {}, 
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
      return { cv: newCV, isDirty: true }; 
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
  setAISuggestions: (suggestions) => set({ aiSuggestions: suggestions }),

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
