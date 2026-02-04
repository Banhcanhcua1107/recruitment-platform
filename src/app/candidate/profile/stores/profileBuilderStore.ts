import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { 
  ProfileDocument, 
  Section, 
  SectionType, 
  SectionContent,
  getDefaultContent,
  createEmptyDocument 
} from '../types/profile';

// Debounce utility
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface ProfileBuilderState {
  // Document state
  document: ProfileDocument | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
  
  // UI state
  isAddPanelOpen: boolean;
  editingSectionId: string | null;
  
  // Internal
  _debouncedSave: (() => void) | null;
  
  // Actions
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
  
  addSection: (type: SectionType) => void;
  updateSection: (sectionId: string, content: SectionContent) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  
  setAddPanelOpen: (open: boolean) => void;
  setEditingSection: (sectionId: string | null) => void;
  
  // Helpers
  _triggerAutosave: () => void;
}

export const useProfileBuilder = create<ProfileBuilderState>((set, get) => {
  // Create debounced save function
  const debouncedSave = debounce(() => {
    get().saveProfile();
  }, 1500);

  return {
    // Initial state
    document: null,
    isLoading: true,
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false,
    isAddPanelOpen: false,
    editingSectionId: null,
    _debouncedSave: debouncedSave,

    // Load profile from Supabase
    loadProfile: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Not logged in - use empty document for demo
          const emptyDoc = createEmptyDocument();
          set({ document: emptyDoc, isLoading: false });
          return;
        }

        const { data, error } = await supabase
          .from('candidate_profiles')
          .select('document')
          .eq('user_id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // No profile exists, create empty one
          const emptyDoc = createEmptyDocument();
          
          const { error: insertError } = await supabase
            .from('candidate_profiles')
            .insert({ user_id: user.id, document: emptyDoc });
          
          if (insertError) {
            // Table might not exist - fallback to local state
            console.warn('Could not create profile, using local state:', insertError);
            set({ document: emptyDoc, isLoading: false });
            return;
          }
          
          set({ document: emptyDoc, isLoading: false });
        } else if (error) {
          // Any other error (including table not existing) - fallback to demo mode
          console.warn('Database error, using demo mode:', error);
          const emptyDoc = createEmptyDocument();
          set({ document: emptyDoc, isLoading: false });
        } else {
          set({ document: data.document as ProfileDocument, isLoading: false });
        }
      } catch (err) {
        console.error('Load profile error:', err);
        // Fallback to demo mode
        const emptyDoc = createEmptyDocument();
        set({ 
          document: emptyDoc,
          isLoading: false,
        });
      }
    },

    // Save profile to Supabase
    saveProfile: async () => {
      const { document, hasUnsavedChanges } = get();
      if (!document || !hasUnsavedChanges) return;
      
      set({ isSaving: true, error: null });
      
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Not authenticated');
        }

        // Update meta timestamp
        const updatedDocument: ProfileDocument = {
          ...document,
          meta: {
            ...document.meta,
            updatedAt: new Date().toISOString(),
          },
        };

        const { error } = await supabase
          .from('candidate_profiles')
          .update({ document: updatedDocument })
          .eq('user_id', user.id);

        if (error) throw error;

        set({ 
          document: updatedDocument,
          isSaving: false, 
          lastSaved: new Date(),
          hasUnsavedChanges: false,
        });
      } catch (err) {
        console.error('Save profile error:', err);
        set({ 
          isSaving: false, 
          error: 'Lưu thất bại. Đang thử lại...' 
        });
        
        // Retry after 3 seconds
        setTimeout(() => get().saveProfile(), 3000);
      }
    },

    // Add new section
    addSection: (type: SectionType) => {
      set((state) => {
        if (!state.document) return state;
        
        // Check if section already exists (for single-instance sections)
        const singleInstanceTypes: SectionType[] = [
          'personal_info', 'summary', 'skills', 'languages', 'career_goal', 'links'
        ];
        
        if (singleInstanceTypes.includes(type)) {
          const exists = state.document.sections.some(s => s.type === type);
          if (exists) {
            return state; // Don't add duplicate
          }
        }
        
        const newSection: Section = {
          id: crypto.randomUUID(),
          type,
          order: state.document.sections.length,
          isHidden: false,
          content: getDefaultContent(type),
        };
        
        return {
          document: {
            ...state.document,
            sections: [...state.document.sections, newSection],
          },
          hasUnsavedChanges: true,
          isAddPanelOpen: false, // Close panel after adding
          editingSectionId: newSection.id, // Start editing immediately
        };
      });
      
      get()._triggerAutosave();
    },

    // Update section content
    updateSection: (sectionId: string, content: SectionContent) => {
      set((state) => {
        if (!state.document) return state;
        
        return {
          document: {
            ...state.document,
            sections: state.document.sections.map(s =>
              s.id === sectionId ? { ...s, content } : s
            ),
          },
          hasUnsavedChanges: true,
        };
      });
      
      get()._triggerAutosave();
    },

    // Remove section
    removeSection: (sectionId: string) => {
      set((state) => {
        if (!state.document) return state;
        
        const filteredSections = state.document.sections
          .filter(s => s.id !== sectionId)
          .map((s, i) => ({ ...s, order: i })); // Re-order
        
        return {
          document: {
            ...state.document,
            sections: filteredSections,
          },
          hasUnsavedChanges: true,
          editingSectionId: state.editingSectionId === sectionId ? null : state.editingSectionId,
        };
      });
      
      get()._triggerAutosave();
    },

    // Reorder sections (for drag-drop)
    reorderSections: (oldIndex: number, newIndex: number) => {
      set((state) => {
        if (!state.document) return state;
        
        const sections = [...state.document.sections];
        const [moved] = sections.splice(oldIndex, 1);
        sections.splice(newIndex, 0, moved);
        
        // Update order property
        const reorderedSections = sections.map((s, i) => ({ ...s, order: i }));
        
        return {
          document: {
            ...state.document,
            sections: reorderedSections,
          },
          hasUnsavedChanges: true,
        };
      });
      
      get()._triggerAutosave();
    },

    // Toggle section visibility
    toggleSectionVisibility: (sectionId: string) => {
      set((state) => {
        if (!state.document) return state;
        
        return {
          document: {
            ...state.document,
            sections: state.document.sections.map(s =>
              s.id === sectionId ? { ...s, isHidden: !s.isHidden } : s
            ),
          },
          hasUnsavedChanges: true,
        };
      });
      
      get()._triggerAutosave();
    },

    // UI actions
    setAddPanelOpen: (open: boolean) => set({ isAddPanelOpen: open }),
    setEditingSection: (sectionId: string | null) => set({ editingSectionId: sectionId }),

    // Internal: Trigger debounced autosave
    _triggerAutosave: () => {
      const { _debouncedSave } = get();
      if (_debouncedSave) {
        _debouncedSave();
      }
    },
  };
});

// Stable empty array to avoid infinite re-renders
const EMPTY_SECTIONS: Section[] = [];

// Selector hooks for performance
export const useProfileDocument = () => useProfileBuilder((s) => s.document);
export const useProfileSections = () => useProfileBuilder((s) => s.document?.sections || EMPTY_SECTIONS);
export const useProfileLoading = () => useProfileBuilder((s) => s.isLoading);
export const useProfileSaving = () => {
  const isSaving = useProfileBuilder((s) => s.isSaving);
  const lastSaved = useProfileBuilder((s) => s.lastSaved);
  return { isSaving, lastSaved };
};
export const useProfileError = () => useProfileBuilder((s) => s.error);
