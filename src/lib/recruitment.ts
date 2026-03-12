import "server-only";

import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type {
  AnyApplicationStatus,
  CandidateFilters,
  JobFilters,
  JobUpsertInput,
  PaginatedResult,
  RecruitmentActivityLog,
  RecruitmentCandidate,
  RecruitmentCompanyProfile,
  RecruitmentDashboardStats,
  RecruitmentJob,
  RecruitmentPipelineMetric,
  RecruitmentPipelineStatus,
  RecruitmentTrendPoint,
} from "@/types/recruitment";

const PIPELINE_LABELS: Record<RecruitmentPipelineStatus, string> = {
  new: "Mới",
  interview: "Phỏng vấn",
  hired: "Đã tuyển",
  rejected: "Từ chối",
};

const EMPLOYERS_TABLE_MARKERS = [
  'relation "employers" does not exist',
  "could not find the table 'public.employers' in the schema cache",
];

const EMPLOYER_OPTIONAL_COLUMN_MARKERS = [
  'column "logo_url" does not exist',
  'column "cover_url" does not exist',
  'column "location" does not exist',
  'column "industry" does not exist',
  'column "company_size" does not exist',
  'column "company_description" does not exist',
];

const CANDIDATES_TABLE_MARKERS = [
  'relation "candidates" does not exist',
  "could not find the table 'public.candidates' in the schema cache",
];

const ACTIVITY_LOGS_TABLE_MARKERS = [
  'relation "activity_logs" does not exist',
  "could not find the table 'public.activity_logs' in the schema cache",
];

const COMPANY_NAME_PLACEHOLDER = "Chưa cập nhật tên công ty";

const JOB_EMPLOYER_COLUMN_MARKERS = [
  "column jobs.employer_id does not exist",
  'column "employer_id" does not exist',
];

const JOB_OPTIONAL_COLUMN_MARKERS = [
  "column jobs.status does not exist",
  'column "status" does not exist',
  "column jobs.description does not exist",
  'column "description" does not exist',
];

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

function normalizeCompanyName(value: string | null | undefined) {
  const next = sanitizeVietnameseText(value ?? "").trim();
  if (!next || next === COMPANY_NAME_PLACEHOLDER) {
    return "";
  }
  return next;
}

function sanitizeVietnameseText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replaceAll("Má»›i", "Mới")
    .replaceAll("Phá»ng váº¥n", "Phỏng vấn")
    .replaceAll("ÄÃ£ tuyá»ƒn", "Đã tuyển")
    .replaceAll("Tá»« chá»‘i", "Từ chối")
    .replaceAll("NhÃ  tuyá»ƒn dá»¥ng", "Nhà tuyển dụng")
    .replaceAll("á»¨ng viÃªn", "Ứng viên")
    .replaceAll("ChÆ°a rÃµ vá»‹ trÃ­", "Chưa rõ vị trí")
    .replaceAll("ÄÃ£ táº¡o tin tuyá»ƒn dá»¥ng", "Đã tạo tin tuyển dụng")
    .replaceAll("ÄÃ£ cáº­p nháº­t tin tuyá»ƒn dá»¥ng", "Đã cập nhật tin tuyển dụng")
    .replaceAll("ÄÃ£ Ä‘Ã³ng tin tuyá»ƒn dá»¥ng", "Đã đóng tin tuyển dụng")
    .replaceAll("ÄÃ£ chuyá»ƒn", "Đã chuyển")
    .replaceAll("tráº¡ng thÃ¡i", "trạng thái")
    .replaceAll("ÄÃ£ xem há»“ sÆ¡", "Đã xem hồ sơ");
}

function normalizeApplicationStatus(
  status: string | null | undefined
): RecruitmentPipelineStatus {
  switch (status) {
    case "pending":
    case "viewed":
    case "new":
      return "new";
    case "interviewing":
    case "interview":
      return "interview";
    case "offered":
    case "hired":
      return "hired";
    case "rejected":
      return "rejected";
    default:
      return "new";
  }
}

