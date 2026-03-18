import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  sendApplicationStatusEmail,
  sendApplicationSubmittedEmails,
} from "@/lib/email/application-emails";
import { createSystemNotification } from "@/lib/notifications";
import { renderResumePdfBuffer } from "@/lib/resume-pdf";
import type {
  AnyApplicationStatus,
  PaginatedResult,
  RecruitmentCandidate,
  RecruitmentPipelineMetric,
  RecruitmentPipelineStatus,
} from "@/types/recruitment";

const APPLICATION_BUCKET = "cv_uploads";

export interface CandidateCvOption {
  path: string;
  label: string;
  createdAt: string;
  source: "profile" | "uploaded" | "builder";
  resumeId?: string;
}

export const APPLICATION_STATUS_LABELS: Record<RecruitmentPipelineStatus, string> = {
  new: "Moi",
  applied: "Da nop",
  reviewing: "Dang xem xet",
  interview: "Phong van",
  offer: "De nghi",
  hired: "Da tuyen",
  rejected: "Tu choi",
};

type CandidateDefaults = {
  fullName: string;
  email: string;
  phone: string | null;
  introduction: string;
  profileCvPath: string | null;
  profileCvUrl: string | null;
};

type JobLookup = {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  employer_id: string | null;
  status: string | null;
  hr_email?: string | null;
};

function normalizeApplicationStatus(
  status: string | null | undefined
): RecruitmentPipelineStatus {
  switch (status) {
    case "pending":
    case "new":
    case "applied":
      return "applied";
    case "viewed":
    case "reviewing":
      return "reviewing";
    case "interviewing":
    case "interview":
      return "interview";
    case "offered":
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    case "rejected":
      return "rejected";
    default:
      return "applied";
  }
}

