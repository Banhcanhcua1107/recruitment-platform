import "server-only";

import { getRecruiterCandidateProfile } from "@/lib/candidate-profiles";
import { sendEmail } from "@/lib/email/mail-service";
import { createSystemNotification } from "@/lib/notifications";
import { createClient } from "@/utils/supabase/server";

export interface RecruiterCandidateContactInput {
  candidateId: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterPhone: string;
  companyName: string;
  hiringPosition: string;
  message: string;
}

export interface RecruiterCandidateContactResult {
  candidateEmailSent: boolean;
  candidateHasEmail: boolean;
  candidateName: string;
}

interface RecruiterCandidateContactEmailTemplateInput {
  candidateName: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterPhone: string;
  companyName: string;
  hiringPosition: string;
  message: string;
  sentAt: string;
}

interface ComposedContactEmail {
  subject: string;
  html: string;
  text: string;
}

const FALLBACK_CANDIDATE_NAME = "Ứng viên";
const FALLBACK_COMPANY_NAME = "Nhà tuyển dụng";
const FALLBACK_POSITION = "Vị trí chưa cập nhật";
const FALLBACK_MESSAGE = "Nhà tuyển dụng muốn kết nối với bạn qua TalentFlow.";

function normalize(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateTime(value: Date) {
  return value.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildRecruiterCandidateContactEmail(
  input: RecruiterCandidateContactEmailTemplateInput,
): ComposedContactEmail {
  const candidateName = normalize(input.candidateName) || FALLBACK_CANDIDATE_NAME;
  const recruiterName = normalize(input.recruiterName) || FALLBACK_COMPANY_NAME;
  const recruiterEmail = normalize(input.recruiterEmail) || "hr@example.com";
  const recruiterPhone = normalize(input.recruiterPhone) || "Chưa cập nhật";
  const companyName = normalize(input.companyName) || FALLBACK_COMPANY_NAME;
  const hiringPosition = normalize(input.hiringPosition) || FALLBACK_POSITION;
  const message = normalize(input.message) || FALLBACK_MESSAGE;
  const sentAt = normalize(input.sentAt) || "Vừa gửi";
  const mailtoLink = `mailto:${encodeURIComponent(recruiterEmail)}`;

  const html = `
    <div style="margin:0;padding:28px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:18px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">TalentFlow</p>
          <h1 style="margin:0;font-size:26px;line-height:1.25;">Nhà tuyển dụng muốn kết nối với bạn</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.7;opacity:0.92;">Bạn nhận email này vì nhà tuyển dụng vừa gửi lời mời liên hệ liên quan đến hồ sơ của bạn.</p>
        </div>

        <div style="padding:24px 28px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.8;">Chào ${escapeHtml(candidateName)},</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#334155;">
            Dưới đây là thông tin chi tiết từ nhà tuyển dụng để bạn dễ dàng theo dõi và phản hồi khi phù hợp.
          </p>

          <div style="border:1px solid #dbe4f0;border-radius:14px;background:#f8fbff;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Thông tin liên hệ tuyển dụng</p>
            <p style="margin:0 0 8px;"><strong>Vị trí cần tuyển:</strong> ${escapeHtml(hiringPosition)}</p>
            <p style="margin:0 0 8px;"><strong>Trạng thái liên hệ:</strong> Lời mời kết nối mới</p>
            <p style="margin:0 0 8px;"><strong>Công ty tuyển dụng:</strong> ${escapeHtml(companyName)}</p>
            <p style="margin:0 0 8px;"><strong>Người liên hệ:</strong> ${escapeHtml(recruiterName)}</p>
            <p style="margin:0 0 8px;"><strong>Email liên hệ:</strong> ${escapeHtml(recruiterEmail)}</p>
            <p style="margin:0;"><strong>Số điện thoại:</strong> ${escapeHtml(recruiterPhone)}</p>
          </div>

          <div style="border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Nội dung từ nhà tuyển dụng</p>
            <p style="margin:0;white-space:pre-wrap;line-height:1.8;color:#334155;">${escapeHtml(message)}</p>
          </div>

          <p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#334155;">
            Bước tiếp theo: bạn có thể phản hồi trực tiếp cho nhà tuyển dụng qua email bên dưới.
          </p>
          <p style="margin:0 0 12px;">
            <a href="${mailtoLink}" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;">Phản hồi nhà tuyển dụng</a>
          </p>
          <p style="margin:0 0 12px;font-size:12px;color:#64748b;">Thời gian gửi: ${escapeHtml(sentAt)}</p>
          <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">Trân trọng,<br/>TalentFlow</p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `[TalentFlow] Lời mời kết nối từ ${companyName} cho vị trí ${hiringPosition}`,
    "",
    `Chào ${candidateName},`,
    "",
    "Bạn vừa nhận một lời mời kết nối từ nhà tuyển dụng trên TalentFlow.",
    "",
    "Thông tin liên hệ tuyển dụng:",
    `- Vị trí cần tuyển: ${hiringPosition}`,
    "- Trạng thái liên hệ: Lời mời kết nối mới",
    `- Công ty tuyển dụng: ${companyName}`,
    `- Người liên hệ: ${recruiterName}`,
    `- Email liên hệ: ${recruiterEmail}`,
    `- Số điện thoại: ${recruiterPhone}`,
    "",
    "Nội dung từ nhà tuyển dụng:",
    message,
    "",
    "Bước tiếp theo:",
    `- Phản hồi nhà tuyển dụng qua email: ${recruiterEmail}`,
    `- Thời gian gửi: ${sentAt}`,
    "",
    "Trân trọng,",
    "TalentFlow",
  ].join("\n");

  return {
    subject: `[TalentFlow] Lời mời kết nối từ ${companyName} cho vị trí ${hiringPosition}`,
    html,
    text,
  };
}

async function assertRecruiterRole(userId: string) {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (profile?.role && profile.role !== "hr") {
    throw new Error("Chỉ nhà tuyển dụng mới có thể gửi lời mời liên hệ.");
  }
}

export async function sendRecruiterCandidateContact(
  input: RecruiterCandidateContactInput
): Promise<RecruiterCandidateContactResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const candidateId = normalize(input.candidateId);
  const recruiterName = normalize(input.recruiterName);
  const recruiterEmail = normalize(input.recruiterEmail).toLowerCase();
  const recruiterPhone = normalize(input.recruiterPhone);
  const companyName = normalize(input.companyName);
  const hiringPosition = normalize(input.hiringPosition);
  const message = normalize(input.message);

  if (!candidateId) {
    throw new Error("Không tìm thấy ứng viên cần liên hệ.");
  }

  if (!recruiterName) {
    throw new Error("Vui lòng nhập tên người liên hệ.");
  }

  if (!recruiterEmail || !isValidEmail(recruiterEmail)) {
    throw new Error("Vui lòng nhập email liên hệ hợp lệ.");
  }

  if (!recruiterPhone) {
    throw new Error("Vui lòng nhập số điện thoại liên hệ.");
  }

  if (!companyName) {
    throw new Error("Vui lòng nhập tên công ty.");
  }

  if (!hiringPosition) {
    throw new Error("Vui lòng nhập vị trí cần tuyển.");
  }

  if (!message || message.length < 20) {
    throw new Error("Vui lòng nhập nội dung liên hệ tối thiểu 20 ký tự.");
  }

  await assertRecruiterRole(user.id);
  const candidate = await getRecruiterCandidateProfile(candidateId);
  const candidateName = normalize(candidate.fullName) || "Ứng viên";
  const candidateEmail = normalize(candidate.email);
  const sentAt = formatDateTime(new Date());

  await createSystemNotification({
    recipientId: candidate.candidateId,
    actorId: user.id,
    type: "recruiter_contact",
    title: `${companyName} muốn kết nối với bạn`,
    description: `${recruiterName} đã gửi lời mời liên hệ cho vị trí ${hiringPosition}.`,
    href: "/candidate/overview",
    metadata: {
      recruiterName,
      recruiterEmail,
      recruiterPhone,
      companyName,
      hiringPosition,
      message,
      sentAt,
    },
  });

  if (!candidateEmail) {
    return {
      candidateEmailSent: false,
      candidateHasEmail: false,
      candidateName,
    };
  }

  const composedEmail = buildRecruiterCandidateContactEmail({
    candidateName,
    recruiterName,
    recruiterEmail,
    recruiterPhone,
    companyName,
    hiringPosition,
    message,
    sentAt,
  });

  try {
    await sendEmail({
      to: candidateEmail,
      subject: composedEmail.subject,
      text: composedEmail.text,
      html: composedEmail.html,
    });
  } catch (emailError) {
    const message =
      emailError instanceof Error ? emailError.message : String(emailError ?? "Unknown error");

    console.warn("Unable to deliver recruiter contact email.", {
      candidateId,
      candidateEmail,
      recruiterEmail,
      error: message,
    });

    return {
      candidateEmailSent: false,
      candidateHasEmail: true,
      candidateName,
    };
  }

  return {
    candidateEmailSent: true,
    candidateHasEmail: true,
    candidateName,
  };
}