function normalizeMultilineText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return String(value);
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function serializeDescriptionForCurrentSchema(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStatusAliases(status: RecruitmentPipelineStatus): string[] {
  switch (status) {
    case "new":
      return ["new", "pending", "viewed"];
    case "interview":
      return ["interview", "interviewing"];
    case "hired":
      return ["hired", "offered"];
    case "rejected":
      return ["rejected"];
  }
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

const getRecruitmentContext = cache(async function getRecruitmentContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const companyName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Nhà tuyển dụng";
  const email = profile?.email || user.email || "";

  const { error: employerUpsertError } = await supabase.from("employers").upsert({
      id: user.id,
      company_name: companyName,
      email,
      password_hash: null,
    });

  if (
    employerUpsertError &&
    !isSchemaError(employerUpsertError, EMPLOYERS_TABLE_MARKERS)
  ) {
    throw new Error(employerUpsertError.message);
  }

  const personalNameCandidates = new Set(
    [
      profile?.full_name,
      user.user_metadata?.full_name,
      user.email?.split("@")[0],
      "NhÃ  tuyá»ƒn dá»¥ng",
      "Nhà tuyển dụng",
    ]
      .map((value) => sanitizeVietnameseText(String(value ?? "")).trim())
      .filter(Boolean)
  );

  const normalizedCompanyName = sanitizeVietnameseText(companyName).trim();
  let safeCompanyName = normalizedCompanyName;

  if (personalNameCandidates.has(normalizedCompanyName)) {
    safeCompanyName = COMPANY_NAME_PLACEHOLDER;

    const { error: employerFixError } = await supabase
      .from("employers")
      .update({ company_name: COMPANY_NAME_PLACEHOLDER, email })
      .eq("id", user.id);

    if (
      employerFixError &&
      !isSchemaError(employerFixError, EMPLOYERS_TABLE_MARKERS)
    ) {
      throw new Error(employerFixError.message);
    }
  }

  return {
    supabase,
    user,
    employer: {
      id: user.id,
      companyName: safeCompanyName,
      email,
      role: profile?.role ?? null,
    },
  };
});

async function getEmployerJobRecords(
  supabase: SupabaseClient,
  employerId: string
) {
  const scopedQuery = await supabase
    .from("jobs")
    .select("id, title")
    .eq("employer_id", employerId);

  if (scopedQuery.error) {
    if (
      isSchemaError(scopedQuery.error, [
        ...JOB_EMPLOYER_COLUMN_MARKERS,
      ])
    ) {
      const fallbackQuery = await supabase
        .from("jobs")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (fallbackQuery.error) {
        throw new Error(fallbackQuery.error.message);
      }

      return fallbackQuery.data ?? [];
    }

    throw new Error(scopedQuery.error.message);
  }

  return scopedQuery.data ?? [];
}

async function getEmployerJobIds(supabase: SupabaseClient, employerId: string) {
  const rows = await getEmployerJobRecords(supabase, employerId);
  return rows.map((row) => row.id);
}

const getCurrentEmployerJobRecords = cache(async function getCurrentEmployerJobRecords() {
  const { supabase, employer } = await getRecruitmentContext();
  return getEmployerJobRecords(supabase, employer.id);
});

export async function getDashboardStats(): Promise<RecruitmentDashboardStats> {
  const { supabase, employer } = await getRecruitmentContext();
  const jobRows = await getCurrentEmployerJobRecords();
  const jobIds = jobRows.map((row) => row.id);
  const totalJobs = jobRows.length;

  if (jobIds.length === 0) {
    return {
      totalJobs,
      totalCandidates: 0,
      candidatesToday: 0,
    };
  }

  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("candidate_id, created_at")
    .in("job_id", jobIds);

  if (applicationsError) {
    throw new Error(applicationsError.message);
  }

  const todayKey = formatDateKey(new Date());
  const candidateIds = new Set<string>();
  let candidatesToday = 0;

  for (const row of applications ?? []) {
    if (row.candidate_id) {
      candidateIds.add(String(row.candidate_id));
    }

    if (row.created_at) {
      const createdKey = formatDateKey(new Date(row.created_at));
      if (createdKey === todayKey) {
        candidatesToday += 1;
      }
    }
  }

  return {
    totalJobs,
    totalCandidates: candidateIds.size,
    candidatesToday,
  };
}

export async function getApplicationsTrend(): Promise<RecruitmentTrendPoint[]> {
  const { supabase, employer } = await getRecruitmentContext();
  const jobIds = (await getCurrentEmployerJobRecords()).map((row) => row.id);
  const today = startOfDay(new Date());
  const points: RecruitmentTrendPoint[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    points.push({
      date: formatDateKey(current),
      label: current.toLocaleDateString("vi-VN", { weekday: "short" }),
      applications: 0,
    });
  }

  if (jobIds.length === 0) {
    return points;
  }

  const { data, error } = await supabase
    .from("applications")
    .select("created_at")
    .in("job_id", jobIds)
    .gte("created_at", points[0].date);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map(points.map((point) => [point.date, 0]));

  for (const row of data ?? []) {
    if (!row.created_at) {
      continue;
    }

    const key = formatDateKey(new Date(row.created_at));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return points.map((point) => ({
    ...point,
    applications: counts.get(point.date) ?? 0,
  }));
}

export async function getPipelineMetrics(): Promise<RecruitmentPipelineMetric[]> {
  const { supabase, employer } = await getRecruitmentContext();
  const jobIds = (await getCurrentEmployerJobRecords()).map((row) => row.id);

  const base: RecruitmentPipelineMetric[] = (
    Object.keys(PIPELINE_LABELS) as RecruitmentPipelineStatus[]
  ).map((status) => ({
    status,
    label: sanitizeVietnameseText(PIPELINE_LABELS[status]),
    count: 0,
  }));

  if (jobIds.length === 0) {
    return base;
  }

  const { data, error } = await supabase
    .from("applications")
    .select("status")
    .in("job_id", jobIds);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<RecruitmentPipelineStatus, number>(
    base.map((item) => [item.status, 0])
  );

  for (const row of data ?? []) {
    const normalized = normalizeApplicationStatus(row.status);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return base.map((item) => ({
    ...item,
    count: counts.get(item.status) ?? 0,
  }));
}

export async function getActivityLogs(
  limit = 8
): Promise<RecruitmentActivityLog[]> {
  const { supabase, employer } = await getRecruitmentContext();
  let { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, user_id, created_at")
    .eq("user_id", employer.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (
    error &&
    isSchemaError(error, ACTIVITY_LOGS_TABLE_MARKERS)
  ) {
    data = [];
    error = null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    action: sanitizeVietnameseText(row.action),
    userId: String(row.user_id),
    createdAt: row.created_at,
  }));
}

export async function getCompanyProfile(): Promise<RecruitmentCompanyProfile> {
  const { supabase, employer } = await getRecruitmentContext();

  let { data, error } = await supabase
    .from("employers")
    .select(
      "company_name, email, logo_url, cover_url, location, industry, company_size, company_description"
    )
    .eq("id", employer.id)
    .maybeSingle();

  if (
    error &&
    isSchemaError(error, [...EMPLOYERS_TABLE_MARKERS, ...EMPLOYER_OPTIONAL_COLUMN_MARKERS])
  ) {
    data = null;
    error = null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    companyName: normalizeCompanyName(data?.company_name ?? employer.companyName),
    email: data?.email ?? employer.email,
    logoUrl: data?.logo_url ?? null,
    coverUrl: data?.cover_url ?? null,
    location: data?.location ?? null,
    industry: normalizeStringList(data?.industry),
    companySize: data?.company_size ?? null,
    description: data?.company_description ?? null,
  };
}

export async function updateCompanyProfile(input: RecruitmentCompanyProfile) {
  const { supabase, employer } = await getRecruitmentContext();

  const { error } = await supabase.from("employers").upsert({
    id: employer.id,
    company_name: input.companyName.trim() || COMPANY_NAME_PLACEHOLDER,
    email: input.email.trim() || employer.email,
    password_hash: null,
    logo_url: input.logoUrl || null,
    cover_url: input.coverUrl || null,
    location: input.location || null,
    industry: normalizeStringList(input.industry),
    company_size: input.companySize || null,
    company_description: input.description || null,
  });

  if (error) {
    if (
      isSchemaError(error, [...EMPLOYERS_TABLE_MARKERS, ...EMPLOYER_OPTIONAL_COLUMN_MARKERS])
    ) {
      throw new Error(
        "Bảng employers hiện chưa có đủ cột hồ sơ công ty. Hãy chạy migration tương thích mới nhất."
      );
    }

    throw new Error(error.message);
  }

  await logActivity(supabase, employer.id, `Đã cập nhật hồ sơ công ty: ${input.companyName}`);
}

export async function getJobs(
  filters: JobFilters = {}
): Promise<PaginatedResult<RecruitmentJob>> {
  const { supabase, employer } = await getRecruitmentContext();
  const page = Math.max(1, Number(filters.page ?? 1));
  const limit = Math.max(1, Math.min(20, Number(filters.limit ?? 10)));

  let query = supabase
    .from("jobs")
    .select(
      "id, title, company_name, logo_url, cover_url, location, status, description, benefits, industry, experience_level, level, employment_type, deadline, education_level, age_range, full_address, source_url, salary, requirements, posted_date, created_at",
      { count: "exact" }
    );

  query = query.eq("employer_id", employer.id);

  if (filters.q) {
    query = query.or(
      `title.ilike.%${filters.q}%,location.ilike.%${filters.q}%,description.ilike.%${filters.q}%`
    );
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query.order("created_at", { ascending: false });

  let { data, error, count } = await query.range(from, to);

  if (
    error &&
    isSchemaError(error, [
      ...JOB_EMPLOYER_COLUMN_MARKERS,
      ...JOB_OPTIONAL_COLUMN_MARKERS,
    ])
  ) {
    let fallbackQuery = supabase
      .from("jobs")
      .select("id, title, company_name, logo_url, cover_url, location, benefits, industry, experience_level, level, employment_type, deadline, education_level, age_range, full_address, source_url, salary, requirements, posted_date, created_at", { count: "exact" });

    if (filters.q) {
      fallbackQuery = fallbackQuery.or(
        `title.ilike.%${filters.q}%,location.ilike.%${filters.q}%`
      );
    }

    const fallbackResult = await fallbackQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    data = fallbackResult.data as typeof data;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

  if (error) {
    throw new Error(error.message);
  }

  const jobIds = (data ?? []).map((row) => row.id);
  const candidateCountMap = new Map<string, number>();

  if (jobIds.length > 0) {
    const { data: applications, error: appError } = await supabase
      .from("applications")
      .select("job_id")
      .in("job_id", jobIds);

    if (appError) {
      throw new Error(appError.message);
    }

    for (const application of applications ?? []) {
      const jobId = String(application.job_id);
      candidateCountMap.set(jobId, (candidateCountMap.get(jobId) ?? 0) + 1);
    }
  }

  return {
    items: (data ?? []).map((row) => ({
      id: String(row.id),
      title: row.title,
      companyName: row.company_name ?? null,
      logoUrl: row.logo_url ?? null,
      coverUrl: row.cover_url ?? null,
      location: row.location,
      status: row.status ?? "open",
      description: normalizeMultilineText(row.description),
      benefits: normalizeStringList(row.benefits),
      industry: normalizeStringList(row.industry),
      experienceLevel: row.experience_level ?? null,
      level: row.level ?? null,
      employmentType: row.employment_type ?? null,
      deadline: row.deadline ?? null,
      educationLevel: row.education_level ?? null,
      ageRange: row.age_range ?? null,
      fullAddress: row.full_address ?? null,
      sourceUrl: row.source_url ?? null,
      postedDate: row.posted_date ?? null,
      salary: row.salary ?? null,
      requirements: normalizeStringList(row.requirements),
      postedAt: row.posted_date,
      createdAt: row.created_at,
      candidateCount: candidateCountMap.get(String(row.id)) ?? 0,
    })),
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getJobById(id: string) {
  const { supabase, employer } = await getRecruitmentContext();
  let { data, error } = await supabase
    .from("jobs")
    .select(
      "id, title, company_name, logo_url, cover_url, location, status, description, benefits, industry, experience_level, level, employment_type, deadline, education_level, age_range, full_address, source_url, salary, requirements, posted_date, employer_id"
    )
    .eq("id", id)
    .eq("employer_id", employer.id)
    .maybeSingle();

  if (
    error &&
    isSchemaError(error, [
      ...JOB_EMPLOYER_COLUMN_MARKERS,
      ...JOB_OPTIONAL_COLUMN_MARKERS,
    ])
  ) {
    const fallbackResult = await supabase
      .from("jobs")
      .select("id, title, company_name, logo_url, cover_url, location, description, benefits, industry, experience_level, level, employment_type, deadline, education_level, age_range, full_address, source_url, salary, requirements, posted_date")
      .eq("id", id)
      .maybeSingle();

    data = fallbackResult.data as typeof data;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return data;
  }

  return {
    id: String(data.id),
    title: data.title,
    companyName: data.company_name ?? null,
    logoUrl: data.logo_url ?? null,
    coverUrl: data.cover_url ?? null,
    location: data.location ?? null,
    status: data.status ?? "open",
    description: normalizeMultilineText(data.description),
    benefits: normalizeStringList(data.benefits),
    industry: normalizeStringList(data.industry),
    experienceLevel: data.experience_level ?? null,
    level: data.level ?? null,
    employmentType: data.employment_type ?? null,
    deadline: data.deadline ?? null,
    educationLevel: data.education_level ?? null,
    ageRange: data.age_range ?? null,
    fullAddress: data.full_address ?? null,
    sourceUrl: data.source_url ?? null,
    postedDate: data.posted_date ?? null,
    salary: data.salary ?? null,
    requirements: normalizeStringList(data.requirements),
    postedAt: data.posted_date ?? null,
    createdAt: null,
    candidateCount: 0,
  };
}

export async function getJobPositionOptions(): Promise<string[]> {
  const { supabase, employer } = await getRecruitmentContext();
  let { data, error } = await supabase
    .from("jobs")
    .select("title")
    .eq("employer_id", employer.id)
    .order("title", { ascending: true });

  if (
    error &&
    isSchemaError(error, [
      ...JOB_EMPLOYER_COLUMN_MARKERS,
    ])
  ) {
    const fallbackResult = await supabase
      .from("jobs")
      .select("title")
      .order("title", { ascending: true });

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.title).filter(Boolean))];
}

export async function getCandidates(
  filters: CandidateFilters = {}
): Promise<PaginatedResult<RecruitmentCandidate>> {
  const { supabase, employer } = await getRecruitmentContext();
  const page = Math.max(1, Number(filters.page ?? 1));
  const limit = Math.max(1, Math.min(20, Number(filters.limit ?? 10)));

  let jobsQuery = supabase
    .from("jobs")
    .select("id, title")
    .eq("employer_id", employer.id);

  if (filters.position) {
    jobsQuery = jobsQuery.ilike("title", `%${filters.position}%`);
  }

  let { data: jobRows, error: jobsError } = await jobsQuery;

  if (
    jobsError &&
    isSchemaError(jobsError, [
      "column jobs.employer_id does not exist",
      'column "employer_id" does not exist',
    ])
  ) {
    let fallbackJobsQuery = supabase.from("jobs").select("id, title");

    if (filters.position) {
      fallbackJobsQuery = fallbackJobsQuery.ilike("title", `%${filters.position}%`);
    }

    const fallbackJobsResult = await fallbackJobsQuery;
    jobRows = fallbackJobsResult.data;
    jobsError = fallbackJobsResult.error;
  }

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobIds = (jobRows ?? []).map((row) => row.id);
  const jobsById = new Map(
    (jobRows ?? []).map((row) => [String(row.id), row.title as string])
  );

  if (jobIds.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
    };
  }

  let candidateIdsFilter: string[] | null = null;

  if (filters.q) {
    let { data: candidateMatches, error: candidateMatchError } = await supabase
      .from("candidates")
      .select("id")
      .or(
        `full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`
      );

    if (
      candidateMatchError &&
      isSchemaError(candidateMatchError, CANDIDATES_TABLE_MARKERS)
    ) {
      const fallbackCandidateMatches = await supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);

      candidateMatches = fallbackCandidateMatches.data;
      candidateMatchError = fallbackCandidateMatches.error;
    }

    if (candidateMatchError) {
      throw new Error(candidateMatchError.message);
    }

    candidateIdsFilter = (candidateMatches ?? []).map((row) => String(row.id));

    if (candidateIdsFilter.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      };
    }
  }

  let appsQuery = supabase
    .from("applications")
    .select("id, candidate_id, job_id, status, created_at", { count: "exact" })
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    appsQuery = appsQuery.in("status", getStatusAliases(filters.status));
  }

  if (candidateIdsFilter) {
    appsQuery = appsQuery.in("candidate_id", candidateIdsFilter);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: appRows, error: appsError, count } = await appsQuery.range(from, to);

  if (appsError) {
    throw new Error(appsError.message);
  }

  const candidateIds = [...new Set((appRows ?? []).map((row) => String(row.candidate_id)))];

  let [{ data: candidateRows, error: candidatesError }, { data: profileRows, error: profilesError }] =
    await Promise.all([
      candidateIds.length > 0
        ? supabase
            .from("candidates")
            .select("id, full_name, email, phone, resume_url")
            .in("id", candidateIds)
        : Promise.resolve({ data: [], error: null }),
      candidateIds.length > 0
        ? supabase.from("profiles").select("id, full_name, email").in("id", candidateIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (
    candidatesError &&
    isSchemaError(candidatesError, CANDIDATES_TABLE_MARKERS)
  ) {
    candidateRows = [];
    candidatesError = null;
  }

  if (candidatesError) {
    throw new Error(candidatesError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(
    (profileRows ?? []).map((row) => [String(row.id), row])
  );
  const candidatesById = new Map(
    (candidateRows ?? []).map((row) => [String(row.id), row])
  );

  return {
    items: (appRows ?? []).map((row) => {
      const candidateId = String(row.candidate_id);
      const candidate = candidatesById.get(candidateId);
      const profile = profilesById.get(candidateId);
      const fullName =
        candidate?.full_name ||
        profile?.full_name ||
        candidate?.email ||
        profile?.email ||
        "Ứng viên";
      const email = candidate?.email || profile?.email || "chua-co-email@example.com";
      const normalizedFullName = sanitizeVietnameseText(fullName);

      return {
        applicationId: String(row.id),
        candidateId,
        fullName: normalizedFullName,
        email,
        phone: candidate?.phone ?? null,
        resumeUrl: candidate?.resume_url ?? null,
        appliedPosition: jobsById.get(String(row.job_id)) ?? "Chưa rõ vị trí",
        status: normalizeApplicationStatus(row.status),
        rawStatus: (row.status ?? "new") as AnyApplicationStatus,
        appliedAt: row.created_at,
      };
    }),
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function createJob(input: JobUpsertInput) {
  const { supabase, employer } = await getRecruitmentContext();
  const companyProfile = await getCompanyProfile();
  const payload = {
    title: input.title,
    location: input.location,
    status: input.status,
    description: serializeDescriptionForCurrentSchema(input.description),
    employer_id: employer.id,
    company_name: companyProfile.companyName.trim() || COMPANY_NAME_PLACEHOLDER,
    logo_url: input.logoUrl || companyProfile.logoUrl,
    cover_url: input.coverUrl || companyProfile.coverUrl,
    requirements: normalizeStringList(input.requirements ?? []),
    benefits: normalizeStringList(input.benefits ?? []),
    industry: normalizeStringList(
      input.industry && input.industry.length > 0 ? input.industry : companyProfile.industry
    ),
    experience_level: input.experienceLevel ?? null,
    level: input.level ?? null,
    employment_type: input.employmentType ?? null,
    deadline: input.deadline ?? null,
    education_level: input.educationLevel ?? null,
    age_range: input.ageRange ?? null,
    full_address: input.fullAddress || companyProfile.location || input.location,
    source_url: input.sourceUrl ?? null,
    salary: input.salary ?? null,
    posted_date: new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase.from("jobs").insert(payload).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(
    supabase,
    employer.id,
    `Đã tạo tin tuyển dụng: ${input.title} (${input.status})`
  );

  return data;
}

export async function updateJob(id: string, input: JobUpsertInput) {
  const { supabase, employer } = await getRecruitmentContext();
  const companyProfile = await getCompanyProfile();
  const { error } = await supabase
    .from("jobs")
    .update({
      title: input.title,
      location: input.location,
      status: input.status,
      description: serializeDescriptionForCurrentSchema(input.description),
      company_name: companyProfile.companyName.trim() || COMPANY_NAME_PLACEHOLDER,
      logo_url: input.logoUrl || companyProfile.logoUrl,
      cover_url: input.coverUrl || companyProfile.coverUrl,
      requirements: normalizeStringList(input.requirements ?? []),
      benefits: normalizeStringList(input.benefits ?? []),
      industry: normalizeStringList(
        input.industry && input.industry.length > 0 ? input.industry : companyProfile.industry
      ),
      experience_level: input.experienceLevel ?? null,
      level: input.level ?? null,
      employment_type: input.employmentType ?? null,
      deadline: input.deadline ?? null,
      education_level: input.educationLevel ?? null,
      age_range: input.ageRange ?? null,
      full_address: input.fullAddress || companyProfile.location || input.location,
      source_url: input.sourceUrl ?? null,
      salary: input.salary ?? null,
    })
    .eq("id", id)
    .eq("employer_id", employer.id);

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(
    supabase,
    employer.id,
    `Đã cập nhật tin tuyển dụng: ${input.title} (${input.status})`
  );
}

export async function closeJob(id: string) {
  const { supabase, employer } = await getRecruitmentContext();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("employer_id", employer.id)
    .select("title")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logActivity(
    supabase,
    employer.id,
    `Đã đóng tin tuyển dụng: ${data?.title ?? id}`
  );
}

export async function updateApplicationStatus(
  applicationId: string,
  status: RecruitmentPipelineStatus
) {
  const { supabase, employer } = await getRecruitmentContext();
  const { data: application, error: fetchError } = await supabase
    .from("applications")
    .select("id, candidate_id, job_id")
    .eq("id", applicationId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, title, employer_id")
    .eq("id", application.job_id)
    .eq("employer_id", employer.id)
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Không tìm thấy tin tuyển dụng");
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, full_name, email")
    .eq("id", application.candidate_id)
    .maybeSingle();

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const candidateLabel =
    candidate?.full_name || candidate?.email || String(application.candidate_id);

  await logActivity(
    supabase,
    employer.id,
    `Đã chuyển ${candidateLabel} sang trạng thái ${PIPELINE_LABELS[status]} cho tin ${job.title}`
  );
}

export async function recordCandidateViewed(applicationId: string) {
  const { supabase, employer } = await getRecruitmentContext();
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, candidate_id, job_id")
    .eq("id", applicationId)
    .single();

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  const [{ data: candidate }, { data: job }] = await Promise.all([
    supabase
      .from("candidates")
      .select("full_name, email")
      .eq("id", application.candidate_id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("title, employer_id")
      .eq("id", application.job_id)
      .eq("employer_id", employer.id)
      .maybeSingle(),
  ]);

  const candidateLabel =
    candidate?.full_name || candidate?.email || String(application.candidate_id);
  const jobTitle = job?.title || "tin tuyển dụng";

  await logActivity(
    supabase,
    employer.id,
    `Đã xem hồ sơ ${candidateLabel} cho tin ${jobTitle}`
  );
}

async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string
) {
  const { error } = await supabase.from("activity_logs").insert({
    action: sanitizeVietnameseText(action),
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
