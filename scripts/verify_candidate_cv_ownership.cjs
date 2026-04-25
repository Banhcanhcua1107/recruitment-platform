const { chromium } = require("playwright");
require("dotenv").config({ path: ".env.local" });

const BASE_URL =
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";
const SHARED_PASSWORD =
    process.env.CV_TEST_PASSWORD ||
    process.env.EMAIL_TESTING_SYNC_PASSWORD ||
    "TalentFlowTest#2026";

const CANDIDATES = [
    process.env.VERIFY_CANDIDATE_EMAIL_1 || "candidate01@gmail.test",
    process.env.VERIFY_CANDIDATE_EMAIL_2 || "candidate02@gmail.test",
];

async function clickSubmit(page) {
    const byText = page.locator('form button:has-text("Đăng nhập ngay")');
    if (await byText.count()) {
        await byText.first().click();
        return;
    }
    await page.locator("form button").last().click();
}

async function login(page, email, password) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.fill("#email", email);
    await page.fill("#password", password);
    await clickSubmit(page);
    await page.waitForTimeout(1800);
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    if (/\/login($|\?)/i.test(page.url())) {
        throw new Error(`Login failed for ${email}`);
    }
}

async function fetchOwnershipSnapshot(page) {
    return page.evaluate(async() => {
        const fetchJson = async(url) => {
            const response = await fetch(url, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
            });

            let payload = {};
            try {
                payload = await response.json();
            } catch {
                payload = {};
            }

            return {
                ok: response.ok,
                status: response.status,
                payload,
            };
        };

        const [profileRes, resumesRes, optionsRes] = await Promise.all([
            fetchJson("/api/candidate/profile"),
            fetchJson("/api/cv-builder/resumes"),
            fetchJson("/api/candidate/cv-options"),
        ]);

        const profile = profileRes.payload ? .profile || null;
        const userId =
            profile ? .userId ||
            profile ? .user_id ||
            profileRes.payload ? .userId ||
            profileRes.payload ? .user_id ||
            null;

        const resumes = Array.isArray(resumesRes.payload ? .items) ? resumesRes.payload.items : [];
        const options = Array.isArray(optionsRes.payload ? .items) ? optionsRes.payload.items : [];

        return {
            userId,
            profileRes,
            resumesRes,
            optionsRes,
            resumes,
            options,
        };
    });
}

function validateSnapshot(email, snapshot) {
    const issues = [];

    if (!snapshot.userId) {
        issues.push("Missing userId from /api/candidate/profile");
    }

    if (!snapshot.resumesRes.ok) {
        issues.push(`Resumes API failed (${snapshot.resumesRes.status})`);
    }

    if (!snapshot.optionsRes.ok) {
        issues.push(`CV options API failed (${snapshot.optionsRes.status})`);
    }

    const foreignResumes = snapshot.resumes.filter(
        (item) => snapshot.userId && String(item.user_id || "") !== String(snapshot.userId),
    );

    if (foreignResumes.length > 0) {
        issues.push(`Found ${foreignResumes.length} foreign resume rows`);
    }

    const foreignPaths = snapshot.options.filter((item) => {
        const path = String(item.path || "").trim();
        if (!path) return false;
        if (!snapshot.userId) return true;
        return !path.startsWith(`${snapshot.userId}/`);
    });

    if (foreignPaths.length > 0) {
        issues.push(`Found ${foreignPaths.length} foreign CV paths`);
    }

    const uuidLikeInLabel = snapshot.options.filter((item) =>
        /\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf\)/i.test(
            String(item.label || ""),
        ),
    );

    if (uuidLikeInLabel.length > 0) {
        issues.push(`Found ${uuidLikeInLabel.length} labels still showing UUID-like filename`);
    }

    return {
        email,
        userId: snapshot.userId,
        resumesCount: snapshot.resumes.length,
        optionsCount: snapshot.options.length,
        foreignResumes: foreignResumes.length,
        foreignPaths: foreignPaths.length,
        uuidLikeLabelCount: uuidLikeInLabel.length,
        issues,
        pass: issues.length === 0,
    };
}

(async() => {
    const browser = await chromium.launch({ headless: true });
    const reports = [];

    try {
        for (const email of CANDIDATES) {
            const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
            const page = await context.newPage();
            try {
                await login(page, email, SHARED_PASSWORD);
                const snapshot = await fetchOwnershipSnapshot(page);
                reports.push(validateSnapshot(email, snapshot));
            } finally {
                await context.close();
            }
        }

        const pass = reports.every((item) => item.pass);
        console.log(JSON.stringify({ baseUrl: BASE_URL, pass, reports }, null, 2));

        if (!pass) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.error(
            JSON.stringify({
                    ok: false,
                    message: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
            ),
        );
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();