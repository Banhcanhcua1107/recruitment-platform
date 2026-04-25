import "server-only";

import { createClient } from "@/utils/supabase/server";
import {
  buildLegacyCompanyProfilePatchFromDocument,
  resolveCompanyProfileDocument,
} from "@/lib/company-profile-document";
import type { CompanyProfileDocument } from "@/types/company-profile";

const COMPANY_PROFILES_TABLE_MARKERS = [
  'relation "company_profiles" does not exist',
  "could not find the table 'public.company_profiles' in the schema cache",
];

type AuthProfileRow = {
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type CompanyProfileRow = {
  id: string;
  user_id: string;
  document: unknown;
  company_name: string | null;
  company_overview: string | null;
  email: string | null;
  website: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  location: string | null;
  industry: string[] | null;
  company_size: string | null;
  benefits: string[] | null;
  culture: string[] | null;
  vision: string | null;
  mission: string | null;
  company_description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface CurrentHrCompanyProfile {
  id: string | null;
  userId: string;
  document: CompanyProfileDocument;
  companyName: string;
  companyOverview: string | null;
  email: string;
  website: string | null;
  phone: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  industry: string[];
  companySize: string | null;
  benefits: string[];
  culture: string[];
  vision: string | null;
  mission: string | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
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

function normalizeString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function getAuthenticatedHrContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: authProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (authProfile?.role && authProfile.role !== "hr") {
    throw new Error("Chi nha tuyen dung moi co the quan ly ho so cong ty.");
  }

  return {
    supabase,
    user,
    authProfile: (authProfile ?? null) as AuthProfileRow | null,
  };
}

async function getLegacyEmployerSnapshot() {
  const { supabase, user, authProfile } = await getAuthenticatedHrContext();
  const { data: employer, error } = await supabase
    .from("employers")
    .select("company_name, email, logo_url, cover_url, location, industry, company_size, company_description")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    supabase,
    user,
    authProfile,
    legacy: {
      companyName:
        normalizeString(employer?.company_name) ||
        normalizeString(authProfile?.full_name) ||
        normalizeString(user.user_metadata?.full_name) ||
        normalizeString(user.email?.split("@")[0]) ||
        "Nha tuyen dung",
      email:
        normalizeString(employer?.email) ||
        normalizeString(authProfile?.email) ||
        normalizeString(user.email),
      logoUrl: normalizeString(employer?.logo_url) || null,
      coverUrl: normalizeString(employer?.cover_url) || null,
      location: normalizeString(employer?.location) || null,
      industry: normalizeStringArray(employer?.industry),
      companySize: normalizeString(employer?.company_size) || null,
      description: normalizeString(employer?.company_description) || null,
    },
  };
}

export async function getCurrentHrCompanyProfile(): Promise<CurrentHrCompanyProfile> {
  const { supabase, user, legacy } = await getLegacyEmployerSnapshot();
  const { data, error } = await supabase
    .from("company_profiles")
    .select(
      "id, user_id, document, company_name, company_overview, email, website, phone, logo_url, cover_url, location, industry, company_size, benefits, culture, vision, mission, company_description, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && !isSchemaError(error, COMPANY_PROFILES_TABLE_MARKERS)) {
    throw new Error(error.message);
  }

  const row = !error && data ? (data as unknown as CompanyProfileRow) : null;
  const document = resolveCompanyProfileDocument({
    document: row?.document,
    companyName: row?.company_name ?? legacy.companyName,
    companyOverview: row?.company_overview ?? row?.company_description ?? legacy.description,
    email: row?.email ?? legacy.email,
    website: row?.website,
    phone: row?.phone,
    logoUrl: row?.logo_url ?? legacy.logoUrl,
    coverUrl: row?.cover_url ?? legacy.coverUrl,
    location: row?.location ?? legacy.location,
    industry: row?.industry ?? legacy.industry,
    companySize: row?.company_size ?? legacy.companySize,
    benefits: row?.benefits,
    culture: row?.culture,
    vision: row?.vision,
    mission: row?.mission,
    description: row?.company_description ?? legacy.description,
  });
  const patch = buildLegacyCompanyProfilePatchFromDocument(document);

  return {
    id: row?.id ?? null,
    userId: user.id,
    document,
    companyName: patch.company_name || legacy.companyName,
    companyOverview: patch.company_overview,
    email: patch.email || legacy.email,
    website: patch.website,
    phone: patch.phone,
    logoUrl: patch.logo_url || legacy.logoUrl,
    coverUrl: patch.cover_url || legacy.coverUrl,
    location: patch.location || legacy.location,
    industry: patch.industry.length > 0 ? patch.industry : legacy.industry,
    companySize: patch.company_size || legacy.companySize,
    benefits: patch.benefits,
    culture: patch.culture,
    vision: patch.vision,
    mission: patch.mission,
    description: patch.company_description || legacy.description,
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? document.meta.updatedAt ?? null,
  };
}
