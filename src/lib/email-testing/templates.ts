import type { EmailTemplateKind } from "@/types/email-testing";

interface TemplateInput {
  template: EmailTemplateKind;
  recipientEmail: string;
  senderEmail?: string;
  customSubject?: string;
  customText?: string;
  customHtml?: string;
  data?: Record<string, string | number | boolean | undefined>;
}

interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildShell(title: string, body: string) {
  return `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:linear-gradient(120deg,#134e4a,#0ea5a4);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.9;">Email Test Harness</p>
          <h2 style="margin:0;font-size:24px;line-height:1.25;">${escapeHtml(title)}</h2>
        </div>
        <div style="padding:24px;">${body}</div>
      </div>
    </div>
  `;
}

function asString(value: string | number | boolean | undefined, fallback: string) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
}

function buildOtpTemplate(input: TemplateInput): TemplateOutput {
  const code = asString(input.data?.otpCode, String(Math.floor(100000 + Math.random() * 900000)));
  const title = "Your OTP Code";
  const html = buildShell(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Use this one-time code to continue:</p>
     <p style="margin:0 0 16px;padding:14px 16px;border-radius:12px;background:#ecfeff;border:1px solid #99f6e4;font-size:30px;font-weight:700;letter-spacing:0.2em;text-align:center;">${escapeHtml(code)}</p>
     <p style="margin:0;color:#475569;font-size:13px;">This OTP is generated in ${escapeHtml(input.template)} test flow for ${escapeHtml(input.recipientEmail)}.</p>`,
  );

  return {
    subject: `[OTP] ${code}`,
    html,
    text: `Your OTP code is ${code}. Recipient: ${input.recipientEmail}`,
  };
}

function buildVerificationTemplate(input: TemplateInput): TemplateOutput {
  const link = asString(input.data?.verificationLink, "http://localhost:3000/verify?token=test-token");

  return {
    subject: "Verify your email address",
    html: buildShell(
      "Verify Email",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Please confirm your account by clicking the button below.</p>
       <p style="margin:0 0 16px;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0ea5a4;color:#ffffff;text-decoration:none;font-weight:700;">Verify account</a></p>
       <p style="margin:0;font-size:13px;color:#64748b;">Sent to ${escapeHtml(input.recipientEmail)}.</p>`,
    ),
    text: `Verify your account: ${link}`,
  };
}

function buildPasswordResetTemplate(input: TemplateInput): TemplateOutput {
  const link = asString(input.data?.resetLink, "http://localhost:3000/reset-password?token=test-token");

  return {
    subject: "Password reset requested",
    html: buildShell(
      "Reset Password",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">A password reset request was received for your account.</p>
       <p style="margin:0 0 16px;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Reset password</a></p>
       <p style="margin:0;font-size:13px;color:#64748b;">If you did not request this, simply ignore the email.</p>`,
    ),
    text: `Reset your password here: ${link}`,
  };
}

function buildApplyJobTemplate(input: TemplateInput): TemplateOutput {
  const jobTitle = asString(input.data?.jobTitle, "Frontend Engineer");
  const companyName = asString(input.data?.companyName, "TalentFlow");
  const actor = input.senderEmail || "candidate@gmail.test";

  return {
    subject: `[Application] ${jobTitle}`,
    html: buildShell(
      "New Job Application",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;">A candidate has applied for <strong>${escapeHtml(jobTitle)}</strong>.</p>
       <ul style="padding-left:18px;margin:0 0 14px;color:#334155;">
         <li>Company: ${escapeHtml(companyName)}</li>
         <li>Applicant: ${escapeHtml(actor)}</li>
         <li>Recipient inbox: ${escapeHtml(input.recipientEmail)}</li>
       </ul>
       <p style="margin:0;font-size:13px;color:#64748b;">This message was generated from the apply-job simulation button.</p>`,
    ),
    text: `New application for ${jobTitle} at ${companyName}. Applicant: ${actor}.`,
  };
}

function buildNotificationTemplate(input: TemplateInput): TemplateOutput {
  const title = asString(input.data?.notificationTitle, "Recruitment Notification");
  const message = asString(
    input.data?.notificationMessage,
    "Your profile has a new event in the recruitment pipeline.",
  );

  return {
    subject: `[Notification] ${title}`,
    html: buildShell(
      title,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;">${escapeHtml(message)}</p>
       <p style="margin:0;font-size:13px;color:#64748b;">Generated via test notification simulation.</p>`,
    ),
    text: `${title}\n\n${message}`,
  };
}

function buildCustomTemplate(input: TemplateInput): TemplateOutput {
  const subject = input.customSubject?.trim() || "Custom test email";
  const text = input.customText?.trim() || "This is a custom test email.";
  const html =
    input.customHtml?.trim() ||
    buildShell(
      subject,
      `<p style="margin:0;font-size:15px;line-height:1.7;">${escapeHtml(text)}</p>`,
    );

  return {
    subject,
    text,
    html,
  };
}

export function buildEmailTemplate(input: TemplateInput): TemplateOutput {
  switch (input.template) {
    case "otp":
      return buildOtpTemplate(input);
    case "verification":
      return buildVerificationTemplate(input);
    case "password-reset":
      return buildPasswordResetTemplate(input);
    case "apply-job":
      return buildApplyJobTemplate(input);
    case "notification":
      return buildNotificationTemplate(input);
    case "custom":
      return buildCustomTemplate(input);
    default:
      return buildCustomTemplate(input);
  }
}
