import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { renderEditableCVExportBuffer } from "@/lib/editable-cv-export";
import {
  buildEditableCVExportResponse,
  getEditableBackgroundArtifacts,
  getEditableCVDetailForUser,
} from "@/lib/editable-cvs";
import type {
  EditableCVBlockRecord,
  EditableCVVersionRecord,
} from "@/types/cv-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  format: z.literal("pdf"),
  version_id: z.string().uuid().optional(),
});

interface Params {
  params: Promise<{ editableCvId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { editableCvId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = requestSchema.parse(await request.json());

    const detail = await getEditableCVDetailForUser(user.id, editableCvId);
    if (!detail) {
      return NextResponse.json({ error: "Editable CV not found." }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: pagesData, error: pagesError } = await admin
      .from("editable_cv_pages")
      .select("*")
      .eq("editable_cv_id", editableCvId)
      .order("page_number", { ascending: true });

    if (pagesError) {
      throw new Error(pagesError.message);
    }

    const { data: blocksData, error: blocksError } = await admin
      .from("editable_cv_blocks")
      .select("*")
      .eq("editable_cv_id", editableCvId)
      .order("sequence", { ascending: true });

    if (blocksError) {
      throw new Error(blocksError.message);
    }

    let exportBlocks = (blocksData ?? []) as EditableCVBlockRecord[];
    let exportVersionNumber = detail.versions[0]?.version_number ?? 1;

    if (payload.version_id) {
      const { data: versionData, error: versionError } = await admin
        .from("editable_cv_versions")
        .select("*")
        .eq("id", payload.version_id)
        .eq("editable_cv_id", editableCvId)
        .maybeSingle();

      if (versionError) {
        throw new Error(versionError.message);
      }

      if (!versionData) {
        return NextResponse.json({ error: "Requested version was not found." }, { status: 404 });
      }

      const version = versionData as EditableCVVersionRecord;
      exportBlocks = (version.snapshot_blocks ?? []).map((block) => ({
        ...block,
        editable_cv_id: editableCvId,
        source_ocr_block_id: null,
        created_at: version.created_at,
        updated_at: version.created_at,
      })) as EditableCVBlockRecord[];
      exportVersionNumber = version.version_number;
    }

    const artifactsById = await getEditableBackgroundArtifacts(user.id, editableCvId);
    const pdfBuffer = await renderEditableCVExportBuffer({
      pages: (pagesData ?? []) as never[],
      blocks: exportBlocks as never[],
      artifactsById,
    });

    const exportId = randomUUID();
    const sha256 = createHash("sha256").update(pdfBuffer).digest("hex");
    const fileName = `cv-export-v${exportVersionNumber}.pdf`;
    const storagePath = `${user.id}/${editableCvId}/exports/${exportId}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("cv-exports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const artifactId = randomUUID();
    const { error: artifactError } = await admin.from("cv_document_artifacts").insert({
      id: artifactId,
      document_id: detail.source_document.id,
      artifact_key: `${detail.source_document.id}:export_pdf:all:${sha256}`,
      kind: "export_pdf",
      status: "ready",
      storage_bucket: "cv-exports",
      storage_path: storagePath,
      content_type: "application/pdf",
      byte_size: pdfBuffer.length,
      sha256,
      source_stage: "export",
      metadata: {
        editable_cv_id: editableCvId,
      },
    });
    if (artifactError) {
      throw new Error(artifactError.message);
    }

    const { error: exportRowError } = await admin.from("editable_cv_exports").insert({
      id: exportId,
      editable_cv_id: editableCvId,
      version_number: exportVersionNumber,
      artifact_id: artifactId,
      status: "ready",
    });
    if (exportRowError) {
      throw new Error(exportRowError.message);
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("cv-exports")
      .createSignedUrl(storagePath, 3600);
    if (signedError) {
      throw new Error(signedError.message);
    }

    const response = await buildEditableCVExportResponse(
      exportId,
      fileName,
      "application/pdf",
      signed.signedUrl,
      sha256
    );
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export editable CV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
