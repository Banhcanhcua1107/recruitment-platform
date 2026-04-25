'use client';

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import {
  buildLegacyProfilePatchFromDocument,
  buildProfileDocumentFromLegacyProfile,
  resolveCandidateProfileDocument,
} from '@/lib/candidate-profile-document';
import type {
  CandidateProfileVisibility,
  CandidateWorkExperience,
} from '@/types/candidate-profile';
import {
  createEmptyDocument,
  getDefaultContent,
  type ProfileDocument,
  type Section,
  type SectionContent,
  type SectionType,
} from '../types/profile';

interface ProfilePreviewSource {
  fullName: string;
  avatarUrl: string | null;
  headline: string;
  email: string;
  phone: string;
  location: string;
  cvUrl: string | null;
  updatedAt: string | null;
  workExperiences: CandidateWorkExperience[];
}

function createEmptyPreviewSource(document?: ProfileDocument | null): ProfilePreviewSource {
  return {
    fullName: '',
    avatarUrl: null,
    headline: '',
    email: '',
    phone: '',
    location: '',
    cvUrl: null,
    updatedAt: document?.meta.updatedAt || null,
    workExperiences: [],
  };
}

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
  document: ProfileDocument | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
  previewSource: ProfilePreviewSource | null;
  profileVisibility: CandidateProfileVisibility;
  isAddPanelOpen: boolean;
  editingSectionId: string | null;
  _debouncedSave: (() => void) | null;
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
  addSection: (type: SectionType) => void;
  updateSection: (sectionId: string, content: SectionContent) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (oldIndex: number, newIndex: number) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  setProfileVisibility: (visibility: CandidateProfileVisibility) => void;
  setAddPanelOpen: (open: boolean) => void;
  setEditingSection: (sectionId: string | null) => void;
  _triggerAutosave: () => void;
}

