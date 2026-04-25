import type { FakeAccountRole } from "@/types/email-testing";

const ADJECTIVES = [
  "calm",
  "bright",
  "rapid",
  "silent",
  "clever",
  "steady",
  "lucky",
  "brave",
  "keen",
  "swift",
  "golden",
  "sunny",
  "smart",
  "mellow",
  "crisp",
];

const NOUNS = [
  "falcon",
  "river",
  "maple",
  "pixel",
  "comet",
  "cloud",
  "anchor",
  "orbit",
  "beacon",
  "forest",
  "ember",
  "ocean",
  "rocket",
  "planet",
  "atlas",
];

const VIETNAMESE_LAST_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Phan",
  "Vũ",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Đinh",
  "Trương",
  "Mai",
  "Lam",
  "Cao",
];

const VIETNAMESE_FIRST_NAMES = [
  "Minh",
  "An",
  "Linh",
  "Hoa",
  "Tuấn",
  "Trang",
  "Phúc",
  "Nhi",
  "Khánh",
  "Ngọc",
  "Huy",
  "Vy",
  "Quỳnh",
  "Nam",
  "Mỹ",
  "Bảo",
  "Châu",
  "Duy",
  "Hà",
  "Thảo",
  "Long",
  "Yến",
  "Son",
  "Quang",
  "Thu",
  "Tiến",
  "Phương",
  "Kiệt",
  "Lan",
  "Hồng",
  "Đạt",
  "Tâm",
];

export interface VietnameseFakeIdentity {
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
}

function randomItem(values: string[]) {
  return values[Math.floor(Math.random() * values.length)] || "user";
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function randomDigits(length: number) {
  const base = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - base + 1)) + base);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 5);
}

function rolePrefix(role?: FakeAccountRole) {
  if (role === "candidate") {
    return "candidate";
  }
  if (role === "recruiter") {
    return "recruiter";
  }

  return `${randomItem(ADJECTIVES)}${randomItem(NOUNS)}`;
}

function pickByHash(values: string[], seed: number) {
  if (values.length === 0) {
    return "";
  }
  return values[Math.abs(seed) % values.length] || values[0] || "";
}

function formatDisplayName(fullName: string, role: FakeAccountRole) {
  if (role === "recruiter") {
    return `${fullName} (HR)`;
  }
  return fullName;
}

export function buildVietnameseFakeIdentity(
  email: string,
  role: FakeAccountRole,
): VietnameseFakeIdentity {
  const normalizedEmail = email.trim().toLowerCase();
  const baseHash = hashSeed(normalizedEmail);
  const roleSalt = role === "recruiter" ? 7919 : 3571;
  const firstName = pickByHash(VIETNAMESE_FIRST_NAMES, baseHash + roleSalt);
  const lastName = pickByHash(VIETNAMESE_LAST_NAMES, baseHash + roleSalt * 3);
  const fullName = `${lastName} ${firstName}`.trim();

  return {
    firstName,
    lastName,
    fullName,
    displayName: formatDisplayName(fullName, role),
  };
}

export function generateFakeGmailAddress(existing: Set<string>, role?: FakeAccountRole) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const local = `${rolePrefix(role)}${randomDigits(3)}${randomSuffix()}`;
    const email = `${local.toLowerCase()}@gmail.test`;
    if (!existing.has(email)) {
      existing.add(email);
      return email;
    }
  }

  const fallbackPrefix = role === "candidate" || role === "recruiter" ? role : "tester";
  const fallback = `${fallbackPrefix}${Date.now()}${randomDigits(4)}@gmail.test`;
  existing.add(fallback);
  return fallback;
}

export function displayNameFromEmail(email: string, role: FakeAccountRole = "candidate") {
  return buildVietnameseFakeIdentity(email, role).displayName;
}
