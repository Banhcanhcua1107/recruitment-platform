import "server-only";

import type { Attachment } from "nodemailer/lib/mailer";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendEmail } from "@/lib/email/mail-service";

interface ApplicationSubmittedEmailInput {
  hrEmail: string;
  candidateEmail: string;
  candidateName: string;
  candidatePhone?: string | null;
  jobTitle: string;
  companyName: string;
  jobLocation?: string | null;
  coverLetter?: string | null;
  cvFilePath: string;
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getCvAttachmentFromStorage(filePath: string): Promise<Attachment> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("cv_uploads").download(filePath);

  if (error || !data) {
    throw new Error(error?.message || "Không thể tải CV từ Supabase Storage để đính kèm email.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const filename = filePath.split("/").pop() || "resume.pdf";
  return {
    filename,
    content: buffer,
    contentType: getContentTypeFromPath(filePath),
  };
}

export async function sendApplicationSubmittedEmails(
  input: ApplicationSubmittedEmailInput
) {
  const safeCandidateName = input.candidateName || input.candidateEmail;
  const attachment = await getCvAttachmentFromStorage(input.cvFilePath);
  const safeCoverLetter = input.coverLetter?.trim() || "";
  const safePhone = (input.candidatePhone || "Chưa cung cấp").trim();
  const safeLocation = (input.jobLocation || "Chưa cập nhật").trim();
  const hasCandidateMessage = safeCoverLetter.length > 0;

  await Promise.all([
    sendEmail({
      to: input.hrEmail,
      subject: `New Job Application - ${input.jobTitle} - ${safeCandidateName}`,
      text: [
        "Dear HR Team,",
        "",
        "A new candidate has submitted an application.",
        "",
        "Candidate Information",
        `- Name: ${safeCandidateName}`,
        `- Email: ${input.candidateEmail}`,
        `- Phone: ${safePhone}`,
        "",
        "Job Information",
        `- Job Title: ${input.jobTitle}`,
        `- Company Name: ${input.companyName}`,
        `- Job Location: ${safeLocation}`,
        "",
        "Candidate Message",
        hasCandidateMessage ? safeCoverLetter : "- Not provided",
        "",
        "The candidate CV is attached to this email.",
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p>Dear HR Team,</p>
        <p>A new candidate has submitted an application.</p>
        <p><strong>Candidate Information</strong></p>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(safeCandidateName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(input.candidateEmail)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(safePhone)}</li>
        </ul>
        <p><strong>Job Information</strong></p>
        <ul>
          <li><strong>Job title:</strong> ${escapeHtml(input.jobTitle)}</li>
          <li><strong>Company name:</strong> ${escapeHtml(input.companyName)}</li>
          <li><strong>Job location:</strong> ${escapeHtml(safeLocation)}</li>
        </ul>
        <p><strong>Candidate message</strong></p>
        <p>${hasCandidateMessage ? escapeHtml(safeCoverLetter).replace(/\n/g, "<br/>") : "Not provided"}</p>
        <p>The candidate CV is attached to this email.</p>
      `,
      attachments: [attachment],
    }),
    sendEmail({
      to: input.candidateEmail,
      subject: `Application Submitted Successfully - ${input.jobTitle}`,
      text: [
        `Dear ${safeCandidateName},`,
        "",
        "Your application has been submitted successfully.",
        "",
        `Job title: ${input.jobTitle}`,
        `Company name: ${input.companyName}`,
        "",
        "The employer will review your CV and application details.",
        "Please wait for further contact from the recruitment team.",
        "",
        "Best regards,",
        input.companyName,
        "",
        `Track your application: ${getBaseUrl()}/candidate/applications`,
      ].join("\n"),
      html: `
        <p>Dear ${escapeHtml(safeCandidateName)},</p>
        <p>Your application has been submitted successfully.</p>
        <p>
          <strong>Job title:</strong> ${escapeHtml(input.jobTitle)}<br/>
          <strong>Company name:</strong> ${escapeHtml(input.companyName)}
        </p>
        <p>The employer will review your CV and application details.</p>
        <p>Please wait for further contact from the recruitment team.</p>
        <p>Best regards,<br/>${escapeHtml(input.companyName)}</p>
        <p><a href="${getBaseUrl()}/candidate/applications">Track your application</a></p>
      `,
    }),
  ]);
}

export async function sendApplicationStatusEmail(
  input: ApplicationStatusEmailInput
) {
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
    html: `
      <p>Chào ${safeCandidateName},</p>
      <p>Đơn ứng tuyển cho vị trí <strong>${input.jobTitle}</strong> tại <strong>${input.companyName}</strong> đã được cập nhật sang trạng thái <strong>${input.statusLabel}</strong>.</p>
      <p>${input.message}</p>
      <p><a href="${getBaseUrl()}/candidate/applications">Theo dõi chi tiết đơn ứng tuyển</a></p>
    `,
  });
}
