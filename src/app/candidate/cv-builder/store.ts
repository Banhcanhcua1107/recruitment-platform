import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { CVContent, CVSection, CVMode, SectionType, CVProfile, AnySectionData } from './types';
import { normalizeCvSections, normalizeSectionDataIds } from './section-normalization';

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
  duplicateSection: (sectionId: string) => void;
  updateSection: (sectionId: string, updates: Partial<CVSection>) => void;
  updateSectionData: (sectionId: string, dataUpdates: Partial<AnySectionData>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  moveSectionUp: (sectionId: string) => void;
  moveSectionDown: (sectionId: string) => void;
  addListItem: (sectionId: string) => void;
  removeListItem: (sectionId: string, itemIndex: number) => void;
  
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
      title: 'Lập trình viên Fullstack', 
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
      address: 'Hà Nội, Việt Nam', 
      dob: '01/01/2000' 
    } 
  },
  { 
    id: '3', 
    type: 'summary', 
    title: 'Tổng quan',
    isVisible: true, 
    containerId: 'main-column', 
    data: { 
      text: '- Hơn 2 năm kinh nghiệm lập trình với kỹ năng giao tiếp tốt và khả năng học hỏi nhanh\n- Thế mạnh: Phát triển Front-end và Back-end ứng dụng web\n- Thành thạo HTML, CSS, JavaScript\n- Nắm vững JavaScript, bao gồm thao tác DOM và mô hình đối tượng JavaScript\n- Hiểu sâu về React.js và các nguyên tắc cốt lõi\n- Có kinh nghiệm với các luồng công việc React.js phổ biến (như Flux hoặc Redux)\n- Quen thuộc với các đặc tả mới của EcmaScript\n- Có kinh nghiệm với các thư viện cấu trúc dữ liệu\n- Quen thuộc với RESTful APIs\n- Kinh nghiệm mạnh về: PHP, JavaScript (ReactJS, React-native), MySQL, NoSQL, GraphQL, Redis, JSON, API, Docker, Kubernetes, Rancher, dịch vụ AWS\n- Sử dụng thành thạo các công cụ quản lý mã nguồn: SVN, GIT\n- Thành thạo hệ điều hành: Linux (Ubuntu, OSX), Windows\n- Khả năng học hỏi và áp dụng công nghệ mới nhanh chóng\n- Địa điểm làm việc hiện tại: Hà Nội, Việt Nam' 
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
          company: 'CÔNG TY CỔ PHẦN GIÁO DỤC CÔNG NGHỆ F8', 
          position: 'Lập trình viên Fullstack', 
          startDate: '01/2018', 
          endDate: 'Hiện tại', 
          description: '- Lập trình các dự án outsourcing\n- Xây dựng khung mã nguồn và thiết kế cơ sở dữ liệu dựa trên mô tả dự án' 
        },
        { 
          id: 'exp-2', 
          company: 'CÔNG TY CỔ PHẦN AI&T', 
          position: 'Lập trình viên Fullstack', 
          startDate: '07/2015', 
          endDate: '03/2018', 
          description: '- Lập trình các dự án outsourcing\n- Xây dựng khung mã nguồn và thiết kế cơ sở dữ liệu dựa trên mô tả dự án' 
        },
        { 
          id: 'exp-3', 
          company: 'LÀM VIỆC TỰ DO', 
          position: 'Lập trình viên Fullstack', 
          startDate: '01/2015', 
          endDate: '07/2015', 
          description: '- Phát triển module web cho các dự án được giao.' 
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
          institution: 'Cao đẳng FPT Polytechnic', 
          degree: 'Chuyên ngành - Lập trình Web, Di động', 
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
        { id: 'skill-1', name: 'HTML, CSS, JavaScript (ReactJS, React-Native, Lit)', level: 95 },
        { id: 'skill-2', name: 'PHP (Laravel, Symfony, Codeigniter, Yii)', level: 90 },
        { id: 'skill-3', name: 'Node (ExpressJS)', level: 85 },
        { id: 'skill-4', name: 'RESTful API, GraphQL', level: 85 },
        { id: 'skill-5', name: 'MySQL, PostgreSQL, NoSQL (MongoDB)', level: 80 },
        { id: 'skill-6', name: 'Server (Apache, Nginx, Redis, Memcached, Queue, Log, Cronjob...), Rancher, K8S, Docker', level: 80 },
        { id: 'skill-7', name: 'AWS (Load balancing, EC2, ECS, Router 53, RDS, S3)', level: 75 },
        { id: 'skill-8', name: 'Ruby (Ruby on Rails)', level: 60 },
        { id: 'skill-9', name: 'SVN, Git', level: 85 },
        { id: 'skill-10', name: 'Python (Selenium kiểm thử tự động, crawler)', level: 60 },
        { id: 'skill-11', name: 'Elasticsearch', level: 60 },
        { id: 'skill-12', name: 'Tensorflow', level: 40 }
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
        { id: 'aw-1', title: 'Cuộc thi Sáng tạo Poly 2016', date: '06/2016', issuer: 'Cuộc thi Sáng tạo Poly 2016', description: 'Giải nhất trong 2 cuộc thi "Sáng tạo POLY & FE Bắc - Trung - Nam". Giải Nhất.' },
        { id: 'aw-2', title: 'Cuộc thi Sáng tạo FE 2016', date: '08/2016', issuer: 'Cuộc thi Sáng tạo FE 2016', description: 'Cuộc thi sáng tạo FE' },
        { id: 'aw-3', title: 'Nhân viên xuất sắc AI&T JSC', date: '02/2016', issuer: 'AI&T JSC', description: 'Giải thưởng Nhân viên xuất sắc' }
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
          role: 'Chủ sản phẩm, BA, Lập trình viên, Tester, Biên tập video', 
          startDate: '01/2019', 
          endDate: 'Hiện tại', 
          customer: 'CÔNG TY CỔ PHẦN GIÁO DỤC CÔNG NGHỆ F8',
          teamSize: 1,
          technologies: 'Frontend: ReactJS\nBackend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3\nKiến trúc: Microservice - Event driven (triển khai với K8S), Websocket, SSO',
          description: 'Học lập trình trực tuyến (https://f8.edu.vn)' 
        },
        { 
          id: 'proj-2', 
          name: 'MYCV.VN', 
          role: 'Lập trình viên', 
          startDate: '06/2018', 
          endDate: 'Hiện tại', 
          customer: 'Công ty MyCV.',
          teamSize: 1,
          technologies: 'Frontend: ReactJS\nBackend: PHP (Laravel, Lumen), NodeJS, Apache Kafka, Websocket, Mongodb, MariaDB, Redis, Docker, AWS EC2, AWS S3\nKiến trúc: Microservice - Event driven (triển khai với K8S), Websocket, SSO',
          description: 'Ứng dụng viết CV chuẩn, luôn hỗ trợ tải PDF miễn phí (https://mycv.vn)' 
        },
        { 
          id: 'proj-3', 
          name: 'BOTAYRA.FULLSTACK.EDU.VN', 
          role: 'Lập trình viên', 
          startDate: '05/2020', 
          endDate: '06/2020', 
          customer: 'Công ty MyCV.',
          teamSize: 1,
          technologies: 'Frontend: ReactJS, Tensorflow',
          description: 'Công cụ giúp bạn tránh chạm tay lên mặt sử dụng webcam và machine learning.' 
        },
        { 
          id: 'proj-4', 
          name: 'FOODHUB.VN', 
          role: 'Lập trình viên Fullstack', 
          startDate: '10/2017', 
          endDate: '01/2018', 
          customer: "O'Green Food",
          teamSize: 2,
          technologies: 'Frontend: Web + App (React-Native)\nBackend: PHP - Codeigniter, MariaDB, Memcached',
          description: 'Ứng dụng kết nối chuỗi cửa hàng thực phẩm sạch (https://www.foodhub.vn/)' 
        },
        { 
          id: 'proj-5', 
          name: 'GAME SIÊU ĐẠO CHÍCH', 
          role: 'Lập trình viên', 
          startDate: '09/2016', 
          endDate: '12/2016', 
          customer: 'Dự án cá nhân',
          teamSize: 1,
          technologies: 'Frontend: HTML, CSS, Jquery\nBackend: PHP - Symfony, MariaDB, Memcached\nKhác: Raspberry Pi 2, 6 camera IP & các cảm biến, thiết bị phần cứng khác',
          description: 'Game điều khiển từ xa trực tuyến qua máy tính sử dụng IoT' 
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
    const normalizedSections = normalizeCvSections(sections);
    const initialCV: CVContent = {
      meta: { pageSize: 'A4', version: '1.0', templateId },
      theme: styling
        ? { ...DEFAULT_THEME, ...styling }
        : DEFAULT_THEME,
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
      historyIndex: 0
    });
  },

  addSection: (type) => {
    const DEFAULT_DATA: Record<string, unknown> = {
      header: { fullName: '', title: '', avatarUrl: '' },
      personal_info: { email: '', phone: '', address: '', dob: '' },
      summary: { text: '' },
      rich_outline: { nodes: [] },
      experience_list: { items: [{ id: uuidv4(), company: '', position: '', startDate: '', endDate: '', description: '' }] },
      education_list: { items: [{ id: uuidv4(), institution: '', degree: '', startDate: '', endDate: '' }] },
      skill_list: { items: [{ id: uuidv4(), name: '', level: 50 }] },
      project_list: { items: [{ id: uuidv4(), name: '', role: '', startDate: '', endDate: '', description: '', technologies: '', customer: '', teamSize: 1 }] },
      award_list: { items: [{ id: uuidv4(), title: '', date: '', issuer: '', description: '' }] },
      certificate_list: { items: [{ id: uuidv4(), name: '', issuer: '', date: '', url: '' }] },
      custom_text: { text: '' },
    };

    const SECTION_TITLES: Record<string, string> = {
      rich_outline: 'Structured Outline',
      header: '',
      personal_info: '',
      summary: 'Tổng quan',
      experience_list: 'Kinh nghiệm làm việc',
      education_list: 'Học vấn',
      skill_list: 'Kỹ năng',
      project_list: 'Dự án',
      award_list: 'Giải thưởng',
      certificate_list: 'Chứng chỉ',
      custom_text: 'Mục tùy chỉnh',
    };

    const newSection: CVSection = {
      id: uuidv4(),
      type,
      title: SECTION_TITLES[type] || '',
      isVisible: true,
      containerId: 'main-column',
      data: (DEFAULT_DATA[type] || {}) as AnySectionData,
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
    return { cv: newCV, selectedSectionId: cloned.id, isDirty: true, history: newHistory, historyIndex: newHistory.length - 1 };
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
    if (!section) return;
    const data = section.data as Record<string, unknown>;
    if (!data.items || !Array.isArray(data.items)) return;

    const newItemMap: Record<string, () => Record<string, unknown>> = {
      experience_list: () => ({ id: uuidv4(), company: '', position: '', startDate: '', endDate: '', description: '' }),
      education_list: () => ({ id: uuidv4(), institution: '', degree: '', startDate: '', endDate: '' }),
      skill_list: () => ({ id: uuidv4(), name: '', level: 50 }),
      project_list: () => ({ id: uuidv4(), name: '', role: '', startDate: '', endDate: '', description: '', technologies: '', customer: '', teamSize: 1 }),
      award_list: () => ({ id: uuidv4(), title: '', date: '', issuer: '', description: '' }),
      certificate_list: () => ({ id: uuidv4(), name: '', issuer: '', date: '', url: '' }),
    };

    const factory = newItemMap[section.type];
    if (!factory) return;

    const newItems = [...(data.items as Record<string, unknown>[]), factory()];
    const newCV = {
      ...state.cv,
      sections: state.cv.sections.map(s => s.id === sectionId ? { ...s, data: { ...s.data, items: newItems } } : s),
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    set({ cv: newCV, isDirty: true, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  removeListItem: (sectionId, itemIndex) => {
    const state = get();
    const section = state.cv.sections.find(s => s.id === sectionId);
    if (!section) return;
    const data = section.data as Record<string, unknown>;
    if (!data.items || !Array.isArray(data.items)) return;
    const items = [...(data.items as Record<string, unknown>[])];
    if (items.length <= 1) return; // Don't remove last item
    items.splice(itemIndex, 1);
    const newCV = {
      ...state.cv,
      sections: state.cv.sections.map(s => s.id === sectionId ? { ...s, data: { ...s.data, items } } : s),
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newCV];
    set({ cv: newCV, isDirty: true, history: newHistory, historyIndex: newHistory.length - 1 });
  },

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
