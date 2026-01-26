import { test, expect } from '@playwright/test';

// =============================
// Get Credentials
// =============================
async function getCredentials(email) {
  try {
    const url = `https://n292shfujb.execute-api.ap-southeast-1.amazonaws.com/sandbox/get-credentials?email=${encodeURIComponent(email)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch credentials: ${resp.statusText}`);
    return await resp.json();
  } catch (err) {
    console.error('Error fetching credentials:', err.message);
    throw err;
  }
}

// =============================
// Config
// =============================
const BASE_URL = "https://aiqa.supportninja.com" || 'http://localhost:5173';
const TEST_EMAIL = 'ninjaai.qa@supportninja.com';
const IS_CI = process.env.CI === 'true'; // GitHub Actions sets this automatically

test('homepage loads and login', async ({ browser }) => {
  console.log('🚀 Starting homepage + login test');

  // Headful locally, headless in CI
  const context = await browser.newContext({ headless: IS_CI ? true : false });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  console.log('🌐 Page loaded:', await page.url());

  const title = await page.title();
  console.log('📝 Page title is:', title);
  await expect(page).toHaveTitle(/Ninja AI QA/);

  if (!IS_CI) {
    // ==============================
    // Local login (headful)
    // ==============================
    console.log('🔑 Performing local Google login...');

    // Wait a bit for page to settle
    await page.waitForTimeout(1000);

    // Take screenshot BEFORE clicking Google Sign-In
    await page.screenshot({ path: 'landing-page.png' });
    console.log('📸 Screenshot of landing page taken: landing-page.png');

    const iframe = page.frames().find(f => f.url().includes('accounts.google.com'));
    const googleBtn = iframe
      ? iframe.locator('div[role="button"]')
      : page.frameLocator('iframe[src*="accounts.google.com/gsi/button"]').locator('div[role="button"]');

    await googleBtn.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);
    await googleBtn.click();
    console.log('✅ Clicked Google Sign-In button');

    // Wait for popup
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.waitForTimeout(1000)
    ]);
    await popup.waitForLoadState('domcontentloaded');
    console.log('🌐 Google login popup detected');

    // Get password from API
    const creds = await getCredentials(TEST_EMAIL);
    const TEST_PASSWORD = creds.password;

    // Fill email
    await popup.fill('input[type="email"]', TEST_EMAIL);
    await popup.click('#identifierNext');
    await popup.waitForTimeout(2000);

    // Fill password
    await popup.fill('input[type="password"]', TEST_PASSWORD);
    await popup.click('#passwordNext');
    console.log(`🔑 Filled Google credentials for ${TEST_EMAIL}`);

    // Wait for redirect / landing page
    await page.waitForTimeout(8000);
    console.log('✅ Login flow attempted locally. You can inspect the page.');

    // Wait for dashboard element with exact text
    console.log('⏳ Waiting for dashboard to load...');
    await page.waitForSelector('div:has-text("Account & Agent Details")', { timeout: 15000 });
    await page.waitForTimeout(5000);
    console.log('✅ Dashboard fully loaded');

    // Take screenshot of dashboard
    await page.screenshot({ path: 'dashboard.png' });
    console.log('📸 Screenshot of dashboard taken: dashboard.png');

  } else {
    // ==============================
    // CI: skip interactive login
    // ==============================
    console.log('ℹ️ Skipping interactive login in CI. Only testing homepage load.');

    // Take landing page screenshot in CI
    await page.screenshot({ path: 'landing-page-ci.png' });
    console.log('📸 Screenshot of landing page taken in CI: landing-page-ci.png');
  }

  // Browser cleanup
  await context.close();
});
