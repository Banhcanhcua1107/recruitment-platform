const { chromium } = require('playwright');

(async() => {
    const emails = [
        'candidate@talentflow.local',
        'candidate1@talentflow.local',
        'user@talentflow.local',
        'applicant@talentflow.local',
    ];

    const browser = await chromium.launch({ headless: true });
    try {
        for (const email of emails) {
            const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
            await page.goto('http://localhost/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.fill('#email', email);
            await page.fill('#password', 'Password123!');
            await page.click('form button:has-text("Đăng nhập ngay")');
            await page.waitForTimeout(2500);
            await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
            console.log(`${email} -> ${page.url()}`);
            await page.close();
        }
    } finally {
        await browser.close();
    }
})();