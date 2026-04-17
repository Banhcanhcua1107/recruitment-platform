const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } },
);

const TABLE_DELETE_ORDER = [
    "editable_cv_versions",
    "editable_cv_blocks",
    "editable_cvs",
    "cv_layout_blocks",
    "cv_ocr_blocks",
    "cv_document_pages",
    "cv_document_stage_runs",
    "cv_documents",
    "resumes",
];

function isMissingTableError(error) {
    const message = String(error ? .message || "").toLowerCase();
    return (
        message.includes("could not find the table") ||
        message.includes("does not exist") ||
        message.includes("schema cache")
    );
}

async function countRows(tableName) {
    const res = await supabase.from(tableName).select("id", { count: "exact", head: true });
    if (res.error) {
        if (isMissingTableError(res.error)) {
            return { table: tableName, exists: false, count: 0 };
        }
        throw res.error;
    }
    return { table: tableName, exists: true, count: res.count || 0 };
}

async function deleteAllRows(tableName) {
    const res = await supabase.from(tableName).delete();
    if (res.error) {
        if (isMissingTableError(res.error)) {
            return { table: tableName, skipped: true, reason: "missing_table" };
        }
        throw res.error;
    }
    return { table: tableName, skipped: false };
}

(async() => {
    const beforeCounts = [];
    for (const table of TABLE_DELETE_ORDER) {
        beforeCounts.push(await countRows(table));
    }

    const updates = [];

    const appUpdate = await supabase
        .from("applications")
        .update({ cv_file_path: null, cv_file_url: null })
        .not("cv_file_path", "is", null)
        .select("id");
    if (appUpdate.error) throw appUpdate.error;
    updates.push({ target: "applications.cv_file_*", updated: (appUpdate.data || []).length });

    const profileUpdate = await supabase
        .from("candidate_profiles")
        .update({ cv_file_path: null, cv_url: null })
        .or("cv_file_path.not.is.null,cv_url.not.is.null")
        .select("user_id");
    if (profileUpdate.error) throw profileUpdate.error;
    updates.push({ target: "candidate_profiles.cv_*", updated: (profileUpdate.data || []).length });

    const candidateUpdate = await supabase
        .from("candidates")
        .update({ resume_url: null })
        .not("resume_url", "is", null)
        .select("id");
    if (candidateUpdate.error && !isMissingTableError(candidateUpdate.error)) {
        throw candidateUpdate.error;
    }
    updates.push({
        target: "candidates.resume_url",
        updated: candidateUpdate.error ? 0 : (candidateUpdate.data || []).length,
        skipped: Boolean(candidateUpdate.error),
    });

    const deleteActions = [];
    for (const table of TABLE_DELETE_ORDER) {
        deleteActions.push(await deleteAllRows(table));
    }

    const afterCounts = [];
    for (const table of TABLE_DELETE_ORDER) {
        afterCounts.push(await countRows(table));
    }

    console.log(
        JSON.stringify({
                ok: true,
                beforeCounts,
                updates,
                deleteActions,
                afterCounts,
            },
            null,
            2,
        ),
    );
})().catch((error) => {
    console.error(
        JSON.stringify({
                ok: false,
                message: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
        ),
    );
    process.exit(1);
});