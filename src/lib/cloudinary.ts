import crypto from "node:crypto";

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "",
  };
}

export async function uploadImageToCloudinary(
  file: File,
  folder: string
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret, uploadPreset } = getCloudinaryConfig();

  if (!cloudName) {
    throw new Error("Thiếu CLOUDINARY_CLOUD_NAME trong biến môi trường.");
  }

  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("Vui lòng chọn một ảnh hợp lệ.");
  }

  const cloudinaryForm = new FormData();
  cloudinaryForm.append("file", file);
  cloudinaryForm.append("folder", folder);

  if (uploadPreset) {
    cloudinaryForm.append("upload_preset", uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("timestamp", String(timestamp));
    cloudinaryForm.append("signature", signature);
  } else {
    throw new Error(
      "Thiếu cấu hình Cloudinary. Cần CLOUDINARY_UPLOAD_PRESET hoặc CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET."
    );
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: cloudinaryForm,
  });

  const result = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.secure_url || !result.public_id) {
    throw new Error(result.error?.message || "Tải ảnh lên Cloudinary thất bại.");
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
