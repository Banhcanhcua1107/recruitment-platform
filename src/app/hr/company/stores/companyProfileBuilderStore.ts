"use client";

import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import {
  buildLegacyCompanyProfilePatchFromDocument,
  resolveCompanyProfileDocument,
} from "@/lib/company-profile-document";
import type { CompanyProfileDocument, CompanySectionContent } from "@/types/company-profile";

const COMPANY_PROFILES_TABLE_MARKERS = [
  'relation "company_profiles" does not exist',
  "could not find the table 'public.company_profiles' in the schema cache",
];

const JOB_BRANDING_COLUMN_MARKERS = [
  'column "logo_url" does not exist',
  'column "cover_url" does not exist',
  'column "company_name" does not exist',
  'column "employer_id" does not exist',
  "column jobs.logo_url does not exist",
  "column jobs.cover_url does not exist",
  "column jobs.company_name does not exist",
  "column jobs.employer_id does not exist",
];

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return String(error ?? "");
}

function isSchemaError(error: unknown, markers: string[]) {
  const message = getErrorMessage(error).toLowerCase();
  return markers.some((marker) => message.includes(marker.toLowerCase()));
}

interface CompanyProfileBuilderState {
  document: CompanyProfileDocument | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  hasUnsavedChanges: boolean;
  editingSectionId: string | null;
  _debouncedSave: (() => void) | null;
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<boolean>;
  updateSection: (sectionId: string, content: CompanySectionContent) => void;
  setEditingSection: (sectionId: string | null) => void;
  _triggerAutosave: () => void;
}

