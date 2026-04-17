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

const FALLBACK_JOB_TITLE = "Chuyên viên Tuyển dụng";
const FALLBACK_COMPANY_NAME = "Nhà tuyển dụng";
const FALLBACK_NOTIFICATION_TITLE = "Thông báo hệ thống tuyển dụng";
const FALLBACK_NOTIFICATION_MESSAGE =
  "Hệ thống vừa ghi nhận một cập nhật mới trong quy trình tuyển dụng.";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildShell(title: string, body: string) {
  const safeTitle = escapeHtml(title);

  return `
    <div style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e2ec;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:linear-gradient(120deg,#134e4a,#0ea5a4);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.9;">TalentFlow Email Testing</p>
          <h2 style="margin:0;font-size:24px;line-height:1.25;">${safeTitle}</h2>
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
  const title = "Mã xác thực OTP";
  const html = buildShell(
    title,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Chào bạn,</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Bạn nhận email này vì hệ thống cần xác thực thao tác đăng nhập hoặc bảo mật tài khoản.</p>
     <p style="margin:0 0 16px;padding:14px 16px;border-radius:12px;background:#ecfeff;border:1px solid #99f6e4;font-size:30px;font-weight:700;letter-spacing:0.2em;text-align:center;">${escapeHtml(code)}</p>
     <p style="margin:0 0 10px;color:#334155;font-size:14px;line-height:1.7;">Mã OTP có hiệu lực trong thời gian ngắn. Vui lòng không chia sẻ mã cho người khác.</p>
     <p style="margin:0;color:#475569;font-size:13px;">Email mô phỏng được tạo cho luồng test: ${escapeHtml(input.template)}.</p>`,
  );

  return {
    subject: `[TalentFlow] Mã xác thực OTP: ${code}`,
    html,
    text: [
      `[TalentFlow] Mã xác thực OTP: ${code}`,
      "",
      "Chào bạn,",
      "Hệ thống yêu cầu xác thực thao tác bảo mật.",
      `Mã OTP của bạn: ${code}`,
      "Vui lòng không chia sẻ mã này cho người khác.",
      `Người nhận (test): ${input.recipientEmail}`,
    ].join("\n"),
  };
}

function buildVerificationTemplate(input: TemplateInput): TemplateOutput {
  const link = asString(input.data?.verificationLink, "http://localhost:3000/verify?token=test-token");

  return {
    subject: "[TalentFlow] Xác minh địa chỉ email",
    html: buildShell(
      "Xác minh địa chỉ email",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Chào bạn,</p>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Để hoàn tất đăng ký tài khoản, vui lòng xác minh địa chỉ email bằng nút bên dưới.</p>
       <p style="margin:0 0 16px;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0ea5a4;color:#ffffff;text-decoration:none;font-weight:700;">Xác minh email</a></p>
       <p style="margin:0;font-size:13px;color:#64748b;">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>`,
    ),
    text: [
      "[TalentFlow] Xác minh địa chỉ email",
      "",
      "Chào bạn,",
      "Vui lòng xác minh địa chỉ email để hoàn tất đăng ký tài khoản.",
      `Link xác minh: ${link}`,
      "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.",
    ].join("\n"),
  };
}

function buildPasswordResetTemplate(input: TemplateInput): TemplateOutput {
  const link = asString(input.data?.resetLink, "http://localhost:3000/reset-password?token=test-token");

  return {
    subject: "[TalentFlow] Yêu cầu đặt lại mật khẩu",
    html: buildShell(
      "Đặt lại mật khẩu",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Chào bạn,</p>
       <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hệ thống vừa nhận yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
       <p style="margin:0 0 16px;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Đặt lại mật khẩu</a></p>
       <p style="margin:0;font-size:13px;color:#64748b;">Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>`,
    ),
    text: [
      "[TalentFlow] Yêu cầu đặt lại mật khẩu",
      "",
      "Chào bạn,",
      "Hệ thống vừa nhận yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
      `Link đặt lại mật khẩu: ${link}`,
      "Nếu bạn không yêu cầu thay đổi mật khẩu, hãy bỏ qua email này.",
    ].join("\n"),
  };
}

