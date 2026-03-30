const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const baseUrl = 'http://localhost:3001';
const outDir = path.join(process.cwd(), 'artifacts', 'responsive-qa');
const statePath = path.join(outDir, 'hr-auth-state.json');

async function ensureLogin(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  console.log('Login page URL:', page.url());

  const attemptLogin = async (email, password) => {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('form button').last().click();
    await page.waitForTimeout(2200);
    await page.waitForLoadState('networkidle');
    return !page.url().includes('/login');
  };

  let isLoggedIn = await attemptLogin('hr@talentflow.local', 'Password123!');

  if (!isLoggedIn) {
    const seed = Date.now();
    const tempEmail = `autotest.hr.${seed}@example.com`;
    const tempPassword = 'Password123!';

    await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
    await page.locator('form .grid.grid-cols-2 button').nth(1).click();
    await page.locator('#fullname').fill('Auto QA HR');
    await page.locator('#email').fill(tempEmail);
    await page.locator('#password').fill(tempPassword);
    await page.locator('#confirmPassword').fill(tempPassword);
    await page.locator('form button', { hasText: 'Tạo tài khoản miễn phí' }).first().click();
    await page.waitForTimeout(2500);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/register')) {
      const otpTitle = page.getByText(/Xác thực tài khoản/i);
      if (await otpTitle.count()) {
        await page.screenshot({ path: path.join(outDir, 'debug-register-otp-required.png'), fullPage: true });
        throw new Error('Registration requires OTP verification, cannot auto-login for HR screenshots.');
      }
    }

    isLoggedIn = !page.url().includes('/login') && !page.url().includes('/register');
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

(async () => {
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
