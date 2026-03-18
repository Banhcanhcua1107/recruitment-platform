import "server-only";

import type { Attachment } from "nodemailer/lib/mailer";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/email/mail-service";

interface ApplicationSubmittedEmailInput {
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

  return date.toLocaleString("en-US", {
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
  const safeCandidateName = input.candidateName || "Candidate";
  const safeCandidateEmail = input.candidateEmail?.trim() || "";
  const safeCandidatePhone = input.candidatePhone?.trim() || "";
  const safeAppliedAt = formatTimestamp(input.appliedAt);
  const safeIntroduction = input.introduction.trim();

  const recruiterHtml = buildEmailShell(
    "New Candidate Application",
    `${escapeHtml(safeCandidateName)} has applied for ${escapeHtml(input.jobTitle)}.`,
    `
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Job Title</td><td style="padding:8px 0;color:#334155;">${escapeHtml(input.jobTitle)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Company Name</td><td style="padding:8px 0;color:#334155;">${escapeHtml(input.companyName)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Job ID</td><td style="padding:8px 0;color:#334155;">${escapeHtml(input.jobId)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700;color:#1e293b;">Applied At</td><td style="padding:8px 0;color:#334155;">${escapeHtml(safeAppliedAt)}</td></tr>
      </table>
      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:24px;background:#f8fbff;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Candidate Information</p>
        <p style="margin:0 0 8px;"><strong>Full Name:</strong> ${escapeHtml(safeCandidateName)}</p>
        ${safeCandidateEmail ? `<p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(safeCandidateEmail)}</p>` : ""}
        ${safeCandidatePhone ? `<p style="margin:0 0 8px;"><strong>Phone:</strong> ${escapeHtml(safeCandidatePhone)}</p>` : ""}
        <p style="margin:0;"><strong>Introduction:</strong><br/>${escapeHtml(safeIntroduction).replace(/\n/g, "<br/>")}</p>
      </div>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">
        ${
          attachment
            ? "The candidate CV is attached to this email for your review."
            : "We could not attach the CV automatically. Use the secure link below to review it in TalentFlow."
        }
      </p>
      <p style="margin:0;"><a href="${escapeHtml(cvReviewUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Open candidate CV</a></p>
    `
  );

  const recruiterText = [
    `[New Application] ${safeCandidateName} applied for ${input.jobTitle}`,
    "",
    "Job info:",
    `- jobTitle: ${input.jobTitle}`,
    `- companyName: ${input.companyName}`,
    `- jobId: ${input.jobId}`,
    `- appliedAt: ${safeAppliedAt}`,
    "",
    "Candidate info:",
    `- fullName: ${safeCandidateName}`,
    safeCandidateEmail ? `- email: ${safeCandidateEmail}` : null,
    safeCandidatePhone ? `- phone: ${safeCandidatePhone}` : null,
    `- introduction: ${safeIntroduction}`,
    "",
    attachment
      ? "The candidate CV is attached to this email."
      : `Review CV in TalentFlow: ${cvReviewUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: input.hrEmail,
    subject: `[New Application] ${safeCandidateName} applied for ${input.jobTitle}`,
    text: recruiterText,
    html: recruiterHtml,
    attachments: attachment ? [attachment] : undefined,
  });

  if (!safeCandidateEmail) {
    return { candidateEmailSent: false };
  }

  const candidateHtml = buildEmailShell(
    "Application Submitted Successfully",
    `Your application for ${escapeHtml(input.jobTitle)} at ${escapeHtml(input.companyName)} has been received.`,
    `
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">Hello ${escapeHtml(safeCandidateName)},</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155;">Thank you for applying through TalentFlow. Your information has been successfully sent to the recruiter.</p>
      <div style="border:1px solid #dbe4f0;border-radius:16px;padding:20px;margin-bottom:20px;background:#f8fbff;">
        <p style="margin:0 0 8px;"><strong>Job Title:</strong> ${escapeHtml(input.jobTitle)}</p>
        <p style="margin:0 0 8px;"><strong>Company Name:</strong> ${escapeHtml(input.companyName)}</p>
        <p style="margin:0;"><strong>Applied At:</strong> ${escapeHtml(safeAppliedAt)}</p>
      </div>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155;">Please wait for recruiter response</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">You can review your submitted applications anytime from your candidate dashboard.</p>
      <p style="margin:20px 0 0;"><a href="${getBaseUrl()}/candidate/applications" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">View My Applications</a></p>
    `
  );

  const candidateText = [
    `[Application Submitted] You applied for ${input.jobTitle}`,
    "",
    `Hello ${safeCandidateName},`,
    "",
    "Your application has been submitted successfully.",
    `jobTitle: ${input.jobTitle}`,
    `companyName: ${input.companyName}`,
    `appliedAt: ${safeAppliedAt}`,
    "Please wait for recruiter response",
    "",
    `Track your applications: ${getBaseUrl()}/candidate/applications`,
  ].join("\n");

  await sendEmail({
    to: safeCandidateEmail,
    subject: `[Application Submitted] You applied for ${input.jobTitle}`,
    text: candidateText,
    html: candidateHtml,
  });

  return { candidateEmailSent: true };
}

export async function sendApplicationStatusEmail(input: ApplicationStatusEmailInput) {
  const safeCandidateName = input.candidateName || input.candidateEmail;

  await sendEmail({
    to: input.candidateEmail,
    subject: `Cap nhat don ung tuyen: ${input.statusLabel}`,
    text: [
      `Chao ${safeCandidateName},`,
      "",
      `Don ung tuyen cho vi tri ${input.jobTitle} tai ${input.companyName} da duoc cap nhat sang trang thai: ${input.statusLabel}.`,
      input.message,
      "",
      `Theo doi chi tiet tai: ${getBaseUrl()}/candidate/applications`,
    ].join("\n"),
    html: buildEmailShell(
      "Application Status Updated",
      `${escapeHtml(input.jobTitle)} at ${escapeHtml(input.companyName)}`,
      `
        <p style="margin:0 0 14px;">Hello ${escapeHtml(safeCandidateName)},</p>
        <p style="margin:0 0 14px;">Your application status is now <strong>${escapeHtml(input.statusLabel)}</strong>.</p>
        <p style="margin:0 0 18px;color:#475569;">${escapeHtml(input.message)}</p>
        <p style="margin:0;"><a href="${getBaseUrl()}/candidate/applications" style="color:#1d4ed8;font-weight:700;">Open candidate dashboard</a></p>
      `
    ),
  });
}
