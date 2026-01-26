import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// =============================
// Get Credentials
// =============================
async function getCredentials(email: string) {
  const url = `https://n292shfujb.execute-api.ap-southeast-1.amazonaws.com/sandbox/get-credentials?email=${encodeURIComponent(email)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch credentials: ${resp.statusText}`);
  return await resp.json();
}

// =============================
// Config
// =============================
const BASE_URL = "https://aiqa.supportninja.com" || 'http://localhost:5173';
const TEST_EMAIL = 'ninjaai.qa@supportninja.com';
const IS_CI = process.env.CI === 'true'; // GitHub Actions sets this automatically
const RUN_ID = process.env.RUN_ID || 'local'; // from workflow env

// Ensure screenshot folder exists
const SCREENSHOT_DIR = path.join('test-results', 'screenshots', RUN_ID);
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test('homepage loads and login', async ({ browser }) => {
  console.log('🚀 Starting homepage + login test');

  const context = await browser.newContext({ headless: IS_CI ? true : false });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  console.log('🌐 Page loaded:', await page.url());

  const title = await page.title();
  console.log('📝 Page title is:', title);
  await expect(page).toHaveTitle(/Ninja AI QA/);

  if (!IS_CI) {
    console.log('🔑 Performing local Google login...');
    await page.waitForTimeout(1000);

    // Screenshot BEFORE clicking Google Sign-In
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'landing-page.png') });
    console.log('📸 Screenshot of landing page taken');

    const iframe = page.frames().find(f => f.url().includes('accounts.google.com'));
    const googleBtn = iframe
      ? iframe.locator('div[role="button"]')
      : page.frameLocator('iframe[src*="accounts.google.com/gsi/button"]').locator('div[role="button"]');

    await googleBtn.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);
    await googleBtn.click();
    console.log('✅ Clicked Google Sign-In button');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.waitForTimeout(1000)
    ]);
    await popup.waitForLoadState('domcontentloaded');
    console.log('🌐 Google login popup detected');

    const creds = await getCredentials(TEST_EMAIL);
    const TEST_PASSWORD = creds.password;

    await popup.fill('input[type="email"]', TEST_EMAIL);
    await popup.click('#identifierNext');
    await popup.waitForTimeout(2000);

    await popup.fill('input[type="password"]', TEST_PASSWORD);
    await popup.click('#passwordNext');
    console.log(`🔑 Filled Google credentials for ${TEST_EMAIL}`);

    await page.waitForTimeout(8000);

    console.log('⏳ Waiting for dashboard to load...');
    await page.waitForSelector('div:has-text("Account & Agent Details")', { timeout: 15000 });
    await page.waitForTimeout(5000);
    console.log('✅ Dashboard fully loaded');

    // Dashboard screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard.png') });
    console.log('📸 Screenshot of dashboard taken');

  } else {
    console.log('ℹ️ Skipping interactive login in CI. Only testing homepage load.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'landing-page-ci.png') });
    console.log('📸 Screenshot of landing page taken in CI');
  }

  await context.close();
});
