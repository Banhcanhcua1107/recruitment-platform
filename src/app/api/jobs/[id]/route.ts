import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Fix type signature for Next.js 15
) {
  const { id } = await params;
  const supabase = await createClient();

  // Validate ID (Supabase id is bigint, user passes string number)
  if (!id) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) {
    return NextResponse.json({ message: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
