import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// =============================
// Config
// =============================
const BASE_URL = "https://aiqa.supportninja.com";
const TEST_EMAIL = 'ninjaai.qa@supportninja.com';
const S3_ENDPOINT = 'https://1qmqknkyd0.execute-api.ap-southeast-1.amazonaws.com/dev/tos3';

// Screenshots folder
const SCREENSHOT_DIR = path.join('test-results', 'screenshots', 'prod');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// =============================
// Get Credentials from API
// =============================
async function getCredentials(email) {
  const url = `https://n292shfujb.execute-api.ap-southeast-1.amazonaws.com/sandbox/get-credentials?email=${encodeURIComponent(email)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch credentials: ${resp.statusText}`);
  return await resp.json();
}

// =============================
// Helpers
// =============================
async function takeScreenshot(page, filename) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filePath });
  console.log(`📸 Screenshot saved: ${filePath}`);
  return filePath;
}

async function uploadScreenshot(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contentBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
  const filename = path.basename(filePath);

  try {
    const resp = await fetch(S3_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'prod', screenshots: [{ filename, contentBase64 }] })
    });
    const data = await resp.json();
    console.log(`☁️ Uploaded ${filename}:`, data);
  } catch (err) {
    console.log(`⚠️ Failed to upload ${filename}:`, err.message);
  }
}

// =============================
// Test
// =============================
test('prod homepage login flow', async ({ browser }) => {
  const context = await browser.newContext({ headless: true });
  const page = await context.newPage();

  const screenshots = [];

  try {
    console.log('🚀 Starting production homepage + login test');

    // Go to prod URL
    await page.goto(BASE_URL);
    console.log('🌐 Page loaded:', await page.url());
    await expect(page).toHaveTitle(/Ninja AI QA/);

    // Landing page screenshot
    screenshots.push(await takeScreenshot(page, 'landing-page.png'));

    // Google login
    console.log('🔑 Performing Google login...');
    await page.waitForTimeout(2000); // wait for iframe

    const iframe = page.frames().find(f => f.url().includes('accounts.google.com'));
    const googleBtn = iframe
      ? iframe.locator('div[role="button"]')
      : page.frameLocator('iframe[src*="accounts.google.com/gsi/button"]').locator('div[role="button"]');

    await googleBtn.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1000);
    await googleBtn.click();
    console.log('✅ Clicked Google Sign-In button');

    const [popup] = await Promise.all([context.waitForEvent('page'), page.waitForTimeout(1000)]);
    await popup.waitForLoadState('domcontentloaded');

    // Fetch password dynamically
    const creds = await getCredentials(TEST_EMAIL);
    const TEST_PASSWORD = creds.password;

    await popup.fill('input[type="email"]', TEST_EMAIL);
    await popup.click('#identifierNext');
    await popup.waitForTimeout(2000);

    await popup.fill('input[type="password"]', TEST_PASSWORD);
    await popup.click('#passwordNext');
    console.log('🔑 Filled Google credentials');

    await page.waitForTimeout(8000); // wait for redirect to dashboard

    // Handle "Continue" popup if exists
    const continueBtn = page.locator('button:has-text("Continue")');
    if ((await continueBtn.count()) > 0) {
      await continueBtn.click();
      console.log('✅ Clicked "Continue" popup');
      await page.waitForTimeout(1000);
    }

    // Wait for dashboard
    console.log('⏳ Waiting for dashboard...');
    await page.waitForSelector('div:has-text("Account & Agent Details")', { timeout: 20000 });
    await page.waitForTimeout(2000);

    // Dashboard screenshot
    screenshots.push(await takeScreenshot(page, 'dashboard.png'));

    console.log('✅ Production test passed!');
  } catch (err) {
    console.log('❌ Test failed:', err.message);
    const failScreenshot = await takeScreenshot(page, 'failure.png');
    screenshots.push(failScreenshot);
    throw err;
  } finally {
    // Upload all screenshots to S3
    for (const file of screenshots) {
      await uploadScreenshot(file);
    }
    await context.close();
  }
});
