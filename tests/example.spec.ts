import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// =============================
// Config
// =============================
const BASE_URL = 'https://aiqa.supportninja.com';
const S3_ENDPOINT =
  'https://1qmqknkyd0.execute-api.ap-southeast-1.amazonaws.com/dev/tos3';

// Screenshots folder
const SCREENSHOT_DIR = path.join('test-results', 'screenshots', 'prod');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
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
      body: JSON.stringify({
        runId: 'prod',
        screenshots: [{ filename, contentBase64 }],
      }),
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
test('prod homepage login flow (google auth via storageState)', async ({
  browser,
}) => {
  // ✅ Use pre-authenticated Google session
  const context = await browser.newContext({
    storageState: 'google-auth.json',
  });

  const page = await context.newPage();
  const screenshots = [];

  try {
    console.log('🚀 Starting production homepage test');

    // Go to prod URL
    await page.goto(BASE_URL);
    console.log('🌐 Page loaded:', await page.url());
    await expect(page).toHaveTitle(/Ninja AI QA/);

    screenshots.push(await takeScreenshot(page, 'landing-page.png'));

    // Google login (session already exists)
    console.log('🔑 Clicking Google Sign-In (pre-authenticated)');
    await page.waitForTimeout(2000);

    const iframe = page
      .frames()
      .find((f) => f.url().includes('accounts.google.com'));

    const googleBtn = iframe
      ? iframe.locator('div[role="button"]')
      : page
          .frameLocator('iframe[src*="accounts.google.com"]')
          .locator('div[role="button"]');

    await googleBtn.waitFor({ state: 'visible', timeout: 20000 });
    await googleBtn.click();

    screenshots.push(await takeScreenshot(page, 'clicked-google-btn.png'));

    // Handle optional "Continue" popup
    const continueBtn = page.locator('button:has-text("Continue")');
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      console.log('✅ Clicked "Continue" popup');
      screenshots.push(
        await takeScreenshot(page, 'continue-popup-clicked.png')
      );
    }

    // Wait for dashboard
    console.log('⏳ Waiting for dashboard...');
    await page.waitForSelector(
      'div:has-text("Account & Agent Details")',
      { timeout: 20000 }
    );

    screenshots.push(await takeScreenshot(page, 'dashboard.png'));

    console.log('✅ Production test passed!');
  } catch (err) {
    console.log('❌ Test failed:', err.message);
    screenshots.push(await takeScreenshot(page, 'failure.png'));
    throw err;
  } finally {
    for (const file of screenshots) {
      await uploadScreenshot(file);
    }
    await context.close();
  }
});
