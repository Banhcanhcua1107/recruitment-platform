const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } },
);

const TARGET_EMAILS = [
    "candidate01@gmail.test",
    "candidate99@gmail.test",
    "haidangnakar11@gmail.com",
];

(async() => {
    const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,role")
        .in("email", TARGET_EMAILS);

    if (profileError) {
        throw profileError;
    }

    const checks = [];

    for (const profile of profiles || []) {
        const userId = String(profile.id);

        const [resumeRes, appRes, candidateProfileRes] = await Promise.all([
            supabase
            .from("resumes")
            .select("id,user_id", { count: "exact" })
            .eq("user_id", userId),
            supabase
            .from("applications")
            .select("id,candidate_id,cv_file_path", { count: "exact" })
            .eq("candidate_id", userId)
            .not("cv_file_path", "is", null),
            supabase
            .from("candidate_profiles")
            .select("user_id,email,cv_file_path,profile_visibility")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (resumeRes.error) throw resumeRes.error;
        if (appRes.error) throw appRes.error;
        if (candidateProfileRes.error) throw candidateProfileRes.error;

        const applicationRows = appRes.data || [];
        const visibleByCurrentFilterRows = applicationRows.filter((row) => {
            const path = String(row.cv_file_path || "").trim();
            return path.length > 0 && path.startsWith(`${userId}/`);
        });

        const redactedPathRows = applicationRows.filter((row) => {
            const path = String(row.cv_file_path || "").trim();
            return path.startsWith("deleted/");
        });

        checks.push({
            email: profile.email,
            role: profile.role,
            userId,
            resumeCount: resumeRes.count || 0,
            applicationCvCount: appRes.count || 0,
            visibleByCurrentFilterCount: visibleByCurrentFilterRows.length,
            redactedPathCount: redactedPathRows.length,
            profileCvPath: candidateProfileRes.data ? .cv_file_path || null,
            profileVisibility: candidateProfileRes.data ? .profile_visibility || null,
        });
    }

    const pass = checks.every((item) => item.visibleByCurrentFilterCount === 0);

    console.log(
        JSON.stringify({
                ok: true,
                pass,
                checks,
            },
            null,
            2,
        ),
    );

    if (!pass) {
        process.exitCode = 1;
    }
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