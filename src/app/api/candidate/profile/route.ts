import { NextResponse } from "next/server";
import type {
  CandidateEducation,
  CandidateProfileInput,
  CandidateWorkExperience,
} from "@/types/candidate-profile";
import { normalizeProfileVisibility } from "@/lib/candidate-profile-shared";
import {
  getCurrentCandidateProfile,
  upsertCurrentCandidateProfile,
} from "@/lib/candidate-profiles";

export const runtime = "nodejs";

function getStatusCode(message: string) {
  const normalized = message.toLowerCase();

  if (message === "Unauthorized") {
    return 401;
  }

  if (normalized.includes("chỉ ứng viên")) {
    return 403;
  }

  if (
    normalized.includes("không được để trống") ||
    normalized.includes("không hợp lệ") ||
    normalized.includes("vui lòng")
  ) {
    return 400;
  }

  return 500;
}

function normalizeWorkExperienceInput(value: unknown): CandidateWorkExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = typeof item === "object" && item !== null ? item : {};
    return {
      id: String((row as { id?: unknown }).id ?? ""),
      title: String((row as { title?: unknown }).title ?? ""),
      company: String((row as { company?: unknown }).company ?? ""),
      startDate: String((row as { startDate?: unknown }).startDate ?? ""),
      endDate: String((row as { endDate?: unknown }).endDate ?? ""),
      isCurrent: Boolean((row as { isCurrent?: unknown }).isCurrent),
      description: String((row as { description?: unknown }).description ?? ""),
    };
  });
}

function normalizeEducationInput(value: unknown): CandidateEducation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const row = typeof item === "object" && item !== null ? item : {};
    return {
      id: String((row as { id?: unknown }).id ?? ""),
      school: String((row as { school?: unknown }).school ?? ""),
      degree: String((row as { degree?: unknown }).degree ?? ""),
      startDate: String((row as { startDate?: unknown }).startDate ?? ""),
      endDate: String((row as { endDate?: unknown }).endDate ?? ""),
      description: String((row as { description?: unknown }).description ?? ""),
    };
  });
}

export async function GET() {
  try {
    const profile = await getCurrentCandidateProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải hồ sơ ứng viên.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<CandidateProfileInput>;

    const profile = await upsertCurrentCandidateProfile({
      fullName: String(body.fullName ?? ""),
      avatarUrl: body.avatarUrl ? String(body.avatarUrl) : null,
      headline: String(body.headline ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      location: String(body.location ?? ""),
      introduction: String(body.introduction ?? ""),
      skills: Array.isArray(body.skills) ? body.skills.map((item) => String(item)) : [],
      workExperiences: normalizeWorkExperienceInput(body.workExperiences),
      educations: normalizeEducationInput(body.educations),
      workExperience: String(body.workExperience ?? ""),
      education: String(body.education ?? ""),
      profileVisibility: normalizeProfileVisibility(body.profileVisibility),
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể cập nhật hồ sơ ứng viên.";
    return NextResponse.json({ error: message }, { status: getStatusCode(message) });
  }
}
