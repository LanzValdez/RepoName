import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// =============================
// ESM __dirname fix
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// Config
// =============================
const BASE_URL = 'https://aiqa.supportninja.com';
const S3_ENDPOINT =
  'https://1qmqknkyd0.execute-api.ap-southeast-1.amazonaws.com/dev/tos3';

const RUN_ID = process.env.RUN_ID || 'local-run';

// Screenshots folder
const SCREENSHOT_DIR = path.join(__dirname, 'test-results', 'screenshots', RUN_ID);
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
        runId: RUN_ID,
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
test('prod homepage login flow (google auth via storageState)', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: 'google-auth.json',
  });

  const page = await context.newPage();
  const screenshots = [];

  try {
    console.log('🚀 Starting production homepage test');

    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Ninja AI QA/);

    screenshots.push(await takeScreenshot(page, 'landing-page.png'));

    await page.waitForTimeout(2000);

    await page.waitForSelector('div:has-text("Account & Agent Details")', {
      timeout: 20000,
    });

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
