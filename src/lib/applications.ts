import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendApplicationStatusEmail, sendApplicationSubmittedEmails } from "@/lib/email/application-emails";
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
  source: "uploaded" | "builder";
  resumeId?: string;
}

export const APPLICATION_STATUS_LABELS: Record<RecruitmentPipelineStatus, string> = {
  new: "Mới",
  applied: "Đã nộp",
  reviewing: "Đang xem xét",
  interview: "Phỏng vấn",
  offer: "Đề nghị",
  hired: "Đã tuyển",
  rejected: "Từ chối",
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

async function ensureCandidateDirectory(
  supabase: SupabaseClient,
  user: User
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role && profile.role !== "candidate") {
    throw new Error("Chỉ ứng viên mới có thể nộp đơn.");
  }

  const payload = {
    id: user.id,
    full_name:
      String(profile?.full_name || user.user_metadata?.full_name || user.email || "Ứng viên").trim(),
    email: String(profile?.email || user.email || "").trim(),
    phone: profile?.phone ? String(profile.phone) : null,
  };

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

  return payload;
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

async function logActivitySafe(
  supabase: SupabaseClient,
  userId: string,
  action: string
) {
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
      return "Hồ sơ của bạn đang được bộ phận tuyển dụng xem xét.";
    case "interview":
      return "Bạn đã được chuyển sang vòng phỏng vấn. Nhà tuyển dụng sẽ liên hệ lịch cụ thể.";
    case "offer":
      return "Nhà tuyển dụng đã chuyển đơn của bạn sang giai đoạn đề nghị.";
    case "hired":
      return "Chúc mừng bạn. Nhà tuyển dụng đã xác nhận kết quả tuyển dụng.";
    case "rejected":
      return "Cảm ơn bạn đã ứng tuyển. Hiện tại nhà tuyển dụng chưa thể tiếp tục với hồ sơ này.";
    case "applied":
    default:
      return "Đơn ứng tuyển của bạn đã được ghi nhận.";
  }
}

function buildInternalCvUrl(applicationId: string) {
  return `/api/applications/${applicationId}/cv`;
}

