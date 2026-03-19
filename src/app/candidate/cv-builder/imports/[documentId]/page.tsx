import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

interface ImportReviewPageProps {
  params: Promise<{
    documentId: string;
  }>;
}

export default async function ImportReviewPage({ params }: ImportReviewPageProps) {
  const { documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(`/candidate/cv-builder?importReview=${documentId}`);
}
