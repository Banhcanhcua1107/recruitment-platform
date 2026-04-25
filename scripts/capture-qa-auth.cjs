const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const outDir = path.join(process.cwd(), 'artifacts', 'responsive-qa');
const statePath = path.join(outDir, 'hr-auth-state.json');
const sharedPassword = process.env.EMAIL_TESTING_SYNC_PASSWORD || 'TalentFlowTest#2026';
const fallbackHrAccounts = [
    'recruiter01@gmail.test',
    'recruiter02@gmail.test',
    'recruiter03@gmail.test',
];

async function syncFakeAccounts(page) {
    const response = await page.request.post(`${baseUrl}/api/fake-accounts/sync-recruitment`, {
        data: {},
        timeout: 120000,
    });

    if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Failed to sync fake accounts: ${response.status()} ${body}`);
    }
}

async function ensureLogin(browser) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    console.log('Login page URL:', page.url());

    const attemptLogin = async(email, password) => {
        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
        await page.locator('#email').fill(email);
        await page.locator('#password').fill(password);
        await page.locator('form button').last().click();
        await page.waitForTimeout(2200);
        await page.waitForLoadState('networkidle');
        return !page.url().includes('/login');
    };

    let isLoggedIn = await attemptLogin('recruiter01@gmail.test', sharedPassword);

    if (!isLoggedIn) {
        await syncFakeAccounts(page);
        for (const email of fallbackHrAccounts) {
            isLoggedIn = await attemptLogin(email, sharedPassword);
            if (isLoggedIn) {
                break;
            }
        }
    }

    if (!isLoggedIn) {
        await page.screenshot({ path: path.join(outDir, 'debug-login-failed.png'), fullPage: true });
        throw new Error(`Unable to obtain authenticated session, current URL: ${page.url()}`);
    }

    await context.storageState({ path: statePath });
    await context.close();
}

async function capturePage(browser, route, fileName, viewport) {
    const context = await browser.newContext({ viewport, storageState: statePath });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(outDir, fileName), fullPage: true });
    await context.close();
}

(async() => {
    fs.mkdirSync(outDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });

    try {
        await ensureLogin(browser);

        const viewports = [
            { name: 'mobile', size: { width: 390, height: 844 } },
            { name: 'tablet', size: { width: 768, height: 1024 } },
            { name: 'desktop', size: { width: 1440, height: 900 } },
        ];

        const routes = [
            { route: '/hr/dashboard', prefix: 'hr-dashboard' },
            { route: '/hr/candidates?view=marketplace', prefix: 'hr-candidates' },
            { route: '/hr/jobs', prefix: 'hr-jobs' },
        ];

        for (const vp of viewports) {
            for (const item of routes) {
                await capturePage(
                    browser,
                    item.route,
                    `${item.prefix}-${vp.name}-${vp.size.width}x${vp.size.height}-auth.png`,
                    vp.size
                );
            }
        }

        console.log('QA screenshots captured with authenticated session.');
    } finally {
        await browser.close();
    }
})();