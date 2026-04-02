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

function buildCandidateEmailHtml(input: {
  candidateName: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterPhone: string;
  companyName: string;
  hiringPosition: string;
  message: string;
  sentAt: string;
}) {
  return `
    <div style="margin:0;padding:28px;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbe4f0;border-radius:18px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">TalentFlow</p>
          <h1 style="margin:0;font-size:26px;line-height:1.25;">Bạn có lời mời kết nối từ nhà tuyển dụng</h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.7;opacity:0.92;">${escapeHtml(input.companyName)} đang quan tâm hồ sơ của bạn cho vị trí ${escapeHtml(input.hiringPosition)}.</p>
        </div>

        <div style="padding:24px 28px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.8;">Chào ${escapeHtml(input.candidateName || "bạn")},</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#334155;">
            Nhà tuyển dụng đã gửi thông tin liên hệ đến bạn qua TalentFlow. Bạn có thể phản hồi trực tiếp nếu thấy phù hợp.
          </p>

          <div style="border:1px solid #dbe4f0;border-radius:14px;background:#f8fbff;padding:16px;margin-bottom:16px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Thông tin nhà tuyển dụng</p>
            <p style="margin:0 0 8px;"><strong>Người liên hệ:</strong> ${escapeHtml(input.recruiterName)}</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(input.recruiterEmail)}</p>
            <p style="margin:0 0 8px;"><strong>Số điện thoại:</strong> ${escapeHtml(input.recruiterPhone)}</p>
            <p style="margin:0 0 8px;"><strong>Công ty:</strong> ${escapeHtml(input.companyName)}</p>
            <p style="margin:0;"><strong>Vị trí cần tuyển:</strong> ${escapeHtml(input.hiringPosition)}</p>
          </div>

          <div style="border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;padding:16px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Nội dung từ nhà tuyển dụng</p>
            <p style="margin:0;white-space:pre-wrap;line-height:1.8;color:#334155;">${escapeHtml(input.message)}</p>
          </div>

          <p style="margin:16px 0 0;font-size:12px;color:#64748b;">Gửi lúc ${escapeHtml(input.sentAt)}</p>
        </div>
      </div>
    </div>
  `;
}

function buildCandidateEmailText(input: {
  candidateName: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterPhone: string;
  companyName: string;
  hiringPosition: string;
  message: string;
  sentAt: string;
}) {
  return [
    `[TalentFlow] ${input.companyName} muốn kết nối với bạn`,
    "",
    `Chào ${input.candidateName || "bạn"},`,
    "",
    `${input.companyName} đang quan tâm hồ sơ của bạn cho vị trí ${input.hiringPosition}.`,
    "",
    "Thông tin nhà tuyển dụng:",
    `- Người liên hệ: ${input.recruiterName}`,
    `- Email: ${input.recruiterEmail}`,
    `- Số điện thoại: ${input.recruiterPhone}`,
    `- Công ty: ${input.companyName}`,
    `- Vị trí cần tuyển: ${input.hiringPosition}`,
    "",
    "Nội dung:",
    input.message,
    "",
    `Gửi lúc: ${input.sentAt}`,
  ].join("\n");
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

  await sendEmail({
    to: candidateEmail,
    subject: `[TalentFlow] ${companyName} muốn kết nối với bạn`,
    text: buildCandidateEmailText({
      candidateName,
      recruiterName,
      recruiterEmail,
      recruiterPhone,
      companyName,
      hiringPosition,
      message,
      sentAt,
    }),
    html: buildCandidateEmailHtml({
      candidateName,
      recruiterName,
      recruiterEmail,
      recruiterPhone,
      companyName,
      hiringPosition,
      message,
      sentAt,
    }),
  });

  return {
    candidateEmailSent: true,
    candidateHasEmail: true,
    candidateName,
  };
}