export async function applyToJob(input: {
  jobId: string;
  coverLetter?: string | null;
  cvFile?: File | null;
  existingCvPath?: string | null;
  builderResumeId?: string | null;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const candidate = await ensureCandidateDirectory(supabase, user);

  const { data: jobWithHrEmail, error: jobWithHrEmailError } = await supabase
    .from("jobs")
    .select("id, title, company_name, location, employer_id, status, hr_email")
    .eq("id", input.jobId)
    .maybeSingle();

  const shouldFallbackToLegacyJobSelect =
    !!jobWithHrEmailError &&
    isApplicationSchemaError(jobWithHrEmailError, ["hr_email", "column", "schema cache"]);

  const { data: legacyJob, error: legacyJobError } = shouldFallbackToLegacyJobSelect
    ? await supabase
        .from("jobs")
        .select("id, title, company_name, location, employer_id, status")
        .eq("id", input.jobId)
        .maybeSingle()
    : { data: null, error: null };

  const jobError = shouldFallbackToLegacyJobSelect ? legacyJobError : jobWithHrEmailError;
  const job = (shouldFallbackToLegacyJobSelect ? legacyJob : jobWithHrEmail) as
    | {
        id: string;
        title: string;
        company_name: string | null;
        location: string | null;
        employer_id: string | null;
        status: string | null;
        hr_email?: string | null;
      }
    | null;

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Không tìm thấy tin tuyển dụng.");
  }

  if (job.status && job.status !== "open") {
    throw new Error("Tin tuyển dụng này hiện không nhận hồ sơ.");
  }

  const { data: employer, error: employerError } = job.employer_id
    ? await supabase
        .from("employers")
        .select("id, company_name, email")
        .eq("id", job.employer_id)
        .maybeSingle()
    : { data: null, error: null };

  if (employerError) {
    throw new Error(employerError.message);
  }

  const applicationId = crypto.randomUUID();
  const admin = createAdminClient();
  let safeFilename = "resume.pdf";
  let filePath = "";
  let fileBuffer: Buffer | null = null;
  let fileContentType = "application/pdf";

  if (input.existingCvPath?.trim()) {
    const existingCvPath = input.existingCvPath.trim();
    const { data: existingCv, error: existingCvError } = await supabase
      .from("applications")
      .select("cv_file_path")
      .eq("candidate_id", user.id)
      .eq("cv_file_path", existingCvPath)
      .not("cv_file_path", "is", null)
      .limit(1)
      .maybeSingle();

    if (existingCvError) {
      throw new Error(existingCvError.message);
    }

    if (!existingCv?.cv_file_path) {
      throw new Error("CV đã chọn không hợp lệ hoặc bạn không có quyền sử dụng.");
    }

    filePath = existingCv.cv_file_path;
    safeFilename = sanitizeFilename(filePath.split("/").pop() || "resume.pdf");
    const extension = safeFilename.includes(".") ? safeFilename.split(".").pop()?.toLowerCase() : "pdf";
    fileContentType =
      extension === "doc"
        ? "application/msword"
        : extension === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

    const { data: existingFile, error: existingFileError } = await admin.storage
      .from(APPLICATION_BUCKET)
      .download(filePath);

    if (existingFileError || !existingFile) {
      throw new Error(existingFileError?.message ?? "Không thể đọc CV đã lưu.");
    }

    fileBuffer = Buffer.from(await existingFile.arrayBuffer());
  } else if (input.builderResumeId?.trim()) {
    const builderResumeId = input.builderResumeId.trim();
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
      throw new Error("Không tìm thấy CV Builder đã chọn.");
    }

    safeFilename = sanitizeFilename(`${resumeRow.title || "cv-builder"}.pdf`);
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
      if (uploadError.message.toLowerCase().includes("bucket not found")) {
        throw new Error(
          "Bucket cv_uploads chưa tồn tại. Hãy chạy migration 20260312_ats_application_system.sql trên Supabase."
        );
      }
      throw new Error(uploadError.message);
    }
  } else if (input.cvFile) {
    safeFilename = sanitizeFilename(input.cvFile.name || "resume.pdf");
    const extension = safeFilename.includes(".") ? safeFilename.split(".").pop() : "pdf";
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
      if (uploadError.message.toLowerCase().includes("bucket not found")) {
        throw new Error(
          "Bucket cv_uploads chưa tồn tại. Hãy chạy migration 20260312_ats_application_system.sql trên Supabase."
        );
      }
      throw new Error(uploadError.message);
    }
  } else {
    throw new Error("Vui lòng tải lên CV mới hoặc chọn CV đã upload trước đó.");
  }

  const internalCvUrl = buildInternalCvUrl(applicationId);

  const { error: insertError } = await supabase.from("applications").insert({
    id: applicationId,
    job_id: job.id,
    candidate_id: user.id,
    status: "applied",
    cover_letter: input.coverLetter?.trim() || null,
    cv_file_path: filePath,
    cv_file_url: internalCvUrl,
  });

  if (insertError) {
    if (input.cvFile && filePath) {
      await admin.storage.from(APPLICATION_BUCKET).remove([filePath]);
    }
    throw new Error(insertError.message);
  }

  await supabase
    .from("candidates")
    .update({ resume_url: internalCvUrl })
    .eq("id", user.id);

  await logApplicationEvent(supabase, applicationId, "candidate_applied", user.id, {
    jobId: job.id,
    candidateEmail: candidate.email,
  });

  if (job.employer_id) {
    await logActivitySafe(
      supabase,
      job.employer_id,
      `Ứng viên ${candidate.full_name} vừa ứng tuyển vị trí ${job.title}`
    );
  }

  if (job.employer_id) {
    await createSystemNotification({
      recipientId: job.employer_id,
      actorId: user.id,
      type: "application_applied",
      title: "Có ứng viên mới ứng tuyển",
      description: `${candidate.full_name} vừa nộp hồ sơ cho vị trí ${job.title}.`,
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
    title: "Đã ghi nhận đơn ứng tuyển",
    description: `Hồ sơ của bạn cho vị trí ${job.title} đã được gửi thành công.`,
    href: `/candidate/applications/${applicationId}`,
    metadata: {
      applicationId,
      jobId: job.id,
    },
  });

  let emailSent = false;
  let emailError: string | null = null;

  const hrEmailFromPosting = String(job.hr_email || "").trim();
  const hrEmail = hrEmailFromPosting || employer?.email || "";

  if (!candidate.email) {
    emailError = "Không có email ứng viên để gửi xác nhận nộp đơn.";
  } else if (!hrEmail) {
    emailError = "Tin tuyển dụng chưa có email HR để nhận thông báo ứng tuyển.";
  } else {
    try {
      await sendApplicationSubmittedEmails({
        hrEmail,
        candidateEmail: candidate.email,
        candidateName: candidate.full_name,
        candidatePhone: candidate.phone,
        jobTitle: String(job.title),
        companyName: String(employer.company_name || job.company_name || "Nhà tuyển dụng"),
        jobLocation: String(job.location || ""),
        coverLetter: input.coverLetter,
        cvFilePath: filePath,
      });
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Gửi email thông báo thất bại.";
    }
  }

  return {
    applicationId,
    status: "applied" as RecruitmentPipelineStatus,
    cvUrl: internalCvUrl,
    emailSent,
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
    throw new Error(error?.message ?? "Không tìm thấy đơn ứng tuyển.");
  }

  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
  const isCandidateOwner = application.candidate_id === user.id;
  const isEmployerOwner = job?.employer_id === user.id;

  if (!isCandidateOwner && !isEmployerOwner) {
    throw new Error("Bạn không có quyền truy cập CV này.");
  }

  if (!application.cv_file_path) {
    if (application.cv_file_url) {
      return application.cv_file_url;
    }
    throw new Error("CV chưa được tải lên.");
  }

  const admin = createAdminClient();
  const { data, error: signedUrlError } = await admin.storage
    .from(APPLICATION_BUCKET)
    .createSignedUrl(application.cv_file_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    throw new Error(signedUrlError?.message ?? "Không thể tạo liên kết tải CV.");
  }

  return data.signedUrl;
}

