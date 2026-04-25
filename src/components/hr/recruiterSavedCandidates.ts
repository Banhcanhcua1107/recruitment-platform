import type { PublicCandidateSearchResult } from "@/types/candidate-profile";

export interface SavedRecruiterCandidate {
  candidateId: string;
  fullName: string;
  headline: string;
  avatarUrl: string | null;
  location: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  cvUrl: string | null;
  updatedAt: string;
  savedAt: string;
}

const STORAGE_KEY = "talentflow:hr:saved-candidates";
const STORAGE_EVENT = "talentflow:hr:saved-candidates";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitSavedCandidatesChange() {
  if (!canUseStorage()) {
    return;
  }

  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function normalizeSavedCandidates(items: SavedRecruiterCandidate[]) {
  return [...items].sort(
    (left, right) => Date.parse(right.savedAt || right.updatedAt) - Date.parse(left.savedAt || left.updatedAt)
  );
}

function sanitizeSavedCandidate(candidate: SavedRecruiterCandidate): SavedRecruiterCandidate {
  return {
    candidateId: String(candidate.candidateId),
    fullName: String(candidate.fullName ?? "").trim() || "Ứng viên",
    headline: String(candidate.headline ?? "").trim(),
    avatarUrl: candidate.avatarUrl ?? null,
    location: String(candidate.location ?? "").trim(),
    email: candidate.email ?? null,
    phone: candidate.phone ?? null,
    skills: Array.isArray(candidate.skills)
      ? candidate.skills.map((skill) => String(skill ?? "").trim()).filter(Boolean)
      : [],
    cvUrl: candidate.cvUrl ?? null,
    updatedAt: String(candidate.updatedAt ?? new Date().toISOString()),
    savedAt: String(candidate.savedAt ?? new Date().toISOString()),
  };
}

export function toSavedRecruiterCandidate(
  candidate: PublicCandidateSearchResult
): SavedRecruiterCandidate {
  return sanitizeSavedCandidate({
    candidateId: candidate.candidateId,
    fullName: candidate.fullName,
    headline: candidate.headline,
    avatarUrl: candidate.avatarUrl,
    location: candidate.location,
    email: candidate.email,
    phone: candidate.phone,
    skills: candidate.skills,
    cvUrl: candidate.cvUrl,
    updatedAt: candidate.updatedAt,
    savedAt: new Date().toISOString(),
  });
}

export function getSavedRecruiterCandidates(): SavedRecruiterCandidate[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeSavedCandidates(parsed.map((item) => sanitizeSavedCandidate(item)));
  } catch {
    return [];
  }
}

function setSavedRecruiterCandidates(items: SavedRecruiterCandidate[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSavedCandidates(items)));
  emitSavedCandidatesChange();
}

export function isRecruiterCandidateSaved(candidateId: string) {
  return getSavedRecruiterCandidates().some((item) => item.candidateId === candidateId);
}

export function saveRecruiterCandidate(candidate: PublicCandidateSearchResult) {
  const items = getSavedRecruiterCandidates().filter(
    (item) => item.candidateId !== candidate.candidateId
  );
  items.unshift(toSavedRecruiterCandidate(candidate));
  setSavedRecruiterCandidates(items);
  return items;
}

export function removeRecruiterCandidate(candidateId: string) {
  const nextItems = getSavedRecruiterCandidates().filter(
    (item) => item.candidateId !== candidateId
  );
  setSavedRecruiterCandidates(nextItems);
  return nextItems;
}

export function toggleRecruiterCandidateSaved(candidate: PublicCandidateSearchResult) {
  if (isRecruiterCandidateSaved(candidate.candidateId)) {
    return {
      saved: false,
      items: removeRecruiterCandidate(candidate.candidateId),
    };
  }

  return {
    saved: true,
    items: saveRecruiterCandidate(candidate),
  };
}

export function subscribeSavedRecruiterCandidates(listener: () => void) {
  if (!canUseStorage()) {
    return () => undefined;
  }

  const sync = () => listener();

  window.addEventListener(STORAGE_EVENT, sync);
  window.addEventListener("storage", sync);

  return () => {
    window.removeEventListener(STORAGE_EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}
