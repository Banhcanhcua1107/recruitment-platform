import "server-only";

import type { Attachment } from "nodemailer/lib/mailer";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/email/mail-service";
import { resolveMailTransportForRecipient } from "@/lib/email-testing/sender";
import { getCanonicalAppOrigin } from "@/lib/url/canonical-origin";

interface ApplicationSubmittedEmailInput {
  applicationId: string;
  hrEmail: string;
  candidateEmail: string | null;
  candidateName: string;
  candidatePhone?: string | null;
  jobTitle: string;
  companyName: string;
  jobId: string;
  introduction: string;
  appliedAt: string;
  cvFilePath: string;
  cvDownloadUrl: string;
}

interface ApplicationStatusEmailInput {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  statusLabel: string;
  message: string;
}

interface ComposedEmailPayload {
  subject: string;
  html: string;
  text: string;
}

interface RecruiterApplicationTemplateInput {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  jobId: string;
  applicationId: string;
  appliedAt: string;
  introduction: string;
  atsApplicationUrl: string;
  cvReviewUrl: string;
  hasAttachment: boolean;
}

interface CandidateApplicationTemplateInput {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  appliedAt: string;
  candidateApplicationsUrl: string;
}

interface StatusUpdateTemplateInput {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  statusLabel: string;
  message: string;
  candidateApplicationsUrl: string;
}

type ApplicationEmailChannel = "recruiter" | "candidate";

export interface ApplicationEmailRecipientDebug {
  channel: ApplicationEmailChannel;
  recipient: string;
  transport: "real" | "test";
  success: boolean;
  messageId: string | null;
  accepted: string[];
  rejected: string[];
  error: string | null;
}

interface ApplicationSubmittedEmailResult {
  candidateEmailSent: boolean;
  recruiterEmailSent: boolean;
  emailDebug: ApplicationEmailRecipientDebug[];
}

const FALLBACK_CANDIDATE_NAME = "Ứng viên";
const FALLBACK_CANDIDATE_EMAIL = "Chưa cập nhật";
const FALLBACK_CANDIDATE_PHONE = "Chưa cập nhật";
const FALLBACK_JOB_TITLE = "Vị trí chưa cập nhật";
const FALLBACK_COMPANY_NAME = "Nhà tuyển dụng";
const FALLBACK_STATUS_LABEL = "Đang cập nhật";
const FALLBACK_MESSAGE =
  "Nhà tuyển dụng đã cập nhật hồ sơ của bạn. Vui lòng theo dõi trang quản lý ứng tuyển để xem chi tiết mới nhất.";
const FALLBACK_INTRODUCTION = "Ứng viên chưa để lại lời nhắn.";
const FALLBACK_APPLICATION_TIME = "Vừa được ghi nhận";

function getBaseUrl() {
  return getCanonicalAppOrigin();
}

function getContentTypeFromPath(filePath: string) {
  const extension = filePath.split(".").pop()?.toLowerCase();
  if (extension === "doc") {
    return "application/msword";
  }
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/pdf";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : "";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildEmailShell(title: string, subtitle: string, body: string) {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);

  return `
    <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:20px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">TalentFlow</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${safeTitle}</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">${safeSubtitle}</p>
        </div>
        <div style="padding:32px;">
          ${body}
        </div>
      </div>
    </div>
  `;
}

