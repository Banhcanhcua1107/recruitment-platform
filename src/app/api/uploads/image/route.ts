import { NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "talentflow/uploads");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng chọn một ảnh hợp lệ." }, { status: 400 });
    }

    const result = await uploadImageToCloudinary(file, folder);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải ảnh lên.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
