import { test, expect, chromium } from '@playwright/test';
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
// Get Credentials
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
    console.log(`☁️ Uploaded ${filename}`, await resp.json());
  } catch (err) {
    console.log(`⚠️ Upload failed for ${filename}:`, err.message);
  }
}

// =============================
// Test
// =============================
test('prod homepage login flow', async () => {
  console.log('🧼 Launching completely fresh browser...');

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    permissions: [],
    serviceWorkers: 'block',   // 🚫 prevents session reuse
    storageState: undefined    // 🧼 ensures no cookies/session
  });

  const page = await context.newPage();
  const screenshots = [];

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Ninja AI QA/);
    screenshots.push(await takeScreenshot(page, 'landing-page.png'));

    console.log('🔑 Waiting for Google Sign-In button...');

    const googleFrame = page.frameLocator('iframe[src*="accounts.google.com"]');
    const googleBtn = googleFrame.locator('div[role="button"]');

    await googleBtn.waitFor({ state: 'visible', timeout: 20000 });

    console.log('🖱 Clicking Google Sign-In...');
    const [popup] = await Promise.all([
      context.waitForEvent('page'),  // 💥 listen BEFORE click
      googleBtn.click()
    ]);

    await popup.waitForLoadState('domcontentloaded');

    const creds = await getCredentials(TEST_EMAIL);
    await popup.fill('input[type="email"]', TEST_EMAIL);
    await popup.click('#identifierNext');

    await popup.fill('input[type="password"]', creds.password);
    await popup.click('#passwordNext');

    console.log('🔄 Waiting for redirect back to app...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const continueBtn = page.locator('button:has-text("Continue")');
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      console.log('➡️ Clicked Continue popup');
    }

    await page.waitForSelector('div:has-text("Account & Agent Details")', { timeout: 30000 });
    screenshots.push(await takeScreenshot(page, 'dashboard.png'));

    console.log('✅ Production login test PASSED');
  } catch (err) {
    console.log('❌ Test failed:', err.message);
    screenshots.push(await takeScreenshot(page, 'failure.png'));
    throw err;
  } finally {
    for (const file of screenshots) {
      await uploadScreenshot(file);
    }
    await context.close();
    await browser.close();
  }
});