export function buildRecruiterApplicationSubmittedEmailContent(
  input: RecruiterApplicationTemplateInput,
): ComposedEmailPayload {
  const candidateName = normalizeText(input.candidateName, FALLBACK_CANDIDATE_NAME);
  const candidateEmail = normalizeText(input.candidateEmail, FALLBACK_CANDIDATE_EMAIL);
  const candidatePhone = normalizeText(input.candidatePhone, FALLBACK_CANDIDATE_PHONE);
  const jobTitle = normalizeText(input.jobTitle, FALLBACK_JOB_TITLE);
  const companyName = normalizeText(input.companyName, FALLBACK_COMPANY_NAME);
  const jobId = normalizeText(input.jobId, "Chưa cập nhật");
  const applicationId = normalizeText(input.applicationId, "Chưa cập nhật");
  const appliedAt = normalizeText(input.appliedAt, FALLBACK_APPLICATION_TIME);
  const introduction = normalizeText(input.introduction, FALLBACK_INTRODUCTION);
  const atsApplicationUrl = normalizeText(input.atsApplicationUrl, getBaseUrl());
  const cvReviewUrl = normalizeText(input.cvReviewUrl, getBaseUrl());
  const attachmentNote = input.hasAttachment
    ? "CV ứng viên đã được đính kèm trong email này để tiện xem nhanh."
    : "Tệp CV chưa thể đính kèm tự động. Vui lòng dùng nút xem CV để mở từ hệ thống.";

  const html = buildEmailShell(
    "Có hồ sơ ứng tuyển mới",
    "TalentFlow vừa ghi nhận một đơn ứng tuyển mới cần bộ phận tuyển dụng xử lý.",
    `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#334155;">Kính gửi Bộ phận tuyển dụng,</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">
        ${escapeHtml(candidateName)} vừa nộp hồ sơ. Vui lòng kiểm tra thông tin bên dưới để xử lý đúng tiến độ tuyển dụng.
      </p>

      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:18px;background:#f8fbff;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Thông tin đơn ứng tuyển</p>
        <p style="margin:0 0 8px;"><strong>Vị trí ứng tuyển:</strong> ${escapeHtml(jobTitle)}</p>
        <p style="margin:0 0 8px;"><strong>Trạng thái hồ sơ:</strong> Mới nhận</p>
        <p style="margin:0 0 8px;"><strong>Công ty tuyển dụng:</strong> ${escapeHtml(companyName)}</p>
        <p style="margin:0 0 8px;"><strong>Mã tin tuyển dụng:</strong> ${escapeHtml(jobId)}</p>
        <p style="margin:0 0 8px;"><strong>Mã đơn ứng tuyển:</strong> ${escapeHtml(applicationId)}</p>
        <p style="margin:0;"><strong>Thời gian nộp hồ sơ:</strong> ${escapeHtml(appliedAt)}</p>
      </div>

      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:18px;background:#ffffff;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Thông tin ứng viên</p>
        <p style="margin:0 0 8px;"><strong>Họ và tên:</strong> ${escapeHtml(candidateName)}</p>
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(candidateEmail)}</p>
        <p style="margin:0 0 8px;"><strong>Số điện thoại:</strong> ${escapeHtml(candidatePhone)}</p>
        <p style="margin:0;"><strong>Lời nhắn của ứng viên:</strong><br/>${escapeHtml(introduction).replace(/\n/g, "<br/>")}</p>
      </div>

      <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155;">Bước tiếp theo đề xuất: mở đơn ứng tuyển trong ATS để đánh giá hồ sơ và cập nhật trạng thái kịp thời.</p>

      <p style="margin:0 0 12px;">
        <a href="${escapeHtml(atsApplicationUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Mở đơn trong ATS</a>
      </p>

      <p style="margin:0 0 14px;">
        <a href="${escapeHtml(cvReviewUrl)}" style="display:inline-block;padding:11px 18px;border-radius:12px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-weight:700;">Xem CV ứng viên</a>
      </p>

      <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#64748b;">${escapeHtml(attachmentNote)}</p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">Trân trọng,<br/>TalentFlow</p>
    `,
  );

  const text = [
    `[TalentFlow] Hồ sơ ứng tuyển mới cho vị trí ${jobTitle}`,
    "",
    "Kính gửi Bộ phận tuyển dụng,",
    `${candidateName} vừa nộp hồ sơ trên TalentFlow.`,
    "",
    "Thông tin đơn ứng tuyển:",
    `- Vị trí ứng tuyển: ${jobTitle}`,
    "- Trạng thái hồ sơ: Mới nhận",
    `- Công ty tuyển dụng: ${companyName}`,
    `- Mã tin tuyển dụng: ${jobId}`,
    `- Mã đơn ứng tuyển: ${applicationId}`,
    `- Thời gian nộp hồ sơ: ${appliedAt}`,
    "",
    "Thông tin ứng viên:",
    `- Họ và tên: ${candidateName}`,
    `- Email: ${candidateEmail}`,
    `- Số điện thoại: ${candidatePhone}`,
    `- Lời nhắn: ${introduction}`,
    "",
    "Bước tiếp theo:",
    "- Mở đơn trong ATS để đánh giá hồ sơ và cập nhật trạng thái.",
    `- Mở đơn trong ATS: ${atsApplicationUrl}`,
    `- Xem CV ứng viên: ${cvReviewUrl}`,
    attachmentNote,
    "",
    "Trân trọng,",
    "TalentFlow",
  ].join("\n");

  return {
    subject: `[TalentFlow] Hồ sơ ứng tuyển mới: ${jobTitle}`,
    html,
    text,
  };
}

