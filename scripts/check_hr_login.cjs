const { chromium } = require('playwright');

(async() => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
        await page.goto('http://localhost/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.fill('#email', 'hr@talentflow.local');
        await page.fill('#password', 'Password123!');
        await page.click('form button:has-text("Đăng nhập ngay")');
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        const finalUrl = page.url();
        const title = await page.title();
        console.log(JSON.stringify({ finalUrl, title }, null, 2));
    } catch (error) {
        console.error(String(error));
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();