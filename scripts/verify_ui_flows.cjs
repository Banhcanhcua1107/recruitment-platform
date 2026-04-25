const { chromium, request } = require('playwright');

const BASE_URL = 'http://127.0.0.1';

async function fetchJobId() {
    const api = await request.newContext({ baseURL: BASE_URL });
    const response = await api.get('/api/jobs?limit=1');
    if (!response.ok()) {
        await api.dispose();
        throw new Error(`Failed to fetch jobs API: ${response.status()}`);
    }

    const payload = await response.json();
    await api.dispose();
    const id = payload ? .items ? .[0] ? .id;
    if (!id) {
        throw new Error('No jobs available for UI flow verification.');
    }

    return id;
}

async function verifyGuestFlow(browser, jobId) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/jobs/${jobId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    const guestPrompt = page.getByText('Đăng nhập tài khoản ứng viên để tiếp tục ứng tuyển.');
    const loginLink = page.locator('a[href="/login"]', { hasText: 'Đăng nhập ngay' }).first();

    const promptVisible = await guestPrompt.first().isVisible().catch(() => false);
    const loginVisible = await loginLink.isVisible().catch(() => false);

    await page.goto(`${BASE_URL}/jobs?page=2`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    const page2Cards = await page.locator('main a[href^="/jobs/"]').count();

    await context.close();

    if (!promptVisible || !loginVisible) {
        throw new Error('Guest apply flow verification failed (login prompt/link not visible).');
    }

    if (page2Cards < 1) {
        throw new Error('Public jobs page 2 did not render any job links.');
    }

    return {
        guestPromptVisible: promptVisible,
        guestLoginVisible: loginVisible,
        page2JobLinks: page2Cards,
    };
}

async function loginHr(browser) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('#email', 'hr@talentflow.local');
    await page.fill('#password', 'Password123!');
    await page.click('form button:has-text("Đăng nhập ngay")');
    await page.waitForTimeout(2500);
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    const finalUrl = page.url();
    if (finalUrl.includes('/login')) {
        await context.close();
        throw new Error('HR login failed with configured credentials.');
    }

    return { context, page, finalUrl };
}

async function verifyLoggedInApplyAndCompanyFlow(browser, jobId) {
    const { context, page, finalUrl } = await loginHr(browser);

    await page.goto(`${BASE_URL}/jobs/${jobId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    const applyButton = page.getByRole('button', { name: 'Ứng tuyển ngay' }).first();
    await applyButton.waitFor({ state: 'visible', timeout: 30000 });
    await applyButton.click();

    const modalTitle = page.getByText('Hoàn tất hồ sơ ứng tuyển');
    await modalTitle.first().waitFor({ state: 'visible', timeout: 30000 });

    await page.goto(`${BASE_URL}/hr/jobs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

    const hrUrl = page.url();
    const companyFlowOk = hrUrl.includes('/hr/jobs');

    await context.close();

    if (!companyFlowOk) {
        throw new Error(`Company flow failed, expected /hr/jobs but got ${hrUrl}`);
    }

    return {
        loginRedirectUrl: finalUrl,
        applyModalVisible: true,
        companyFlowUrl: hrUrl,
    };
}

(async() => {
    const browser = await chromium.launch({ headless: true });

    try {
        const jobId = await fetchJobId();
        const guest = await verifyGuestFlow(browser, jobId);
        const loggedIn = await verifyLoggedInApplyAndCompanyFlow(browser, jobId);

        console.log(
            JSON.stringify({
                    ok: true,
                    baseUrl: BASE_URL,
                    jobId,
                    guest,
                    loggedIn,
                },
                null,
                2,
            ),
        );
    } catch (error) {
        console.error(
            JSON.stringify({
                    ok: false,
                    error: String(error),
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