export function buildCandidateApplicationSubmittedEmailContent(
  input: CandidateApplicationTemplateInput,
): ComposedEmailPayload {
  const candidateName = normalizeText(input.candidateName, FALLBACK_CANDIDATE_NAME);
  const jobTitle = normalizeText(input.jobTitle, FALLBACK_JOB_TITLE);
  const companyName = normalizeText(input.companyName, FALLBACK_COMPANY_NAME);
  const appliedAt = normalizeText(input.appliedAt, FALLBACK_APPLICATION_TIME);
  const candidateApplicationsUrl = normalizeText(input.candidateApplicationsUrl, getBaseUrl());

  const html = buildEmailShell(
    "Xác nhận đã nhận hồ sơ ứng tuyển",
    "Hệ thống đã ghi nhận đơn ứng tuyển của bạn và chuyển đến nhà tuyển dụng.",
    `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#334155;">Chào ${escapeHtml(candidateName)},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">
        Bạn nhận được email này vì vừa nộp hồ sơ trên TalentFlow. Đơn ứng tuyển của bạn đã được ghi nhận thành công.
      </p>

      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:18px;background:#f8fbff;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Thông tin đơn ứng tuyển</p>
        <p style="margin:0 0 8px;"><strong>Vị trí ứng tuyển:</strong> ${escapeHtml(jobTitle)}</p>
        <p style="margin:0 0 8px;"><strong>Trạng thái hiện tại:</strong> Đã ghi nhận</p>
        <p style="margin:0 0 8px;"><strong>Công ty tuyển dụng:</strong> ${escapeHtml(companyName)}</p>
        <p style="margin:0;"><strong>Thời gian nộp hồ sơ:</strong> ${escapeHtml(appliedAt)}</p>
      </div>

      <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155;">
        Bước tiếp theo: vui lòng theo dõi trạng thái ứng tuyển trong tài khoản của bạn. TalentFlow sẽ gửi thông báo khi có cập nhật mới.
      </p>
      <p style="margin:0 0 16px;">
        <a href="${escapeHtml(candidateApplicationsUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Theo dõi tiến trình ứng tuyển</a>
      </p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">Trân trọng,<br/>TalentFlow</p>
    `,
  );

  const text = [
    `[TalentFlow] Xác nhận đã nhận hồ sơ: ${jobTitle}`,
    "",
    `Chào ${candidateName},`,
    "",
    "TalentFlow đã ghi nhận thành công đơn ứng tuyển của bạn.",
    "",
    "Thông tin đơn ứng tuyển:",
    `- Vị trí ứng tuyển: ${jobTitle}`,
    "- Trạng thái hiện tại: Đã ghi nhận",
    `- Công ty tuyển dụng: ${companyName}`,
    `- Thời gian nộp hồ sơ: ${appliedAt}`,
    "",
    "Bước tiếp theo:",
    "- Theo dõi trạng thái trong trang quản lý ứng tuyển.",
    `- Link theo dõi: ${candidateApplicationsUrl}`,
    "",
    "Trân trọng,",
    "TalentFlow",
  ].join("\n");

  return {
    subject: `[TalentFlow] Xác nhận đã nhận hồ sơ: ${jobTitle}`,
    html,
    text,
  };
}

export function buildApplicationStatusUpdatedEmailContent(
  input: StatusUpdateTemplateInput,
): ComposedEmailPayload {
  const candidateName = normalizeText(input.candidateName, FALLBACK_CANDIDATE_NAME);
  const jobTitle = normalizeText(input.jobTitle, FALLBACK_JOB_TITLE);
  const statusLabel = normalizeText(input.statusLabel, FALLBACK_STATUS_LABEL);
  const companyName = normalizeText(input.companyName, FALLBACK_COMPANY_NAME);
  const message = normalizeText(input.message, FALLBACK_MESSAGE);
  const candidateApplicationsUrl = normalizeText(input.candidateApplicationsUrl, getBaseUrl());

  const html = buildEmailShell(
    "Trạng thái ứng tuyển đã cập nhật",
    "Nhà tuyển dụng vừa cập nhật tiến trình xử lý hồ sơ của bạn.",
    `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#334155;">Chào ${escapeHtml(candidateName)},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">
        Bạn nhận được email này vì đơn ứng tuyển trên TalentFlow vừa có cập nhật mới.
      </p>

      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:18px;background:#f8fbff;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Thông tin cập nhật</p>
        <p style="margin:0 0 8px;"><strong>Vị trí ứng tuyển:</strong> ${escapeHtml(jobTitle)}</p>
        <p style="margin:0 0 8px;"><strong>Trạng thái hiện tại:</strong> ${escapeHtml(statusLabel)}</p>
        <p style="margin:0 0 8px;"><strong>Công ty tuyển dụng:</strong> ${escapeHtml(companyName)}</p>
        <p style="margin:0;"><strong>Ghi chú từ hệ thống:</strong> ${escapeHtml(message)}</p>
      </div>

      <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155;">Bước tiếp theo: vui lòng mở trang quản lý ứng tuyển để kiểm tra thông tin chi tiết và các yêu cầu tiếp theo (nếu có).</p>
      <p style="margin:0 0 16px;"><a href="${escapeHtml(candidateApplicationsUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Mở trang quản lý ứng tuyển</a></p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">Trân trọng,<br/>TalentFlow</p>
    `,
  );

  const text = [
    `[TalentFlow] Cập nhật trạng thái ứng tuyển: ${statusLabel}`,
    "",
    `Chào ${candidateName},`,
    "",
    "Đơn ứng tuyển của bạn vừa được cập nhật.",
    "",
    "Thông tin cập nhật:",
    `- Vị trí ứng tuyển: ${jobTitle}`,
    `- Trạng thái hiện tại: ${statusLabel}`,
    `- Công ty tuyển dụng: ${companyName}`,
    `- Ghi chú: ${message}`,
    "",
    "Bước tiếp theo:",
    "- Mở trang quản lý ứng tuyển để xem chi tiết mới nhất.",
    `- Link quản lý ứng tuyển: ${candidateApplicationsUrl}`,
    "",
    "Trân trọng,",
    "TalentFlow",
  ].join("\n");

  return {
    subject: `[TalentFlow] Cập nhật trạng thái ứng tuyển: ${statusLabel}`,
    html,
    text,
  };
}

