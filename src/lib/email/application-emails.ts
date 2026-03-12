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

async function getCvAttachmentFromStorage(filePath: string): Promise<Attachment> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("cv_uploads").download(filePath);

  if (error || !data) {
    throw new Error(error?.message || "Không thể tải CV từ Supabase Storage để đính kèm email.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    filename: "resume.pdf",
    content: buffer,
    contentType: getContentTypeFromPath(filePath),
  };
}

export async function sendApplicationSubmittedEmails(
  input: ApplicationSubmittedEmailInput
) {
  const safeCandidateName = input.candidateName || input.candidateEmail;
  const attachment = await getCvAttachmentFromStorage(input.cvFilePath);
  const safeCoverLetter = (input.coverLetter || "Ứng viên chưa cung cấp thư giới thiệu.").trim();
  const safePhone = (input.candidatePhone || "Chưa cung cấp").trim();

  await Promise.all([
    sendEmail({
      to: input.hrEmail,
      subject: `New Candidate Application - ${input.jobTitle}`,
      text: [
        "Hello HR,",
        "",
        "A new candidate has applied for your job posting.",
        "",
        `Candidate Name: ${safeCandidateName}`,
        `Email: ${input.candidateEmail}`,
        `Phone: ${safePhone}`,
        "",
        "Position Applied:",
        input.jobTitle,
        "",
        "Cover Letter:",
        safeCoverLetter,
        "",
        "The candidate resume is attached.",
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p>Hello HR,</p>
        <p>A new candidate has applied for your job posting.</p>
        <ul>
          <li><strong>Candidate Name:</strong> ${safeCandidateName}</li>
          <li><strong>Email:</strong> ${input.candidateEmail}</li>
          <li><strong>Phone:</strong> ${safePhone}</li>
        </ul>
        <p><strong>Position Applied:</strong><br/>${input.jobTitle}</p>
        <p><strong>Cover Letter:</strong><br/>${safeCoverLetter.replace(/\n/g, "<br/>")}</p>
        <p>The candidate resume is attached.</p>
      `,
      attachments: [attachment],
    }),
    sendEmail({
      to: input.candidateEmail,
      subject: "Your application has been received",
      text: [
        `Hello ${safeCandidateName},`,
        "",
        "Thank you for applying to the position:",
        input.jobTitle,
        "",
        `at ${input.companyName}.`,
        "",
        "Our HR team will review your application and contact you if you are shortlisted.",
        "",
        `Best regards,`,
        input.companyName,
        "",
        `Track your application: ${getBaseUrl()}/candidate/applications`,
      ].join("\n"),
      html: `
        <p>Hello ${safeCandidateName},</p>
        <p>Thank you for applying to the position:</p>
        <p><strong>${input.jobTitle}</strong></p>
        <p>at <strong>${input.companyName}</strong>.</p>
        <p>Our HR team will review your application and contact you if you are shortlisted.</p>
        <p>Best regards,<br/>${input.companyName}</p>
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
