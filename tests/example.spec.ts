import { test, expect } from '@playwright/test';

// Use BASE_URL from environment or fallback to localhost
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test('homepage loads', async ({ page }) => {
  console.log("🚀 Starting homepage test");

  // Go to the app's URL
  await page.goto(BASE_URL);
  console.log("🌐 Page loaded:", await page.url());

  // Check the page title
  const title = await page.title();
  console.log("📝 Page title is:", title);
  await expect(page).toHaveTitle(/Ninja AI QA/);

  console.log("✅ Homepage test passed");
});
