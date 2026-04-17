const path = require("node:path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const { createClient } = require("@supabase/supabase-js");
const crypto = require("node:crypto");

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

const candidateEmail = process.env.SMOKE_CANDIDATE_EMAIL || "recruitment.platform.npc+candidate.smoke@gmail.com";
const hrEmail = process.env.SMOKE_HR_EMAIL || "recruitment.platform.npc+hr.smoke@gmail.com";
const password = process.env.SMOKE_TEST_PASSWORD || "SmokeTest#2026";

async function ensureUser(email, role, fullName) {
    const { data: profile } = await supabase
        .from("profiles")
        .select("id,email,role")
        .eq("email", email)
        .maybeSingle();

    let userId = profile ? .id || null;

    if (!userId) {
        const created = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
        });

        if (created.error && !String(created.error.message || "").toLowerCase().includes("already registered")) {
            throw created.error;
        }

        if (created.data ? .user ? .id) {
            userId = created.data.user.id;
        } else {
            const { data: lookup, error: lookupError } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", email)
                .maybeSingle();

            if (lookupError || !lookup) {
                throw lookupError || new Error(`Cannot resolve user id for ${email}`);
            }

            userId = lookup.id;
        }
    }

    const { error: upsertProfileError } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        full_name: fullName,
        role,
    }, { onConflict: "id" });

    if (upsertProfileError) {
        throw upsertProfileError;
    }

    return userId;
}

(async() => {
    const candidateId = await ensureUser(candidateEmail, "candidate", "Smoke Candidate Gmail");
    const hrId = await ensureUser(hrEmail, "hr", "Smoke HR Gmail");

    const { error: employerError } = await supabase.from("employers").upsert({
        id: hrId,
        email: hrEmail,
        company_name: "Smoke Gmail Recruitment",
        logo_url: null,
        cover_url: null,
        location: "Ho Chi Minh",
        industry: ["IT"],
        company_size: "10-49",
        company_description: "Smoke test employer",
    }, { onConflict: "id" });

    if (employerError) {
        throw employerError;
    }

    const { error: candidateError } = await supabase.from("candidates").upsert({
        id: candidateId,
        email: candidateEmail,
        full_name: "Smoke Candidate Gmail",
        phone: "0900000001",
        resume_url: null,
    }, { onConflict: "id" });

    if (candidateError && !String(candidateError.message || "").toLowerCase().includes('relation "candidates" does not exist')) {
        throw candidateError;
    }

    const title = `SMOKE APPLY REAL GMAIL ${new Date().toISOString()}`;

    const baseJob = {
        id: crypto.randomUUID(),
        title,
        location: "Ho Chi Minh",
        status: "open",
        is_public_visible: true,
        description: ["Smoke runtime apply test"],
        employer_id: hrId,
        company_name: "Smoke Gmail Recruitment",
        logo_url: null,
        cover_url: null,
        requirements: ["Can send email"],
        benefits: ["Test"],
        industry: ["IT"],
        employment_type: "Full-time",
        level: "Junior",
        full_address: "Ho Chi Minh",
        salary: "Negotiable",
        posted_date: new Date().toISOString().slice(0, 10),
        target_applications: 20,
        hr_email: hrEmail,
    };

    let { data: insertedJob, error: insertJobError } = await supabase
        .from("jobs")
        .insert(baseJob)
        .select("id")
        .single();

    if (insertJobError) {
        const fallback = {...baseJob };
        delete fallback.hr_email;
        delete fallback.target_applications;

        const fallbackInsert = await supabase.from("jobs").insert(fallback).select("id").single();
        insertedJob = fallbackInsert.data;
        insertJobError = fallbackInsert.error;

        if (!insertJobError && insertedJob ? .id) {
            const { error: patchHrEmailError } = await supabase
                .from("jobs")
                .update({ hr_email: hrEmail })
                .eq("id", insertedJob.id);

            if (patchHrEmailError && !String(patchHrEmailError.message || "").toLowerCase().includes("column")) {
                throw patchHrEmailError;
            }
        }
    }

    if (insertJobError || !insertedJob ? .id) {
        throw insertJobError || new Error("Unable to create smoke test job");
    }

    console.log(
        JSON.stringify({
                ok: true,
                candidateEmail,
                hrEmail,
                password,
                candidateId,
                hrId,
                jobId: insertedJob.id,
            },
            null,
            2
        )
    );
})().catch((error) => {
    const message =
        error instanceof Error ?
        error.message :
        typeof error === "object" && error !== null && "message" in error ?
        String(error.message || "Unknown error") :
        String(error);

    console.error(
        JSON.stringify({
                ok: false,
                message,
                raw: error,
            },
            null,
            2
        )
    );
    process.exit(1);
});