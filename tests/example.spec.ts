import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

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
const BASE_URL = "https://aiqa.supportninja.com";
const TEST_EMAIL = 'ninjaai.qa@supportninja.com';
const IS_CI = process.env.CI === 'true';
const RUN_ID = process.env.RUN_ID || 'local';
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://1qmqknkyd0.execute-api.ap-southeast-1.amazonaws.com/dev/tos3';

// Screenshot folder
const SCREENSHOT_DIR = path.join('test-results', 'screenshots', RUN_ID);
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// =============================
// Helper: Take screenshot
// =============================
async function takeScreenshot(page, filename: string) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath });
  console.log(`📸 Screenshot saved: ${filePath}`);
  return filePath;
}

// =============================
// Helper: Upload to S3 endpoint
// =============================
async function uploadScreenshot(filePath: string) {
  const contentBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
  const filename = path.basename(filePath);

  const resp = await fetch(S3_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId: RUN_ID, screenshots: [{ filename, contentBase64 }] })
  });

  const data = await resp.json();
  console.log(`☁️ Uploaded ${filename}:`, data);
}

// =============================
// Test
// =============================
test('homepage loads and login', async ({ browser }) => {
  console.log('🚀 Starting homepage + login test');

  const context = await browser.newContext({ headless: IS_CI ? true : false });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  console.log('🌐 Page loaded:', await page.url());
  await expect(page).toHaveTitle(/Ninja AI QA/);

  // 1️⃣ Landing page screenshot
  const landingFile = IS_CI ? 'landing-page-ci.png' : 'landing-page.png';
  const landingPath = await takeScreenshot(page, landingFile);

  if (!IS_CI) {
    console.log('🔑 Performing local Google login...');
    await page.waitForTimeout(1000);

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

    const creds = await getCredentials(TEST_EMAIL);
    const TEST_PASSWORD = creds.password;

    await popup.fill('input[type="email"]', TEST_EMAIL);
    await popup.click('#identifierNext');
    await popup.waitForTimeout(2000);

    await popup.fill('input[type="password"]', TEST_PASSWORD);
    await popup.click('#passwordNext');
    console.log('🔑 Filled Google credentials');

    await page.waitForTimeout(8000);
  } else {
    console.log('ℹ️ Skipping interactive login in CI.');
  }

  // 2️⃣ Handle "Continue" popup if it exists
  try {
    const continueBtn = page.locator('button:has-text("Continue")');
    if (await continueBtn.count() > 0) {
      await continueBtn.click();
      console.log('✅ Detected and clicked "Continue" popup');
      await page.waitForTimeout(1000);
    }
  } catch (err) {
    console.log('ℹ️ No "Continue" popup found, proceeding...');
  }

  // 3️⃣ Wait for dashboard
  console.log('⏳ Waiting for dashboard to load...');
  await page.waitForSelector('div:has-text("Account & Agent Details")', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Dashboard screenshot
  const dashboardPath = await takeScreenshot(page, 'dashboard.png');

  // 4️⃣ Upload all screenshots
  for (const file of [landingPath, dashboardPath]) {
    await uploadScreenshot(file);
  }

  console.log('✅ All screenshots captured and uploaded!');
  await context.close();
});