function getStatusAliases(status: RecruitmentPipelineStatus): string[] {
  switch (status) {
    case "new":
    case "applied":
      return ["applied", "pending", "new"];
    case "reviewing":
      return ["reviewing", "viewed"];
    case "interview":
      return ["interview", "interviewing"];
    case "offer":
      return ["offer", "offered"];
    case "hired":
      return ["hired"];
    case "rejected":
      return ["rejected"];
    default:
      return ["applied", "pending", "new"];
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function safeTrim(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function normalizeOptionalString(value: unknown) {
  const next = safeTrim(value);
  return next || null;
}

function getApplicationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return String(error ?? "");
}

function isStorageObjectMissingError(error: unknown) {
  const message = getApplicationErrorMessage(error).toLowerCase();
  return message.includes("object not found") || message.includes("not found");
}

function isApplicationSchemaError(error: unknown, markers: string[]) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message ?? "").toLowerCase()
        : String(error ?? "").toLowerCase();

  return markers.some((marker) => message.includes(marker.toLowerCase()));
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

async function getCandidateDefaults(
  supabase: SupabaseClient,
  user: User
): Promise<CandidateDefaults> {
  const [
    { data: profile, error: profileError },
    { data: candidateProfile, error: candidateProfileError },
    { data: candidateRow, error: candidateError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("candidate_profiles")
      .select("full_name, email, phone, introduction, cv_file_path, cv_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("candidates")
      .select("full_name, email, phone, resume_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (
    candidateProfileError &&
    !isApplicationSchemaError(candidateProfileError, [
      'relation "candidate_profiles" does not exist',
      "could not find the table 'public.candidate_profiles' in the schema cache",
      'column "full_name" does not exist',
      'column "phone" does not exist',
      'column "introduction" does not exist',
      'column "cv_file_path" does not exist',
      'column "cv_url" does not exist',
    ])
  ) {
    throw new Error(candidateProfileError.message);
  }

  if (
    candidateError &&
    !isApplicationSchemaError(candidateError, [
      'relation "candidates" does not exist',
      "could not find the table 'public.candidates' in the schema cache",
    ])
  ) {
    throw new Error(candidateError.message);
  }

  if (profile?.role && profile.role !== "candidate") {
    throw new Error("Only candidates can submit applications.");
  }

  return {
    fullName:
      safeTrim(candidateProfile?.full_name) ||
      safeTrim(candidateRow?.full_name) ||
      safeTrim(profile?.full_name) ||
      safeTrim(user.user_metadata?.full_name) ||
      safeTrim(user.email) ||
      "Ứng viên",
    email:
      safeTrim(candidateProfile?.email) ||
      safeTrim(candidateRow?.email) ||
      safeTrim(profile?.email) ||
      safeTrim(user.email),
    phone:
      normalizeOptionalString(candidateProfile?.phone) ??
      normalizeOptionalString(candidateRow?.phone),
    introduction: safeTrim(candidateProfile?.introduction),
    profileCvPath: normalizeOptionalString(candidateProfile?.cv_file_path),
    profileCvUrl:
      normalizeOptionalString(candidateProfile?.cv_url) ??
      normalizeOptionalString(candidateRow?.resume_url),
  };
}

async function upsertCandidateDirectoryRecord(
  supabase: SupabaseClient,
  payload: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    resume_url: string | null;
  }
) {
  const { error } = await supabase.from("candidates").upsert(payload);
  if (
    error &&
    !isApplicationSchemaError(error, [
      'relation "candidates" does not exist',
      "could not find the table 'public.candidates' in the schema cache",
    ])
  ) {
    throw new Error(error.message);
  }
}

async function logApplicationEvent(
  supabase: SupabaseClient,
  applicationId: string,
  event: string,
  actorId: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.from("application_events").insert({
    application_id: applicationId,
    event,
    actor_id: actorId,
    metadata: metadata ?? {},
  });

  if (
    error &&
    !isApplicationSchemaError(error, [
      'relation "application_events" does not exist',
      "could not find the table 'public.application_events' in the schema cache",
    ])
  ) {
    throw new Error(error.message);
  }
}

async function logActivitySafe(userId: string, action: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("activity_logs").insert({
    action,
    user_id: userId,
  });

  if (
    error &&
    !isApplicationSchemaError(error, [
      'relation "activity_logs" does not exist',
      "could not find the table 'public.activity_logs' in the schema cache",
    ])
  ) {
    throw new Error(error.message);
  }
}

function getEventNameForStatus(status: RecruitmentPipelineStatus) {
  switch (status) {
    case "reviewing":
      return "hr_reviewed";
    case "interview":
      return "interview_scheduled";
    case "offer":
      return "offer_sent";
    case "hired":
      return "candidate_hired";
    case "rejected":
      return "candidate_rejected";
    case "applied":
    default:
      return "candidate_applied";
  }
}

function getCandidateStatusMessage(status: RecruitmentPipelineStatus) {
  switch (status) {
    case "reviewing":
      return "Ho so cua ban dang duoc bo phan tuyen dung xem xet.";
    case "interview":
      return "Ban da duoc chuyen sang vong phong van. Nha tuyen dung se lien he lich cu the.";
    case "offer":
      return "Nha tuyen dung da chuyen don cua ban sang giai doan de nghi.";
    case "hired":
      return "Chuc mung ban. Nha tuyen dung da xac nhan ket qua tuyen dung.";
    case "rejected":
      return "Cam on ban da ung tuyen. Hien tai nha tuyen dung chua the tiep tuc voi ho so nay.";
    case "applied":
    default:
      return "Don ung tuyen cua ban da duoc ghi nhan.";
  }
}

function buildInternalCvUrl(applicationId: string) {
  return `/api/applications/${applicationId}/cv`;
}

async function getJobForApplication(
  supabase: SupabaseClient,
  jobId: string
): Promise<JobLookup> {
  const { data: jobWithHrEmail, error: jobWithHrEmailError } = await supabase
    .from("jobs")
    .select("id, title, company_name, location, employer_id, status, hr_email")
    .eq("id", jobId)
    .maybeSingle();

  const shouldFallbackToLegacyJobSelect =
    Boolean(jobWithHrEmailError) &&
    isApplicationSchemaError(jobWithHrEmailError, ["hr_email", "column", "schema cache"]);

  const { data: legacyJob, error: legacyJobError } = shouldFallbackToLegacyJobSelect
    ? await supabase
        .from("jobs")
        .select("id, title, company_name, location, employer_id, status")
        .eq("id", jobId)
        .maybeSingle()
    : { data: null, error: null };

  const jobError = shouldFallbackToLegacyJobSelect ? legacyJobError : jobWithHrEmailError;
  const job = (shouldFallbackToLegacyJobSelect ? legacyJob : jobWithHrEmail) as JobLookup | null;

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Khong tim thay tin tuyen dung.");
  }

  if (job.status && job.status !== "open") {
    throw new Error("Tin tuyen dung nay hien khong nhan ho so.");
  }

  return job;
}

async function cleanupFailedApplication(
  supabase: SupabaseClient,
  applicationId: string,
  filePath: string,
  createdStorageFile: boolean
) {
  await supabase.from("applications").delete().eq("id", applicationId);

  if (createdStorageFile && filePath) {
    const admin = createAdminClient();
    await admin.storage.from(APPLICATION_BUCKET).remove([filePath]);
  }
}

export async function applyToJob(input: {
  jobId: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  introduction?: string | null;
  cvFile?: File | null;
  existingCvPath?: string | null;
  builderResumeId?: string | null;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const candidateDefaults = await getCandidateDefaults(supabase, user);

  const candidateName = safeTrim(input.fullName || candidateDefaults.fullName);
  const candidateEmail = safeTrim(input.email || candidateDefaults.email);
  const candidatePhone =
    normalizeOptionalString(input.phone) ?? normalizeOptionalString(candidateDefaults.phone);
  const introduction = safeTrim(input.introduction || candidateDefaults.introduction);

  if (!candidateName) {
    throw new Error("Full name is required.");
  }

  if (!candidateEmail && !candidatePhone) {
    throw new Error("Please enter at least email or phone number");
  }

  if (!introduction) {
    throw new Error("Introduction is required");
  }

  const admin = createAdminClient();
  const job = await getJobForApplication(supabase, input.jobId);
  const { data: employer, error: employerError } = job.employer_id
      ? await admin
          .from("employers")
          .select("id, company_name, email")
          .eq("id", job.employer_id)
          .maybeSingle()
    : { data: null, error: null };

  if (employerError) {
    throw new Error(employerError.message);
  }

  const applicationId = crypto.randomUUID();
  let filePath = "";
  let fileBuffer: Buffer | null = null;
  let fileContentType = "application/pdf";
  let createdStorageFile = false;

  if (safeTrim(input.existingCvPath)) {
    const existingCvPath = safeTrim(input.existingCvPath);
    const [{ data: existingApplicationCv, error: existingApplicationCvError }, { data: existingProfileCv, error: existingProfileCvError }] =
      await Promise.all([
        supabase
          .from("applications")
          .select("cv_file_path")
          .eq("candidate_id", user.id)
          .eq("cv_file_path", existingCvPath)
          .not("cv_file_path", "is", null)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("candidate_profiles")
          .select("cv_file_path")
          .eq("user_id", user.id)
          .eq("cv_file_path", existingCvPath)
          .maybeSingle(),
      ]);

    if (existingApplicationCvError) {
      throw new Error(existingApplicationCvError.message);
    }

    if (
      existingProfileCvError &&
      !isApplicationSchemaError(existingProfileCvError, [
        'relation "candidate_profiles" does not exist',
        "could not find the table 'public.candidate_profiles' in the schema cache",
        'column "cv_file_path" does not exist',
      ])
    ) {
      throw new Error(existingProfileCvError.message);
    }

    filePath = safeTrim(
      existingApplicationCv?.cv_file_path || existingProfileCv?.cv_file_path
    );

    if (!filePath) {
      throw new Error("Please upload or select a CV");
    }

    const fileName = sanitizeFilename(filePath.split("/").pop() || "resume.pdf");
    const extension = fileName.split(".").pop()?.toLowerCase();
    fileContentType =
      extension === "doc"
        ? "application/msword"
        : extension === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

    const { data: existingFile, error: existingFileError } = await admin.storage
      .from(APPLICATION_BUCKET)
      .download(filePath);

    if (existingFileError) {
      if (isStorageObjectMissingError(existingFileError)) {
        throw new Error(
          "Selected CV file is no longer available. Please upload a new CV."
        );
      }

      throw new Error(getApplicationErrorMessage(existingFileError) || "Khong the doc CV da luu.");
    }

    if (!existingFile) {
      throw new Error(
        "Selected CV file is no longer available. Please upload a new CV."
      );
    }

    fileBuffer = Buffer.from(await existingFile.arrayBuffer());
  } else if (safeTrim(input.builderResumeId)) {
    const builderResumeId = safeTrim(input.builderResumeId);
    const { data: resumeRow, error: resumeError } = await supabase
      .from("resumes")
      .select("id, title, resume_data")
      .eq("id", builderResumeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (resumeError) {
      throw new Error(resumeError.message);
    }

    if (!resumeRow) {
      throw new Error("Khong tim thay CV Builder da chon.");
    }

    filePath = `${user.id}/${job.id}/${applicationId}-builder-${resumeRow.id}.pdf`;
    fileBuffer = await renderResumePdfBuffer({
      title: String(resumeRow.title || "CV Builder"),
      resumeData: Array.isArray(resumeRow.resume_data) ? resumeRow.resume_data : [],
    });
    fileContentType = "application/pdf";

    const { error: uploadError } = await admin.storage
      .from(APPLICATION_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: fileContentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    createdStorageFile = true;
  } else if (input.cvFile) {
    const fileName = sanitizeFilename(input.cvFile.name || "resume.pdf");
    const extension = fileName.includes(".") ? fileName.split(".").pop() : "pdf";
    filePath = `${user.id}/${job.id}/${applicationId}.${extension}`;
    fileBuffer = Buffer.from(await input.cvFile.arrayBuffer());
    fileContentType = input.cvFile.type || "application/pdf";

    const { error: uploadError } = await admin.storage
      .from(APPLICATION_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: fileContentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    createdStorageFile = true;
  } else {
    throw new Error("Please upload or select a CV");
  }

  const internalCvUrl = buildInternalCvUrl(applicationId);
  const appliedAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("applications").insert({
    id: applicationId,
    job_id: job.id,
    candidate_id: user.id,
    full_name: candidateName,
    email: candidateEmail || null,
    phone: candidatePhone,
    introduction,
    applied_at: appliedAt,
    status: "applied",
    cover_letter: introduction,
    cv_file_path: filePath,
    cv_file_url: internalCvUrl,
  });

  if (insertError) {
    if (createdStorageFile && filePath) {
      await admin.storage.from(APPLICATION_BUCKET).remove([filePath]);
    }
    throw new Error(insertError.message);
  }

  const recruiterEmail = safeTrim(job.hr_email) || safeTrim(employer?.email);
  if (!recruiterEmail) {
    await cleanupFailedApplication(supabase, applicationId, filePath, createdStorageFile);
    throw new Error("Recruiter email is required before applications can be submitted.");
  }

  let candidateEmailSent = false;
  let emailError: string | null = null;

  try {
    const companyName = safeTrim(employer?.company_name || job.company_name || "Recruiter");
    const emailResult = await sendApplicationSubmittedEmails({
      hrEmail: recruiterEmail,
      candidateEmail: candidateEmail || null,
      candidateName,
      candidatePhone,
      jobTitle: safeTrim(job.title),
      companyName,
      jobId: safeTrim(job.id),
      introduction,
      appliedAt,
      cvFilePath: filePath,
      cvDownloadUrl: internalCvUrl,
    });
    candidateEmailSent = emailResult.candidateEmailSent;
  } catch (error) {
    emailError =
      error instanceof Error ? error.message : "Failed to send application emails.";
    console.error("Unable to send application emails.", {
      applicationId,
      jobId: job.id,
      filePath,
      error: emailError,
    });
  }

  await upsertCandidateDirectoryRecord(supabase, {
    id: user.id,
    full_name: candidateName,
    email: candidateEmail || safeTrim(user.email) || "candidate@example.com",
    phone: candidatePhone,
    resume_url: internalCvUrl,
  });

  await logApplicationEvent(supabase, applicationId, "candidate_applied", user.id, {
    jobId: job.id,
    candidateEmail: candidateEmail || null,
  });

  if (job.employer_id) {
    await logActivitySafe(
      job.employer_id,
      `Ung vien ${candidateName} vua ung tuyen vi tri ${job.title}`
    );

    await createSystemNotification({
      recipientId: job.employer_id,
      actorId: user.id,
      type: "application_applied",
      title: "Co ung vien moi ung tuyen",
      description: `${candidateName} vua nop ho so cho vi tri ${job.title}.`,
      href: "/hr/candidates",
      metadata: {
        applicationId,
        candidateId: user.id,
        jobId: job.id,
      },
    });
  }

  await createSystemNotification({
    recipientId: user.id,
    actorId: job.employer_id ? String(job.employer_id) : null,
    type: "application_submitted",
    title: "Da ghi nhan don ung tuyen",
    description: `Ho so cua ban cho vi tri ${job.title} da duoc gui thanh cong.`,
    href: `/candidate/applications/${applicationId}`,
    metadata: {
      applicationId,
      jobId: job.id,
    },
  });

  return {
    applicationId,
    status: "applied" as RecruitmentPipelineStatus,
    cvUrl: internalCvUrl,
    emailSent: candidateEmailSent,
    candidateEmailSent,
    emailError,
  };
}

export async function getDownloadUrlForApplication(applicationId: string) {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: application, error } = await supabase
    .from("applications")
    .select("id, candidate_id, job_id, cv_file_path, cv_file_url, jobs ( employer_id )")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new Error(error?.message ?? "Khong tim thay don ung tuyen.");
  }

  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
  const isCandidateOwner = application.candidate_id === user.id;
  const isEmployerOwner = job?.employer_id === user.id;

  if (!isCandidateOwner && !isEmployerOwner) {
    throw new Error("Ban khong co quyen truy cap CV nay.");
  }

  if (!application.cv_file_path) {
    if (application.cv_file_url) {
      return application.cv_file_url;
    }
    throw new Error("CV chua duoc tai len.");
  }

  const admin = createAdminClient();
  const { data, error: signedUrlError } = await admin.storage
    .from(APPLICATION_BUCKET)
    .createSignedUrl(application.cv_file_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    throw new Error(signedUrlError?.message ?? "Khong the tao lien ket tai CV.");
  }

  return data.signedUrl;
}

export async function listCandidateCvOptions(): Promise<CandidateCvOption[]> {
  const { supabase, user } = await getAuthenticatedUser();
  const items: CandidateCvOption[] = [];
  const seen = new Set<string>();

  const [{ data: profileCv, error: profileCvError }, { data: applicationCvs, error: applicationCvError }, { data: resumes, error: resumesError }] =
    await Promise.all([
      supabase
        .from("candidate_profiles")
        .select("cv_file_path, updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("applications")
        .select("cv_file_path, created_at, jobs ( title, company_name )")
        .eq("candidate_id", user.id)
        .not("cv_file_path", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("resumes")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

  if (
    profileCvError &&
    !isApplicationSchemaError(profileCvError, [
      'relation "candidate_profiles" does not exist',
      "could not find the table 'public.candidate_profiles' in the schema cache",
      'column "cv_file_path" does not exist',
    ])
  ) {
    throw new Error(profileCvError.message);
  }

  if (applicationCvError) {
    throw new Error(applicationCvError.message);
  }

  if (resumesError) {
    throw new Error(resumesError.message);
  }

  const profilePath = safeTrim(profileCv?.cv_file_path);
  if (profilePath && !seen.has(profilePath)) {
    seen.add(profilePath);
    const fileName = profilePath.split("/").pop() || "profile-cv.pdf";
    items.push({
      path: profilePath,
      label: `CV trong hồ sơ (${fileName})`,
      createdAt: String(profileCv?.updated_at || new Date().toISOString()),
      source: "profile",
    });
  }

  for (const row of applicationCvs ?? []) {
    const path = safeTrim(row.cv_file_path);
    if (!path || seen.has(path)) {
      continue;
    }

    seen.add(path);
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    const fileName = path.split("/").pop() || "resume.pdf";
    const jobTitle = safeTrim(job?.title) || "CV đã tải lên";
    const companyName = safeTrim(job?.company_name);

    items.push({
      path,
      label: companyName
        ? `${jobTitle} - ${companyName} (${fileName})`
        : `${jobTitle} (${fileName})`,
      createdAt: String(row.created_at || new Date().toISOString()),
      source: "uploaded",
    });
  }

  for (const resume of resumes ?? []) {
    items.push({
      path: "",
      label: `${String(resume.title || "CV đã tạo")} (CV Builder)`,
      createdAt: String(resume.updated_at || new Date().toISOString()),
      source: "builder",
      resumeId: String(resume.id),
    });
  }

  const admin = createAdminClient();
  const availableItems = await Promise.all(
    items.map(async (item) => {
      if (!item.path || item.source === "builder") {
        return item;
      }

      const { data, error } = await admin.storage
        .from(APPLICATION_BUCKET)
        .createSignedUrl(item.path, 60);

      if (data?.signedUrl) {
        return item;
      }

      if (isStorageObjectMissingError(error)) {
        return null;
      }

      return item;
    })
  );

  return availableItems
    .filter((item): item is CandidateCvOption => Boolean(item))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updateApplicationStatusForEmployer(
  applicationId: string,
  status: RecruitmentPipelineStatus
) {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role && profile.role !== "hr") {
    throw new Error("Chi nha tuyen dung moi duoc cap nhat trang thai.");
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, candidate_id, job_id, full_name, email")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error(applicationError?.message ?? "Khong tim thay don ung tuyen.");
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, title, company_name, employer_id")
    .eq("id", application.job_id)
    .eq("employer_id", user.id)
    .maybeSingle();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Ban khong co quyen voi don ung tuyen nay.");
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

  await logApplicationEvent(supabase, applicationId, getEventNameForStatus(status), user.id, {
    status,
  });

  await logActivitySafe(
    user.id,
    `Da cap nhat trang thai ung tuyen cua ${
      safeTrim(application.full_name || candidate?.full_name || candidate?.email || application.candidate_id)
    } sang ${APPLICATION_STATUS_LABELS[status]}`
  );

  await createSystemNotification({
    recipientId: application.candidate_id,
    actorId: user.id,
    type: "application_status_updated",
    title: `Don ung tuyen duoc cap nhat: ${APPLICATION_STATUS_LABELS[status]}`,
    description: `Nha tuyen dung da cap nhat trang thai ho so vi tri ${job.title}.`,
    href: `/candidate/applications/${applicationId}`,
    metadata: {
      applicationId,
      jobId: job.id,
      status,
    },
  });

  const candidateEmail = safeTrim(application.email || candidate?.email);
  if (candidateEmail) {
    await sendApplicationStatusEmail({
      candidateEmail,
      candidateName:
        safeTrim(application.full_name || candidate?.full_name || candidateEmail) || candidateEmail,
      jobTitle: safeTrim(job.title),
      companyName: safeTrim(job.company_name || "Recruiter"),
      statusLabel: APPLICATION_STATUS_LABELS[status],
      message: getCandidateStatusMessage(status),
    });
  }
}

export async function getEmployerCandidates(input: {
  q?: string;
  position?: string;
  status?: "all" | RecruitmentPipelineStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<RecruitmentCandidate>> {
  const { supabase, user } = await getAuthenticatedUser();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, input.limit ?? 8);

  let jobsQuery = supabase
    .from("jobs")
    .select("id, title")
    .eq("employer_id", user.id);

  if (input.position) {
    jobsQuery = jobsQuery.ilike("title", `%${input.position}%`);
  }

  const { data: jobRows, error: jobsError } = await jobsQuery;
  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobsById = new Map((jobRows ?? []).map((row) => [String(row.id), String(row.title)]));
  const jobIds = [...jobsById.keys()];

  if (jobIds.length === 0) {
    return { items: [], total: 0, page, limit, totalPages: 1 };
  }

  let appsQuery = supabase
    .from("applications")
    .select(
      "id, candidate_id, job_id, status, created_at, applied_at, cv_file_url, cv_file_path, cover_letter, introduction, full_name, email, phone",
      { count: "exact" }
    )
    .in("job_id", jobIds)
    .order("applied_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (input.status && input.status !== "all") {
    appsQuery = appsQuery.in("status", getStatusAliases(input.status));
  }

  if (input.q) {
    const q = input.q.replaceAll(",", " ").trim();
    appsQuery = appsQuery.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
    );
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data: appRows, error: appsError, count } = await appsQuery.range(from, to);

  if (appsError) {
    throw new Error(appsError.message);
  }

  const candidateIds = [...new Set((appRows ?? []).map((row) => String(row.candidate_id)))];
  const { data: candidateRows, error: candidatesError } = candidateIds.length
    ? await supabase
        .from("candidates")
        .select("id, full_name, email, phone, resume_url")
        .in("id", candidateIds)
    : { data: [], error: null };

  if (candidatesError) {
    throw new Error(candidatesError.message);
  }

  const candidatesById = new Map((candidateRows ?? []).map((row) => [String(row.id), row]));

  return {
    items: (appRows ?? []).map((row) => {
      const candidate = candidatesById.get(String(row.candidate_id));
      return {
        applicationId: String(row.id),
        candidateId: String(row.candidate_id),
        fullName:
          safeTrim(row.full_name) ||
          safeTrim(candidate?.full_name) ||
          safeTrim(candidate?.email) ||
          "Candidate",
        email: safeTrim(row.email) || safeTrim(candidate?.email),
        phone: normalizeOptionalString(row.phone) ?? normalizeOptionalString(candidate?.phone),
        resumeUrl:
          row.cv_file_path || row.cv_file_url
            ? buildInternalCvUrl(String(row.id))
            : normalizeOptionalString(candidate?.resume_url),
        coverLetter:
          normalizeOptionalString(row.introduction) ?? normalizeOptionalString(row.cover_letter),
        appliedPosition: jobsById.get(String(row.job_id)) ?? "Chua ro vi tri",
        status: normalizeApplicationStatus(row.status),
        rawStatus: (row.status ?? "applied") as AnyApplicationStatus,
        appliedAt: String(row.applied_at || row.created_at),
      };
    }),
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getEmployerPipelineMetrics(): Promise<RecruitmentPipelineMetric[]> {
  const { supabase, user } = await getAuthenticatedUser();
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id")
    .eq("employer_id", user.id);

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobIds = (jobs ?? []).map((job) => String(job.id));
  const base: RecruitmentPipelineMetric[] = (
    ["applied", "reviewing", "interview", "offer", "hired", "rejected"] as RecruitmentPipelineStatus[]
  ).map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    count: 0,
  }));

  if (jobIds.length === 0) {
    return base;
  }

  const { data: applicationRows, error: applicationsError } = await supabase
    .from("applications")
    .select("status")
    .in("job_id", jobIds);

  if (applicationsError) {
    throw new Error(applicationsError.message);
  }

  const counts = new Map<RecruitmentPipelineStatus, number>(
    base.map((item) => [item.status, 0])
  );

  for (const row of applicationRows ?? []) {
    const normalized = normalizeApplicationStatus(row.status);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return base.map((item) => ({
    ...item,
    count: counts.get(item.status) ?? 0,
  }));
}

export async function getCandidateApplicationDetail(applicationId: string) {
  const { supabase, user } = await getAuthenticatedUser();

  const { data: application, error } = await supabase
    .from("applications")
    .select(`
      id,
      candidate_id,
      job_id,
      status,
      created_at,
      updated_at,
      applied_at,
      full_name,
      email,
      phone,
      introduction,
      cover_letter,
      cv_file_path,
      cv_file_url,
      jobs (
        id,
        title,
        company_name,
        logo_url,
        salary,
        location,
        employment_type,
        level,
        full_address
      )
    `)
    .eq("id", applicationId)
    .eq("candidate_id", user.id)
    .maybeSingle();

  if (error || !application) {
    throw new Error(error?.message ?? "Khong tim thay don ung tuyen.");
  }

  const { data: events, error: eventsError } = await supabase
    .from("application_events")
    .select("id, event, metadata, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (
    eventsError &&
    !isApplicationSchemaError(eventsError, [
      'relation "application_events" does not exist',
      "could not find the table 'public.application_events' in the schema cache",
    ])
  ) {
    throw new Error(eventsError.message);
  }

  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
  return {
    id: String(application.id),
    status: normalizeApplicationStatus(application.status),
    rawStatus: String(application.status ?? "applied"),
    createdAt: String(application.applied_at || application.created_at),
    updatedAt: String(application.updated_at ?? application.created_at),
    appliedAt: String(application.applied_at || application.created_at),
    fullName: safeTrim(application.full_name),
    email: normalizeOptionalString(application.email),
    phone: normalizeOptionalString(application.phone),
    introduction:
      normalizeOptionalString(application.introduction) ??
      normalizeOptionalString(application.cover_letter),
    coverLetter:
      normalizeOptionalString(application.introduction) ??
      normalizeOptionalString(application.cover_letter),
    cvUrl:
      application.cv_file_path || application.cv_file_url
        ? buildInternalCvUrl(String(application.id))
        : null,
    job: {
      id: String(job?.id || ""),
      title: safeTrim(job?.title),
      companyName: safeTrim(job?.company_name || "Recruiter"),
      logoUrl: normalizeOptionalString(job?.logo_url),
      salary: normalizeOptionalString(job?.salary),
      location: normalizeOptionalString(job?.location),
      employmentType: normalizeOptionalString(job?.employment_type),
      level: normalizeOptionalString(job?.level),
      fullAddress: normalizeOptionalString(job?.full_address),
    },
    events: (events ?? []).map((event) => ({
      id: String(event.id),
      event: String(event.event),
      createdAt: String(event.created_at),
      metadata:
        event.metadata && typeof event.metadata === "object"
          ? (event.metadata as Record<string, unknown>)
          : {},
    })),
  };
}
