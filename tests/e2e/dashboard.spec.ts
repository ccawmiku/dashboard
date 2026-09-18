import { test, expect } from '@playwright/test';
import {
  fixture,
  previewInstance,
} from '../../widgets/digital-clock/src/fixtures';
import { clockManifest } from '../../widgets/digital-clock/src/manifest';
import { clockPoint } from '../../packages/contracts/src/index';
test('fixed square clock renders and advances independently of local date', async ({
  page,
}) => {
  await page.goto('/?preview=clock&state=good');
  const time = page.getByTestId('clock-time');
  await expect(time).toContainText('09:41');
  const first = await time.textContent();
  await expect.poll(() => time.textContent()).not.toBe(first);
  const box = await page
    .getByRole('article', { name: '数字时钟' })
    .boundingBox();
  expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
  await page.screenshot({
    path: 'test-results/clock-desktop.png',
    fullPage: true,
  });
});
test('mobile layout fits 320px and communicates all data qualities', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const [state, label] of [
    ['good', '已同步'],
    ['stale', '同步过期'],
    ['error', '同步失败'],
    ['unavailable', '正在同步'],
  ]) {
    await page.goto(`/?preview=clock&state=${state}`);
    await expect(page.getByRole('article').getByRole('status')).toHaveText(
      label,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  }
  await page.screenshot({
    path: 'test-results/clock-mobile.png',
    fullPage: true,
  });
});
test('uses server epoch and reports offline without discarding time', async ({
  page,
  context,
}) => {
  await page.route('**/api/v1/events', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: ready\ndata: {}\n\n',
    }),
  );
  await page.route('**/api/v1/snapshot', (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        board: { id: 'home', name: '我的看板', widgets: [previewInstance] },
        widgets: [clockManifest],
        points: [{ definition: clockPoint, observation: fixture('good') }],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByTestId('clock-time')).toContainText('09:41');
  await context.setOffline(true);
  await expect(page.getByRole('article').getByRole('status')).toHaveText(
    '连接中断',
  );
  await expect(page.getByTestId('clock-time')).not.toContainText('--');
  await context.setOffline(false);
  await expect(page.getByRole('article').getByRole('status')).toHaveText(
    '已同步',
  );
});
