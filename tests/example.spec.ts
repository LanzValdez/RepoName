import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  console.log("🚀 Starting homepage test");

  // Go to homepage
  await page.goto('/');
  console.log("🌐 Page loaded:", await page.url());

  // Check title
  const title = await page.title();
  console.log("📝 Page title is:", title);
  await expect(page).toHaveTitle(/Ninja AI QA/);

  console.log("✅ Homepage test passed");
});
