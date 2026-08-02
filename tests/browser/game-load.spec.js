const { test, expect } = require('@playwright/test');

test('game shell loads from the organized browser test server', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Critter Extraction/i);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#app')).toBeAttached();
});

test('high-end runtime bridge files are served', async ({ request }) => {
  for (const path of [
    '/core/rendering/high-end-glb-runtime.js',
    '/core/rendering/high-end-world-patches.js',
    '/core/rendering/high-end-ground-patches.js',
    '/core/rendering/high-end-terrain-patches.js'
  ]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should be available`).toBeTruthy();
  }
});
