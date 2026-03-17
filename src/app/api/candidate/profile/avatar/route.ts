import { NextResponse } from "next/server";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (profile?.role && profile.role !== "candidate") {
      return NextResponse.json(
        { error: "Chỉ ứng viên mới có thể cập nhật ảnh đại diện." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Vui lòng chọn một ảnh hợp lệ." }, { status: 400 });
    }

    const result = await uploadImageToCloudinary(file, `talentflow/candidates/${user.id}/avatar`);
    return NextResponse.json({ avatarUrl: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải ảnh đại diện lên.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
