export const CV_AVATAR_ACCEPT_ATTR = "image/jpeg,image/jpg,image/png,image/webp";

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const CV_AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type AvatarUploadStatus = "idle" | "selecting" | "uploading" | "success" | "error";

export function validateAvatarUploadFile(file: File): string | null {
  if (!(file instanceof File) || file.size <= 0) {
    return "Vui lòng chọn một ảnh hợp lệ.";
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type.toLowerCase())) {
    return "Chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.";
  }

  if (file.size > CV_AVATAR_MAX_FILE_SIZE_BYTES) {
    return "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.";
  }

  return null;
}

export async function uploadCvAvatarImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "talentflow/cv-builder/avatar");

  const response = await fetch("/api/uploads/image", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Không thể tải ảnh lên Cloudinary.");
  }

  return payload.url;
}