function toAbsoluteUrl(pathOrUrl: string) {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return getBaseUrl();
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${getBaseUrl()}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function createApplicationEmailDebug(input: {
  channel: ApplicationEmailChannel;
  recipient: string;
  sendResult?: Awaited<ReturnType<typeof sendEmail>>;
  error?: string;
}): ApplicationEmailRecipientDebug {
  const recipient = normalizeText(input.recipient, "").toLowerCase();
  const transport = resolveMailTransportForRecipient(recipient);

  return {
    channel: input.channel,
    recipient,
    transport,
    success: !input.error,
    messageId: input.sendResult?.messageId || null,
    accepted: input.sendResult?.accepted || [],
    rejected: input.sendResult?.rejected || [],
    error: input.error || null,
  };
}

async function getCvAttachmentFromStorage(filePath: string): Promise<Attachment | null> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.storage.from("cv_uploads").download(filePath);

    if (error || !data) {
      console.warn("Unable to download CV attachment from storage.", {
        filePath,
        error: error?.message || null,
      });
      return null;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const filename = filePath.split("/").pop() || "resume.pdf";
    return {
      filename,
      content: buffer,
      contentType: getContentTypeFromPath(filePath),
    };
  } catch (error) {
    console.warn("Unexpected error while downloading CV attachment.", {
      filePath,
      error: error instanceof Error ? error.message : String(error ?? ""),
    });
    return null;
  }
}

