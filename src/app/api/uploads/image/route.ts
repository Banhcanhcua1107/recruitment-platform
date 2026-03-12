import crypto from "node:crypto";
import { NextResponse } from "next/server";

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || "",
  };
}

export async function POST(request: Request) {
  const { cloudName, apiKey, apiSecret, uploadPreset } = getCloudinaryConfig();

  if (!cloudName) {
    return NextResponse.json(
      { error: "Thiếu CLOUDINARY_CLOUD_NAME trong biến môi trường." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "talentflow/uploads");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Không có file ảnh hợp lệ." }, { status: 400 });
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
    return NextResponse.json(
      {
        error:
          "Thiếu cấu hình Cloudinary. Cần CLOUDINARY_UPLOAD_PRESET hoặc CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.",
      },
      { status: 500 }
    );
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: cloudinaryForm,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: result?.error?.message || "Cloudinary upload thất bại." },
      { status: response.status }
    );
  }

  return NextResponse.json({
    url: result.secure_url as string,
    publicId: result.public_id as string,
  });
}