function buildApplyJobTemplate(input: TemplateInput): TemplateOutput {
  const jobTitle = asString(input.data?.jobTitle, FALLBACK_JOB_TITLE);
  const companyName = asString(input.data?.companyName, FALLBACK_COMPANY_NAME);
  const actor = input.senderEmail || "candidate@gmail.test";
  const reviewLink = asString(
    input.data?.reviewLink,
    "http://localhost:3000/hr/candidates?view=pipeline",
  );

  return {
    subject: `[TalentFlow] Mô phỏng đơn ứng tuyển: ${jobTitle}`,
    html: buildShell(
      "Mô phỏng: Có đơn ứng tuyển mới",
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;">Email này được tạo từ chức năng mô phỏng để kiểm tra luồng thông báo tuyển dụng.</p>
       <div style="border:1px solid #dbe4f0;border-radius:14px;background:#f8fbff;padding:16px;margin-bottom:14px;">
         <p style="margin:0 0 8px;"><strong>Vị trí ứng tuyển:</strong> ${escapeHtml(jobTitle)}</p>
         <p style="margin:0 0 8px;"><strong>Trạng thái hiện tại:</strong> Đã tiếp nhận (mô phỏng)</p>
         <p style="margin:0 0 8px;"><strong>Công ty tuyển dụng:</strong> ${escapeHtml(companyName)}</p>
         <p style="margin:0 0 8px;"><strong>Ứng viên gửi hồ sơ:</strong> ${escapeHtml(actor)}</p>
         <p style="margin:0;"><strong>Hộp thư nhận:</strong> ${escapeHtml(input.recipientEmail)}</p>
       </div>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#334155;">Bước tiếp theo: mở trang xử lý hồ sơ để kiểm tra hành vi CTA và quyền truy cập.</p>
       <p style="margin:0;"><a href="${escapeHtml(reviewLink)}" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Mở trang xử lý ứng viên</a></p>`,
    ),
    text: [
      `[TalentFlow] Mô phỏng đơn ứng tuyển: ${jobTitle}`,
      "",
      "Email này được tạo để kiểm tra luồng apply-job.",
      "",
      "Thông tin mô phỏng:",
      `- Vị trí ứng tuyển: ${jobTitle}`,
      "- Trạng thái hiện tại: Đã tiếp nhận (mô phỏng)",
      `- Công ty tuyển dụng: ${companyName}`,
      `- Ứng viên gửi hồ sơ: ${actor}`,
      `- Hộp thư nhận: ${input.recipientEmail}`,
      "",
      "Bước tiếp theo:",
      `- Mở trang xử lý ứng viên: ${reviewLink}`,
    ].join("\n"),
  };
}

function buildNotificationTemplate(input: TemplateInput): TemplateOutput {
  const title = asString(input.data?.notificationTitle, FALLBACK_NOTIFICATION_TITLE);
  const message = asString(
    input.data?.notificationMessage,
    FALLBACK_NOTIFICATION_MESSAGE,
  );
  const ctaLink = asString(input.data?.ctaLink, "http://localhost:3000/candidate/applications");

  return {
    subject: `[TalentFlow] Thông báo hệ thống: ${title}`,
    html: buildShell(
      title,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;">${escapeHtml(message)}</p>
       <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#334155;">Bạn có thể mở nhanh trang quản lý để kiểm tra dữ liệu liên quan.</p>
       <p style="margin:0 0 12px;"><a href="${escapeHtml(ctaLink)}" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Mở trang liên quan</a></p>
       <p style="margin:0;font-size:13px;color:#64748b;">Email mô phỏng từ công cụ Email Testing Console.</p>`,
    ),
    text: [
      `[TalentFlow] Thông báo hệ thống: ${title}`,
      "",
      message,
      "",
      `Mở trang liên quan: ${ctaLink}`,
      "Email mô phỏng từ Email Testing Console.",
    ].join("\n"),
  };
}

function buildCustomTemplate(input: TemplateInput): TemplateOutput {
  const subject = input.customSubject?.trim() || "[TalentFlow] Email kiểm thử tùy chỉnh";
  const text =
    input.customText?.trim() ||
    "Đây là email kiểm thử tùy chỉnh từ TalentFlow. Vui lòng kiểm tra bố cục và dữ liệu hiển thị.";
  const html =
    input.customHtml?.trim() ||
    buildShell(
      subject,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;">${escapeHtml(text)}</p>
       <p style="margin:0;font-size:13px;color:#64748b;">Email này được tạo từ mẫu tùy chỉnh trong môi trường kiểm thử.</p>`,
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