export async function sendApplicationSubmittedEmails(
  input: ApplicationSubmittedEmailInput,
): Promise<ApplicationSubmittedEmailResult> {
  const attachment = await getCvAttachmentFromStorage(input.cvFilePath);
  const cvReviewUrl = toAbsoluteUrl(input.cvDownloadUrl);
  const recruiterApplicationsUrl = toAbsoluteUrl(
    `/hr/candidates?view=pipeline&applicationId=${encodeURIComponent(input.applicationId)}`
  );
  const candidateName = normalizeText(input.candidateName, FALLBACK_CANDIDATE_NAME);
  const candidateEmail = normalizeOptionalText(input.candidateEmail);
  const candidatePhone = normalizeOptionalText(input.candidatePhone);
  const jobTitle = normalizeText(input.jobTitle, FALLBACK_JOB_TITLE);
  const companyName = normalizeText(input.companyName, FALLBACK_COMPANY_NAME);
  const jobId = normalizeText(input.jobId, "Chưa cập nhật");
  const applicationId = normalizeText(input.applicationId, "Chưa cập nhật");
  const safeAppliedAt = normalizeText(formatTimestamp(input.appliedAt), FALLBACK_APPLICATION_TIME);
  const introduction = normalizeText(input.introduction, FALLBACK_INTRODUCTION);

  const recruiterEmailContent = buildRecruiterApplicationSubmittedEmailContent({
    candidateName,
    candidateEmail,
    candidatePhone,
    jobTitle,
    companyName,
    jobId,
    applicationId,
    appliedAt: safeAppliedAt,
    introduction,
    atsApplicationUrl: recruiterApplicationsUrl,
    cvReviewUrl,
    hasAttachment: Boolean(attachment),
  });

  const deliveryFailures: string[] = [];
  const emailDebug: ApplicationEmailRecipientDebug[] = [];
  let recruiterEmailSent = false;

  try {
    const sendResult = await sendEmail({
      to: input.hrEmail,
      subject: recruiterEmailContent.subject,
      text: recruiterEmailContent.text,
      html: recruiterEmailContent.html,
      attachments: attachment ? [attachment] : undefined,
    });

    const recipientDebug = createApplicationEmailDebug({
      channel: "recruiter",
      recipient: input.hrEmail,
      sendResult,
    });
    emailDebug.push(recipientDebug);

    console.info("Application email delivery success.", {
      applicationId: input.applicationId,
      channel: recipientDebug.channel,
      recipient: recipientDebug.recipient,
      transport: recipientDebug.transport,
      messageId: recipientDebug.messageId,
      accepted: recipientDebug.accepted,
      rejected: recipientDebug.rejected,
    });

    recruiterEmailSent = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const recipientDebug = createApplicationEmailDebug({
      channel: "recruiter",
      recipient: input.hrEmail,
      error: message,
    });
    emailDebug.push(recipientDebug);

    console.error("Failed to deliver application email to recruiter.", {
      applicationId: input.applicationId,
      channel: recipientDebug.channel,
      recipient: recipientDebug.recipient,
      transport: recipientDebug.transport,
      error: message,
    });
    deliveryFailures.push(
      `${recipientDebug.channel}(${recipientDebug.recipient})[${recipientDebug.transport}]: ${message}`,
    );
  }

  let candidateEmailSent = false;
  if (!candidateEmail) {
    if (deliveryFailures.length > 0) {
      const deliveryError = new Error(
        `Application email delivery failed. ${deliveryFailures.join(" | ")}`,
      ) as Error & { emailDebug?: ApplicationEmailRecipientDebug[] };
      deliveryError.emailDebug = emailDebug;
      throw deliveryError;
    }

    return {
      candidateEmailSent,
      recruiterEmailSent,
      emailDebug,
    };
  }

  const candidateApplicationsUrl = toAbsoluteUrl("/candidate/applications");
  const candidateEmailContent = buildCandidateApplicationSubmittedEmailContent({
    candidateName,
    jobTitle,
    companyName,
    appliedAt: safeAppliedAt,
    candidateApplicationsUrl,
  });

  try {
    const sendResult = await sendEmail({
      to: candidateEmail,
      subject: candidateEmailContent.subject,
      text: candidateEmailContent.text,
      html: candidateEmailContent.html,
    });

    const recipientDebug = createApplicationEmailDebug({
      channel: "candidate",
      recipient: candidateEmail,
      sendResult,
    });
    emailDebug.push(recipientDebug);

    console.info("Application email delivery success.", {
      applicationId: input.applicationId,
      channel: recipientDebug.channel,
      recipient: recipientDebug.recipient,
      transport: recipientDebug.transport,
      messageId: recipientDebug.messageId,
      accepted: recipientDebug.accepted,
      rejected: recipientDebug.rejected,
    });

    candidateEmailSent = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
    const recipientDebug = createApplicationEmailDebug({
      channel: "candidate",
      recipient: candidateEmail,
      error: message,
    });
    emailDebug.push(recipientDebug);

    console.error("Failed to deliver application email to candidate.", {
      applicationId: input.applicationId,
      channel: recipientDebug.channel,
      recipient: recipientDebug.recipient,
      transport: recipientDebug.transport,
      error: message,
    });
    deliveryFailures.push(
      `${recipientDebug.channel}(${recipientDebug.recipient})[${recipientDebug.transport}]: ${message}`,
    );
  }

  if (deliveryFailures.length > 0) {
    const deliveryError = new Error(
      `Application email delivery failed. ${deliveryFailures.join(" | ")}`,
    ) as Error & { emailDebug?: ApplicationEmailRecipientDebug[] };
    deliveryError.emailDebug = emailDebug;
    throw deliveryError;
  }

  return {
    candidateEmailSent,
    recruiterEmailSent,
    emailDebug,
  };
}

export async function sendApplicationStatusEmail(input: ApplicationStatusEmailInput) {
  const safeCandidateName = normalizeText(input.candidateName, input.candidateEmail);
  const statusEmailContent = buildApplicationStatusUpdatedEmailContent({
    candidateName: safeCandidateName,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    statusLabel: input.statusLabel,
    message: input.message,
    candidateApplicationsUrl: toAbsoluteUrl("/candidate/applications"),
  });

  await sendEmail({
    to: input.candidateEmail,
    subject: statusEmailContent.subject,
    text: statusEmailContent.text,
    html: statusEmailContent.html,
  });
}
