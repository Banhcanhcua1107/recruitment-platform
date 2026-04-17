const path = require("node:path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const candidateEmail = process.env.SMOKE_CANDIDATE_EMAIL || "recruitment.platform.npc+candidate.smoke@gmail.com";
const password = process.env.SMOKE_TEST_PASSWORD || "SmokeTest#2026";
const jobId = process.env.SMOKE_JOB_ID || "f29f7324-e3f8-40df-8016-2d3113955e22";

function createPdfPayload() {
    return `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (Smoke Apply Test) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000222 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n311\n%%EOF`;
}

(async() => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    try {
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.fill("#email", candidateEmail);
        await page.fill("#password", password);
        await page.click('form button:has-text("Đăng nhập ngay")');
        await page.waitForTimeout(1800);
        await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

        if (/\/login($|\?)/i.test(page.url())) {
            throw new Error(`Candidate login failed for ${candidateEmail}`);
        }

        const result = await page.evaluate(async({ jobId, candidateEmail, pdfContent }) => {
            const formData = new FormData();
            formData.set("job_id", jobId);
            formData.set("full_name", "Smoke Candidate Gmail");
            formData.set("email", candidateEmail);
            formData.set("phone", "0900000001");
            formData.set("introduction", "Smoke runtime test apply from real Gmail candidate account.");
            formData.set(
                "cv_file",
                new File([pdfContent], "smoke-apply-runtime.pdf", {
                    type: "application/pdf",
                })
            );

            const response = await fetch("/api/apply-job", {
                method: "POST",
                body: formData,
            });

            const raw = await response.text();
            let body;
            try {
                body = JSON.parse(raw);
            } catch {
                body = { raw };
            }

            return {
                status: response.status,
                ok: response.ok,
                body,
            };
        }, {
            jobId,
            candidateEmail,
            pdfContent: createPdfPayload(),
        });

        console.log(
            JSON.stringify({
                    ok: true,
                    baseUrl: BASE_URL,
                    candidateEmail,
                    jobId,
                    response: result,
                },
                null,
                2
            )
        );
    } catch (error) {
        console.error(
            JSON.stringify({
                    ok: false,
                    message: error instanceof Error ? error.message : String(error),
                },
                null,
                2
            )
        );
        process.exitCode = 1;
    } finally {
        await page.close();
        await browser.close();
    }
})();