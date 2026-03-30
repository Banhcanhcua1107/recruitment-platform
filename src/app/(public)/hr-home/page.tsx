import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HrHomePage from "@/components/hr-home/HrHomePage";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Trang chủ nhà tuyển dụng | TalentFlow",
  description: "Tìm kiếm ứng viên public theo kỹ năng, kinh nghiệm và mức độ sẵn sàng làm việc.",
};

export default async function RecruiterHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "hr") {
    redirect("/");
  }

  return <HrHomePage />;
}
