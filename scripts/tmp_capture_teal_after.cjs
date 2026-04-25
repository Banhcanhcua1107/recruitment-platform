const { chromium } = require('playwright');
const fs = require('fs');

(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('#email', 'hr@talentflow.local');
    await page.fill('#password', 'Password123!');
    await page.locator('button').nth(1).click();
    await page.waitForTimeout(3000);

    const target = 'http://localhost:3000/candidate/cv-builder/new?template=teal-timeline';
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});

    const path = 'artifacts/responsive-qa/teal-timeline-layout-after.png';
    fs.mkdirSync('artifacts/responsive-qa', { recursive: true });
    await page.screenshot({ path, fullPage: true });

    const body = await page.locator('body').innerText();
    const notFound = body.includes('Không tìm th?y CV') || body.includes('không có quy?n truy c?p');

    console.log(JSON.stringify({ finalUrl: page.url(), screenshot: path, notFound }, null, 2));
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