export const useProfileBuilder = create<ProfileBuilderState>((set, get) => {
  const debouncedSave = debounce(() => {
    void get().saveProfile();
  }, 1500);

  return {
    document: null,
    isLoading: true,
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false,
    previewSource: null,
    profileVisibility: 'public',
    isAddPanelOpen: false,
    editingSectionId: null,
    _debouncedSave: debouncedSave,

    loadProfile: async () => {
      set({ isLoading: true, error: null });

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          const emptyDoc = createEmptyDocument();
          set({
            document: emptyDoc,
            previewSource: createEmptyPreviewSource(emptyDoc),
            profileVisibility: 'public',
            isLoading: false,
          });
          return;
        }

        const { data, error } = await supabase
          .from('candidate_profiles')
          .select(
            'document, full_name, avatar_url, headline, email, phone, location, introduction, skills, work_experiences, educations, cv_url, updated_at, profile_visibility'
          )
          .eq('user_id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          const emptyDoc = buildProfileDocumentFromLegacyProfile({});

          const { error: insertError } = await supabase.from('candidate_profiles').insert({
            user_id: user.id,
            document: emptyDoc,
            profile_visibility: 'public',
          });

          if (insertError) {
            console.warn('Could not create profile, using local state:', insertError);
            set({
              document: emptyDoc,
              previewSource: createEmptyPreviewSource(emptyDoc),
              profileVisibility: 'public',
              isLoading: false,
            });
            return;
          }

          set({
            document: emptyDoc,
            previewSource: createEmptyPreviewSource(emptyDoc),
            profileVisibility: 'public',
            isLoading: false,
          });
          return;
        }

        if (error) {
          console.warn('Database error, using demo mode:', error);
          const emptyDoc = createEmptyDocument();
          set({
            document: emptyDoc,
            previewSource: createEmptyPreviewSource(emptyDoc),
            profileVisibility: 'public',
            isLoading: false,
          });
          return;
        }

        const workExperiences = data.work_experiences ?? [];
        const resolvedDocument = resolveCandidateProfileDocument({
          document: data.document,
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          headline: data.headline,
          email: data.email,
          phone: data.phone,
          location: data.location,
          introduction: data.introduction,
          skills: data.skills,
          workExperiences,
          educations: data.educations,
        });

        set({
          document: resolvedDocument,
          previewSource: {
            fullName: data.full_name || '',
            avatarUrl: data.avatar_url || null,
            headline: data.headline || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            cvUrl: data.cv_url || null,
            updatedAt: data.updated_at || resolvedDocument.meta.updatedAt || null,
            workExperiences,
          },
          profileVisibility: data.profile_visibility === 'private' ? 'private' : 'public',
          isLoading: false,
        });
      } catch (err) {
        console.error('Load profile error:', err);
        const emptyDoc = createEmptyDocument();
        set({
          document: emptyDoc,
          previewSource: createEmptyPreviewSource(emptyDoc),
          profileVisibility: 'public',
          isLoading: false,
        });
      }
    },

    saveProfile: async () => {
      const { document, hasUnsavedChanges, profileVisibility } = get();
      if (!document || !hasUnsavedChanges) {
        return;
      }

      set({ isSaving: true, error: null });

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Not authenticated');
        }

        const updatedDocument: ProfileDocument = {
          ...document,
          meta: {
            ...document.meta,
            updatedAt: new Date().toISOString(),
          },
        };
        const legacyPatch = buildLegacyProfilePatchFromDocument(updatedDocument);

        const { error } = await supabase
          .from('candidate_profiles')
          .update({
            document: updatedDocument,
            full_name: legacyPatch.full_name,
            email: legacyPatch.email,
            phone: legacyPatch.phone,
            location: legacyPatch.location,
            introduction: legacyPatch.introduction,
            skills: legacyPatch.skills,
            work_experiences: legacyPatch.work_experiences,
            educations: legacyPatch.educations,
            work_experience: legacyPatch.work_experience,
            education: legacyPatch.education,
            profile_visibility: profileVisibility,
          })
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        set((state) => ({
          document: updatedDocument,
          isSaving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          previewSource: state.previewSource
            ? {
                ...state.previewSource,
                updatedAt: updatedDocument.meta.updatedAt || state.previewSource.updatedAt,
              }
            : createEmptyPreviewSource(updatedDocument),
        }));
      } catch (err) {
        console.error('Save profile error:', err);
        set({
          isSaving: false,
          error: 'Lưu thất bại. Đang thử lại...',
        });

        setTimeout(() => {
          void get().saveProfile();
        }, 3000);
      }
    },

    addSection: (type: SectionType) => {
      set((state) => {
        if (!state.document) {
          return state;
        }

        const singleInstanceTypes: SectionType[] = [
          'personal_info',
          'summary',
          'skills',
          'languages',
          'career_goal',
          'links',
        ];

        if (singleInstanceTypes.includes(type)) {
          const exists = state.document.sections.some((section) => section.type === type);
          if (exists) {
            return state;
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
          isAddPanelOpen: false,
          editingSectionId: newSection.id,
        };
      });

      get()._triggerAutosave();
    },

    updateSection: (sectionId: string, content: SectionContent) => {
      set((state) => {
        if (!state.document) {
          return state;
        }

        return {
          document: {
            ...state.document,
            sections: state.document.sections.map((section) =>
              section.id === sectionId ? { ...section, content } : section
            ),
          },
          hasUnsavedChanges: true,
        };
      });

      get()._triggerAutosave();
    },

    removeSection: (sectionId: string) => {
      set((state) => {
        if (!state.document) {
          return state;
        }

        const filteredSections = state.document.sections
          .filter((section) => section.id !== sectionId)
          .map((section, index) => ({ ...section, order: index }));

        return {
          document: {
            ...state.document,
            sections: filteredSections,
          },
          hasUnsavedChanges: true,
          editingSectionId:
            state.editingSectionId === sectionId ? null : state.editingSectionId,
        };
      });

      get()._triggerAutosave();
    },

    reorderSections: (oldIndex: number, newIndex: number) => {
      set((state) => {
        if (!state.document) {
          return state;
        }

        const sections = [...state.document.sections];
        const [moved] = sections.splice(oldIndex, 1);
        sections.splice(newIndex, 0, moved);

        return {
          document: {
            ...state.document,
            sections: sections.map((section, index) => ({ ...section, order: index })),
          },
          hasUnsavedChanges: true,
        };
      });

      get()._triggerAutosave();
    },

    toggleSectionVisibility: (sectionId: string) => {
      set((state) => {
        if (!state.document) {
          return state;
        }

        return {
          document: {
            ...state.document,
            sections: state.document.sections.map((section) =>
              section.id === sectionId
                ? { ...section, isHidden: !section.isHidden }
                : section
            ),
          },
          hasUnsavedChanges: true,
        };
      });

      get()._triggerAutosave();
    },

    setProfileVisibility: (visibility: CandidateProfileVisibility) => {
      set((state) => ({
        profileVisibility: visibility,
        hasUnsavedChanges: state.hasUnsavedChanges || state.profileVisibility !== visibility,
      }));

      get()._triggerAutosave();
    },

    setAddPanelOpen: (open: boolean) => set({ isAddPanelOpen: open }),
    setEditingSection: (sectionId: string | null) => set({ editingSectionId: sectionId }),

    _triggerAutosave: () => {
      const { _debouncedSave } = get();
      if (_debouncedSave) {
        _debouncedSave();
      }
    },
  };
});

const EMPTY_SECTIONS: Section[] = [];

export const useProfileDocument = () => useProfileBuilder((state) => state.document);
export const useProfileSections = () =>
  useProfileBuilder((state) => state.document?.sections || EMPTY_SECTIONS);
export const useProfilePreviewSource = () =>
  useProfileBuilder((state) => state.previewSource);
export const useProfileVisibility = () =>
  useProfileBuilder((state) => state.profileVisibility);
export const useProfileLoading = () => useProfileBuilder((state) => state.isLoading);
export const useProfileSaving = () => {
  const isSaving = useProfileBuilder((state) => state.isSaving);
  const lastSaved = useProfileBuilder((state) => state.lastSaved);
  return { isSaving, lastSaved };
};
export const useProfileError = () => useProfileBuilder((state) => state.error);