export async function listCandidateCvOptions(): Promise<CandidateCvOption[]> {
  const { supabase, user } = await getAuthenticatedUser();

  const { data, error } = await supabase
    .from("applications")
    .select("cv_file_path, created_at, jobs ( title, company_name )")
    .eq("candidate_id", user.id)
    .not("cv_file_path", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const seen = new Set<string>();
  const items: CandidateCvOption[] = [];

  for (const row of data ?? []) {
    const path = String(row.cv_file_path || "").trim();
    if (!path || seen.has(path)) {
      continue;
    }

    seen.add(path);
    const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
    const fileName = path.split("/").pop() || "resume.pdf";
    const jobTitle = job?.title ? String(job.title) : "CV đã upload";
    const companyName = job?.company_name ? String(job.company_name) : "";

    items.push({
      path,
      label: companyName
        ? `${jobTitle} - ${companyName} (${fileName})`
        : `${jobTitle} (${fileName})`,
      createdAt: String(row.created_at || ""),
      source: "uploaded",
    });
  }

  const { data: resumes, error: resumesError } = await supabase
    .from("resumes")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (resumesError) {
    throw new Error(resumesError.message);
  }

  for (const resume of resumes ?? []) {
    items.push({
      path: "",
      label: `${String(resume.title || "CV Builder")} (CV Builder)`,
      createdAt: String(resume.updated_at || ""),
      source: "builder",
      resumeId: String(resume.id),
    });
  }

  return items;
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
    throw new Error("Chỉ nhà tuyển dụng mới được cập nhật trạng thái.");
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, candidate_id, job_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error(applicationError?.message ?? "Không tìm thấy đơn ứng tuyển.");
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, title, company_name, employer_id")
    .eq("id", application.job_id)
    .eq("employer_id", user.id)
    .maybeSingle();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Bạn không có quyền với đơn ứng tuyển này.");
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

  await logApplicationEvent(
    supabase,
    applicationId,
    getEventNameForStatus(status),
    user.id,
    { status }
  );

  await logActivitySafe(
    supabase,
    user.id,
    `Đã cập nhật trạng thái ứng tuyển của ${candidate?.full_name || candidate?.email || application.candidate_id} sang ${APPLICATION_STATUS_LABELS[status]}`
  );

  await createSystemNotification({
    recipientId: application.candidate_id,
    actorId: user.id,
    type: "application_status_updated",
    title: `Đơn ứng tuyển được cập nhật: ${APPLICATION_STATUS_LABELS[status]}`,
    description: `Nhà tuyển dụng đã cập nhật trạng thái hồ sơ vị trí ${job.title}.`,
    href: `/candidate/applications/${applicationId}`,
    metadata: {
      applicationId,
      jobId: job.id,
      status,
    },
  });

  if (candidate?.email) {
    await sendApplicationStatusEmail({
      candidateEmail: candidate.email,
      candidateName: candidate.full_name || candidate.email,
      jobTitle: String(job.title),
      companyName: String(job.company_name || "Nhà tuyển dụng"),
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

  let candidateIdsFilter: string[] | null = null;

  if (input.q) {
    const { data: candidateMatches, error: candidateMatchError } = await supabase
      .from("candidates")
      .select("id")
      .or(`full_name.ilike.%${input.q}%,email.ilike.%${input.q}%,phone.ilike.%${input.q}%`);

    if (candidateMatchError) {
      throw new Error(candidateMatchError.message);
    }

    candidateIdsFilter = (candidateMatches ?? []).map((row) => String(row.id));
    if (candidateIdsFilter.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 1 };
    }
  }

  let appsQuery = supabase
    .from("applications")
    .select("id, candidate_id, job_id, status, created_at, cv_file_url, cv_file_path, cover_letter", {
      count: "exact",
    })
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  if (input.status && input.status !== "all") {
    appsQuery = appsQuery.in("status", getStatusAliases(input.status));
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
  const { data: candidateRows, error: candidatesError } = candidateIds.length
    ? await supabase
        .from("candidates")
        .select("id, full_name, email, phone, resume_url")
        .in("id", candidateIds)
    : { data: [], error: null };

  if (candidatesError) {
    throw new Error(candidatesError.message);
  }

  const candidatesById = new Map(
    (candidateRows ?? []).map((row) => [String(row.id), row])
  );

  return {
    items: (appRows ?? []).map((row) => {
      const candidate = candidatesById.get(String(row.candidate_id));
      return {
        applicationId: String(row.id),
        candidateId: String(row.candidate_id),
        fullName: String(candidate?.full_name || candidate?.email || "Ứng viên"),
        email: String(candidate?.email || ""),
        phone: candidate?.phone ?? null,
        resumeUrl:
          row.cv_file_path || row.cv_file_url
            ? buildInternalCvUrl(String(row.id))
            : (candidate?.resume_url ?? null),
        coverLetter: row.cover_letter ?? null,
        appliedPosition: jobsById.get(String(row.job_id)) ?? "Chưa rõ vị trí",
        status: normalizeApplicationStatus(row.status),
        rawStatus: (row.status ?? "applied") as AnyApplicationStatus,
        appliedAt: String(row.created_at),
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
    throw new Error(error?.message ?? "Không tìm thấy đơn ứng tuyển.");
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
    createdAt: String(application.created_at),
    updatedAt: String(application.updated_at ?? application.created_at),
    coverLetter: application.cover_letter ?? null,
    cvUrl:
      application.cv_file_path || application.cv_file_url
        ? buildInternalCvUrl(String(application.id))
        : null,
    job: {
      id: String(job.id),
      title: String(job.title),
      companyName: String(job.company_name || "Nhà tuyển dụng"),
      logoUrl: job.logo_url ? String(job.logo_url) : null,
      salary: job.salary ? String(job.salary) : null,
      location: job.location ? String(job.location) : null,
      employmentType: job.employment_type ? String(job.employment_type) : null,
      level: job.level ? String(job.level) : null,
      fullAddress: job.full_address ? String(job.full_address) : null,
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
