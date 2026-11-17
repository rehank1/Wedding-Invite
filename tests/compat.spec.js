// Cross-browser smoke: Firefox, WebKit (iPhone), Chromium (Android).
import { expect } from '@playwright/test';
import { test, watchConsole, personal } from './helpers.js';

test('invite opens, renders, turns the watch and seals a dua', async ({ page }) => {
  const c = watchConsole(page);
  await page.goto(await personal('Guest'));
  await page.locator('#seal').click();
  await expect(page.locator('html')).toHaveClass(/opened/, { timeout: 12000 });
  await expect(page.locator('#dear')).toHaveText('Dear Guest,');
  await expect(page.locator('.jewel').first()).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.locator('#seal-btn').click();
  await expect(page.locator('#dua-sent')).toContainText('Sealed and delivered');
  c.assertClean(); // before the screenshot: Playwright injects a caret-hiding <style> that our CSP (correctly) refuses
  await page.screenshot({ path: `reports/screenshots/compat-${test.info().project.name}.png` });
});

test('tool pages load cleanly', async ({ page }) => {
  const c = watchConsole(page);
  for (const p of ['./create/', './admin/', './dashboard/']) {
    await page.goto(p);
    await expect(page.locator('main h1')).toBeVisible();
  }
  c.assertClean();
});
