const { test, expect } = require('@playwright/test');

test('game shell loads from the organized browser test server', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Critter Extraction/i);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#app')).toBeAttached();
});

test('live runtime entry files are served', async ({ request }) => {
  for (const path of [
    '/core/game/game-core.js',
    '/core/rendering/model-library.js',
    '/core/boot/required-files.js',
    '/assets/loading/gameplay-reference.webp'
  ]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should be available`).toBeTruthy();
  }
});
