import "server-only";

import type { Attachment } from "nodemailer/lib/mailer";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/email/mail-service";

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

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
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
  return `
    <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:20px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">TalentFlow</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">${title}</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">${subtitle}</p>
        </div>
        <div style="padding:32px;">
          ${body}
        </div>
      </div>
    </div>
  `;
}

function buildRecruiterApplicationEmailHtml(input: {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  jobId: string;
  appliedAt: string;
  introduction: string;
  atsApplicationUrl: string;
  cvReviewUrl: string;
  hasAttachment: boolean;
}) {
  const safeCandidateName = escapeHtml(input.candidateName || "Ứng viên");
  const safeCandidateEmail = input.candidateEmail
    ? escapeHtml(input.candidateEmail)
    : "Chưa có email";
  const safeCandidatePhone = input.candidatePhone
    ? escapeHtml(input.candidatePhone)
    : "Chưa có số điện thoại";
  const safeJobTitle = escapeHtml(input.jobTitle);
  const safeCompanyName = escapeHtml(input.companyName);
  const safeJobId = escapeHtml(input.jobId);
  const safeAppliedAt = escapeHtml(input.appliedAt);
  const safeIntroduction = escapeHtml(input.introduction || "Ứng viên không để lại lời nhắn.").replace(
    /\n/g,
    "<br/>"
  );
  const safeAtsUrl = escapeHtml(input.atsApplicationUrl);
  const safeCvUrl = escapeHtml(input.cvReviewUrl);

  return `
    <div style="margin:0;padding:32px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:20px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">TalentFlow</p>
          <h1 style="margin:0;font-size:32px;line-height:1.2;">Có Ứng Viên Mới</h1>
          <p style="margin:10px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">${safeCandidateName} vừa nộp hồ sơ cho vị trí ${safeJobTitle}.</p>
        </div>

        <div style="padding:30px 32px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;width:180px;">Vị trí ứng tuyển</td><td style="padding:8px 0;color:#334155;">${safeJobTitle}</td></tr>
            <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Tên công ty</td><td style="padding:8px 0;color:#334155;">${safeCompanyName}</td></tr>
            <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Mã tin tuyển dụng</td><td style="padding:8px 0;color:#334155;">${safeJobId}</td></tr>
            <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Thời gian ứng tuyển</td><td style="padding:8px 0;color:#334155;">${safeAppliedAt}</td></tr>
          </table>

          <div style="border:1px solid #dbe4f0;border-radius:16px;padding:18px;margin-bottom:22px;background:#f8fbff;">
            <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Thông tin ứng viên</p>
            <p style="margin:0 0 8px;"><strong>Họ và tên:</strong> ${safeCandidateName}</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${safeCandidateEmail}</p>
            <p style="margin:0 0 8px;"><strong>Số điện thoại:</strong> ${safeCandidatePhone}</p>
            <p style="margin:0;"><strong>Giới thiệu:</strong><br/>${safeIntroduction}</p>
          </div>

          <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">
            Bấm vào nút bên dưới để mở thẳng ATS tại đơn ứng tuyển này.
          </p>

          <p style="margin:0 0 12px;">
            <a href="${safeAtsUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Mở ứng viên trong ATS</a>
          </p>

          <p style="margin:0;">
            <a href="${safeCvUrl}" style="display:inline-block;padding:11px 18px;border-radius:12px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;text-decoration:none;font-weight:700;">Mở CV ứng viên</a>
          </p>

          <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
            ${
              input.hasAttachment
                ? "CV của ứng viên cũng đã được đính kèm trong email để recruiter xem nhanh."
                : "Không thể tự động đính kèm CV, vui lòng dùng nút mở CV để xem từ hệ thống."
            }
          </p>
        </div>
      </div>
    </div>
  `;
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

export async function sendApplicationSubmittedEmails(input: ApplicationSubmittedEmailInput) {
  const attachment = await getCvAttachmentFromStorage(input.cvFilePath);
  const cvReviewUrl = toAbsoluteUrl(input.cvDownloadUrl);
  const recruiterApplicationsUrl = toAbsoluteUrl(
    `/hr/candidates?view=pipeline&applicationId=${encodeURIComponent(input.applicationId)}`
  );
  const safeCandidateName = input.candidateName || "Ứng viên";
  const safeCandidateEmail = input.candidateEmail?.trim() || "";
  const safeCandidatePhone = input.candidatePhone?.trim() || "";
  const safeAppliedAt = formatTimestamp(input.appliedAt);
  const safeIntroduction = input.introduction.trim();

  const recruiterHtml = buildRecruiterApplicationEmailHtml({
    candidateName: safeCandidateName,
    candidateEmail: safeCandidateEmail,
    candidatePhone: safeCandidatePhone,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    jobId: input.jobId,
    appliedAt: safeAppliedAt,
    introduction: safeIntroduction,
    atsApplicationUrl: recruiterApplicationsUrl,
    cvReviewUrl,
    hasAttachment: Boolean(attachment),
  });

  const recruiterText = [
    `[Đơn ứng tuyển mới] ${safeCandidateName} đã ứng tuyển ${input.jobTitle}`,
    "",
    "Thông tin tin tuyển dụng:",
    `- vị trí: ${input.jobTitle}`,
    `- công ty: ${input.companyName}`,
    `- mã tin: ${input.jobId}`,
    `- thời gian ứng tuyển: ${safeAppliedAt}`,
    "",
    "Thông tin ứng viên:",
    `- họ và tên: ${safeCandidateName}`,
    safeCandidateEmail ? `- email: ${safeCandidateEmail}` : null,
    safeCandidatePhone ? `- số điện thoại: ${safeCandidatePhone}` : null,
    `- giới thiệu: ${safeIntroduction}`,
    "",
    `- mở trong ATS: ${recruiterApplicationsUrl}`,
    attachment
      ? "CV của ứng viên được đính kèm trong email này."
      : `Xem CV trên TalentFlow: ${cvReviewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: input.hrEmail,
    subject: `[Đơn ứng tuyển mới] ${safeCandidateName} ứng tuyển ${input.jobTitle}`,
    text: recruiterText,
    html: recruiterHtml,
    attachments: attachment ? [attachment] : undefined,
  });

  if (!safeCandidateEmail) {
    return { candidateEmailSent: false };
  }

  const candidateApplicationsUrl = toAbsoluteUrl("/candidate/applications");
  const candidateHtml = buildEmailShell(
    "Ứng Tuyển Thành Công",
    `Hồ sơ ứng tuyển vị trí ${escapeHtml(input.jobTitle)} tại ${escapeHtml(input.companyName)} đã được ghi nhận.`,
    `
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">Chào ${escapeHtml(safeCandidateName)},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">Cảm ơn bạn đã ứng tuyển qua TalentFlow. Thông tin của bạn đã được gửi thành công đến nhà tuyển dụng.</p>
      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:20px;background:#f8fbff;">
        <p style="margin:0 0 8px;"><strong>Vị trí ứng tuyển:</strong> ${escapeHtml(input.jobTitle)}</p>
        <p style="margin:0 0 8px;"><strong>Công ty:</strong> ${escapeHtml(input.companyName)}</p>
        <p style="margin:0;"><strong>Thời gian nộp:</strong> ${escapeHtml(safeAppliedAt)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155;">Vui lòng chờ phản hồi từ nhà tuyển dụng.</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">Bạn có thể xem lại tất cả đơn đã nộp trong trang quản lý ứng tuyển của ứng viên.</p>
      <p style="margin:20px 0 0;"><a href="${candidateApplicationsUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Xem đơn ứng tuyển của tôi</a></p>
    `
  );

  const candidateText = [
    `[Ứng tuyển thành công] Bạn đã ứng tuyển ${input.jobTitle}`,
    "",
    `Chào ${safeCandidateName},`,
    "",
    "Đơn ứng tuyển của bạn đã được gửi thành công.",
    `vị trí: ${input.jobTitle}`,
    `công ty: ${input.companyName}`,
    `thời gian nộp: ${safeAppliedAt}`,
    "Vui lòng chờ phản hồi từ nhà tuyển dụng.",
    "",
    `Theo dõi đơn ứng tuyển: ${candidateApplicationsUrl}`,
  ].join("\n");

  await sendEmail({
    to: safeCandidateEmail,
    subject: `[Ứng tuyển thành công] Bạn đã ứng tuyển ${input.jobTitle}`,
    text: candidateText,
    html: candidateHtml,
  });

  return { candidateEmailSent: true };
}

export async function sendApplicationStatusEmail(input: ApplicationStatusEmailInput) {
  const safeCandidateName = input.candidateName || input.candidateEmail;

  await sendEmail({
    to: input.candidateEmail,
    subject: `Cập nhật đơn ứng tuyển: ${input.statusLabel}`,
    text: [
      `Chào ${safeCandidateName},`,
      "",
      `Đơn ứng tuyển cho vị trí ${input.jobTitle} tại ${input.companyName} đã được cập nhật sang trạng thái: ${input.statusLabel}.`,
      input.message,
      "",
      `Theo dõi chi tiết tại: ${getBaseUrl()}/candidate/applications`,
    ].join("\n"),
    html: buildEmailShell(
      "Trạng Thái Ứng Tuyển Đã Cập Nhật",
      `${escapeHtml(input.jobTitle)} tại ${escapeHtml(input.companyName)}`,
      `
        <p style="margin:0 0 14px;">Chào ${escapeHtml(safeCandidateName)},</p>
        <p style="margin:0 0 14px;">Trạng thái đơn ứng tuyển của bạn hiện là <strong>${escapeHtml(input.statusLabel)}</strong>.</p>
        <p style="margin:0 0 18px;color:#475569;">${escapeHtml(input.message)}</p>
        <p style="margin:0;"><a href="${getBaseUrl()}/candidate/applications" style="color:#1d4ed8;font-weight:700;">Mở trang quản lý ứng tuyển</a></p>
      `
    ),
  });
}
