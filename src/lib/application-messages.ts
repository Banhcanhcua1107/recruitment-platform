export type ApplicationCvSource = "profile" | "uploaded" | "builder";

const DIRECT_MESSAGE_MAP = new Map<string, string>([
  ["Unauthorized", "Vui lòng đăng nhập tài khoản ứng viên để tiếp tục."],
  ["Only candidates can submit applications.", "Chỉ tài khoản ứng viên mới có thể ứng tuyển."],
  ["Full name is required.", "Vui lòng nhập họ và tên."],
  [
    "Please enter at least email or phone number",
    "Vui lòng nhập email và số điện thoại để nhà tuyển dụng có thể liên hệ.",
  ],
  ["Introduction is required", "Vui lòng giới thiệu ngắn gọn về bản thân."],
  ["Please upload or select a CV", "Vui lòng chọn CV có sẵn hoặc tải lên CV mới."],
  [
    "Selected CV file is no longer available. Please upload a new CV.",
    "CV bạn đã chọn không còn tồn tại trên hệ thống. Vui lòng tải lên CV mới.",
  ],
  ["Only PDF, DOC, or DOCX files are supported.", "Chỉ hỗ trợ tệp PDF, DOC hoặc DOCX."],
  ["CV exceeds the 10MB upload limit.", "CV vượt quá dung lượng 10MB cho phép."],
  [
    "Recruiter email is required before applications can be submitted.",
    "Tin tuyển dụng này chưa được cấu hình email nhận hồ sơ.",
  ],
  ["Unable to submit application.", "Không thể gửi hồ sơ ứng tuyển lúc này."],
  ["Unable to load candidate profile.", "Không thể tải thông tin hồ sơ ứng viên."],
  ["Unable to load saved CV options.", "Không thể tải danh sách CV đã lưu."],
  ["Unable to load application form.", "Không thể tải biểu mẫu ứng tuyển."],
  ["Failed to send application emails.", "Không thể gửi email xác nhận hồ sơ."],
  ["Khong tim thay tin tuyen dung.", "Không tìm thấy tin tuyển dụng."],
  ["Tin tuyen dung nay hien khong nhan ho so.", "Tin tuyển dụng này hiện không nhận hồ sơ."],
  ["Khong the doc CV da luu.", "Không thể đọc CV đã lưu."],
  ["Khong tim thay CV Builder da chon.", "Không tìm thấy CV đã tạo được chọn."],
  ["Khong tim thay don ung tuyen.", "Không tìm thấy đơn ứng tuyển."],
  ["Khong the tai danh sach CV.", "Không thể tải danh sách CV đã lưu."],
  ["Khong the tai ho so ung vien.", "Không thể tải thông tin hồ sơ ứng viên."],
]);

export function localizeApplicationMessage(message?: string | null) {
  const rawMessage = String(message ?? "").trim();

  if (!rawMessage) {
    return "Có lỗi xảy ra, vui lòng thử lại.";
  }

  if (
    (rawMessage.startsWith("{") && rawMessage.endsWith("}")) ||
    (rawMessage.startsWith("[") && rawMessage.endsWith("]"))
  ) {
    return "Không thể gửi hồ sơ ứng tuyển lúc này. Vui lòng thử lại hoặc tải lên một CV khác.";
  }

  const directMatch = DIRECT_MESSAGE_MAP.get(rawMessage);
  if (directMatch) {
    return directMatch;
  }

  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("unauthorized")) {
    return "Vui lòng đăng nhập tài khoản ứng viên để tiếp tục.";
  }

  if (normalized.includes("only candidates")) {
    return "Chỉ tài khoản ứng viên mới có thể ứng tuyển.";
  }

  if (normalized.includes("full name")) {
    return "Vui lòng nhập họ và tên.";
  }

  if (normalized.includes("email or phone")) {
    return "Vui lòng nhập email và số điện thoại để nhà tuyển dụng có thể liên hệ.";
  }

  if (normalized.includes("introduction")) {
    return "Vui lòng giới thiệu ngắn gọn về bản thân.";
  }

  if (normalized.includes("upload or select a cv")) {
    return "Vui lòng chọn CV có sẵn hoặc tải lên CV mới.";
  }

  if (
    normalized.includes("selected cv file is no longer available") ||
    normalized.includes("object not found")
  ) {
    return "CV bạn đã chọn không còn tồn tại trên hệ thống. Vui lòng tải lên CV mới.";
  }

  if (normalized.includes("pdf, doc, or docx")) {
    return "Chỉ hỗ trợ tệp PDF, DOC hoặc DOCX.";
  }

  if (normalized.includes("10mb")) {
    return "CV vượt quá dung lượng 10MB cho phép.";
  }

  if (normalized.includes("recruiter email")) {
    return "Tin tuyển dụng này chưa được cấu hình email nhận hồ sơ.";
  }

  if (normalized.includes("load candidate profile")) {
    return "Không thể tải thông tin hồ sơ ứng viên.";
  }

  if (normalized.includes("saved cv options")) {
    return "Không thể tải danh sách CV đã lưu.";
  }

  if (normalized.includes("application form")) {
    return "Không thể tải biểu mẫu ứng tuyển.";
  }

  if (normalized.includes("submit application")) {
    return "Không thể gửi hồ sơ ứng tuyển lúc này.";
  }

  if (normalized.includes("send application emails")) {
    return "Không thể gửi email xác nhận hồ sơ.";
  }

  return rawMessage;
}

export function getApplicationCvSourceLabel(source: ApplicationCvSource) {
  switch (source) {
    case "profile":
      return "CV trong hồ sơ";
    case "builder":
      return "CV Builder";
    case "uploaded":
    default:
      return "CV đã lưu";
  }
}

export function getApplicationCvSourceDescription(source: ApplicationCvSource) {
  switch (source) {
    case "profile":
      return "Lấy từ hồ sơ ứng viên đã lưu trên hệ thống.";
    case "builder":
      return "Tạo từ công cụ CV Builder trong tài khoản của bạn.";
    case "uploaded":
    default:
      return "CV đã từng tải lên cho các lần ứng tuyển trước đó.";
  }
}
