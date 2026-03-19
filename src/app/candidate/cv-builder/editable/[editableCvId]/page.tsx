import { notFound, redirect } from "next/navigation";
import { EditableCVEditor } from "@/features/cv-import/components/EditableCVEditor";
import { getEditableCVDetailForUser } from "@/lib/editable-cvs";
import { createClient } from "@/utils/supabase/server";

interface EditableCVPageProps {
  params: Promise<{
    editableCvId: string;
  }>;
}

export default async function EditableCVPage({ params }: EditableCVPageProps) {
  const { editableCvId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const detail = await getEditableCVDetailForUser(user.id, editableCvId);
  if (!detail) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1560px] px-6 py-10 lg:px-10">
        <EditableCVEditor initialData={detail} />
      </div>
    </main>
  );
}