export const useCompanyProfileBuilder = create<CompanyProfileBuilderState>((set, get) => {
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
          set({
            document: resolveCompanyProfileDocument({}),
            isLoading: false,
          });
          return;
        }

        const [{ data: companyProfileData, error: companyProfileError }, { data: employerData, error: employerError }] =
          await Promise.all([
            supabase
              .from("company_profiles")
              .select(
                "document, company_name, company_overview, email, website, phone, logo_url, cover_url, location, industry, company_size, benefits, culture, vision, mission, company_description",
              )
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("employers")
              .select(
                "company_name, email, logo_url, cover_url, location, industry, company_size, company_description",
              )
              .eq("id", user.id)
              .maybeSingle(),
          ]);

        if (employerError) {
          throw employerError;
        }

        if (companyProfileError && !isSchemaError(companyProfileError, COMPANY_PROFILES_TABLE_MARKERS)) {
          throw companyProfileError;
        }

        const document = resolveCompanyProfileDocument({
          document: companyProfileData?.document,
          companyName: companyProfileData?.company_name ?? employerData?.company_name,
          companyOverview:
            companyProfileData?.company_overview ?? companyProfileData?.company_description,
          email: companyProfileData?.email ?? employerData?.email,
          website: companyProfileData?.website,
          phone: companyProfileData?.phone,
          logoUrl: companyProfileData?.logo_url ?? employerData?.logo_url,
          coverUrl: companyProfileData?.cover_url ?? employerData?.cover_url,
          location: companyProfileData?.location ?? employerData?.location,
          industry: companyProfileData?.industry ?? employerData?.industry,
          companySize: companyProfileData?.company_size ?? employerData?.company_size,
          benefits: companyProfileData?.benefits,
          culture: companyProfileData?.culture,
          vision: companyProfileData?.vision,
          mission: companyProfileData?.mission,
          description:
            companyProfileData?.company_description ?? employerData?.company_description,
        });

        set({
          document,
          isLoading: false,
          hasUnsavedChanges: false,
          error: null,
        });
      } catch (error) {
        console.error("Load company profile error:", error);
        set({
          document: resolveCompanyProfileDocument({}),
          isLoading: false,
          error: "Khong the tai ho so cong ty. Vui long thu lai.",
        });
      }
    },

    saveProfile: async () => {
      const { document, hasUnsavedChanges } = get();
      if (!document) {
        return false;
      }

      if (!hasUnsavedChanges) {
        return true;
      }

      set({ isSaving: true, error: null });

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Not authenticated");
        }

        const updatedDocument: CompanyProfileDocument = {
          ...document,
          meta: {
            ...document.meta,
            updatedAt: new Date().toISOString(),
          },
        };
        const patch = buildLegacyCompanyProfilePatchFromDocument(updatedDocument);

        const { error: companyProfileError } = await supabase.from("company_profiles").upsert(
          {
            user_id: user.id,
            document: updatedDocument,
            company_name: patch.company_name,
            company_overview: patch.company_overview,
            email: patch.email,
            website: patch.website,
            phone: patch.phone,
            logo_url: patch.logo_url,
            cover_url: patch.cover_url,
            location: patch.location,
            industry: patch.industry,
            company_size: patch.company_size,
            benefits: patch.benefits,
            culture: patch.culture,
            vision: patch.vision,
            mission: patch.mission,
            company_description: patch.company_description,
          },
          { onConflict: "user_id" },
        );

        if (companyProfileError) {
          if (isSchemaError(companyProfileError, COMPANY_PROFILES_TABLE_MARKERS)) {
            throw new Error(
              "Bang company_profiles chua san sang. Hay chay migration moi nhat de luu day du ho so cong ty.",
            );
          }

          throw companyProfileError;
        }

        const { error: employerError } = await supabase.from("employers").upsert({
          id: user.id,
          company_name: patch.company_name || "Chua cap nhat ten cong ty",
          email: patch.email || user.email || "company@example.com",
          password_hash: null,
          logo_url: patch.logo_url,
          cover_url: patch.cover_url,
          location: patch.location,
          industry: patch.industry,
          company_size: patch.company_size,
          company_description: patch.company_description,
        });

        if (employerError) {
          throw employerError;
        }

        const { error: jobsError } = await supabase
          .from("jobs")
          .update({
            company_name: patch.company_name || "Chua cap nhat ten cong ty",
            logo_url: patch.logo_url,
            cover_url: patch.cover_url,
          })
          .eq("employer_id", user.id);

        if (jobsError && !isSchemaError(jobsError, JOB_BRANDING_COLUMN_MARKERS)) {
          throw jobsError;
        }

        set({
          document: updatedDocument,
          isSaving: false,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
          error: null,
        });

        return true;
      } catch (error) {
        console.error("Save company profile error:", error);
        set({
          isSaving: false,
          error: getErrorMessage(error) || "Luu that bai. Vui long thu lai.",
        });
        return false;
      }
    },

    updateSection: (sectionId, content) => {
      set((state) => {
        if (!state.document) {
          return state;
        }

        return {
          document: {
            ...state.document,
            sections: state.document.sections.map((section) =>
              section.id === sectionId ? { ...section, content } : section,
            ),
          },
          hasUnsavedChanges: true,
        };
      });

      get()._triggerAutosave();
    },

    setEditingSection: (sectionId) => set({ editingSectionId: sectionId }),

    _triggerAutosave: () => {
      const { _debouncedSave } = get();
      if (_debouncedSave) {
        _debouncedSave();
      }
    },
  };
});

const EMPTY_SECTIONS: CompanyProfileDocument["sections"] = [];

export const useCompanyProfileDocument = () =>
  useCompanyProfileBuilder((state) => state.document);
export const useCompanyProfileSections = () =>
  useCompanyProfileBuilder((state) => state.document?.sections || EMPTY_SECTIONS);
export const useCompanyProfileLoading = () =>
  useCompanyProfileBuilder((state) => state.isLoading);
export const useCompanyProfileSaving = () => {
  const isSaving = useCompanyProfileBuilder((state) => state.isSaving);
  const lastSaved = useCompanyProfileBuilder((state) => state.lastSaved);
  return { isSaving, lastSaved };
};
export const useCompanyProfileError = () =>
  useCompanyProfileBuilder((state) => state.error);
