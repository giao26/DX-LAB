import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('form dùng được bằng bàn phím và không có lỗi truy cập nghiêm trọng', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi yêu cầu' })).toBeVisible();
});

test('không cuộn ngang tại 320 CSS px và zoom 200%', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
});

test('gửi form qua đúng BFF và focus xác nhận', async ({ page }) => {
  let forwardedBody: string | null | undefined;
  let forwardedKey: string | undefined;
  await page.route('**/bff/tickets', async (route) => {
    forwardedBody = route.request().postData();
    forwardedKey = route.request().headers()['idempotency-key'];
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
      code: 'TCK-2026-000001', status: 'WAITING', receivedAt: '2026-09-23T00:00:00Z',
    }) });
  });
  await page.goto('/');
  await page.getByLabel(/Họ và tên/).fill('Nguyễn Văn A');
  await page.getByLabel(/Số điện thoại/).fill('0912345678');
  await page.getByLabel(/Email/).fill('a@example.com');
  await page.getByLabel(/Bạn cần hỗ trợ/).selectOption('Bảo hành');
  await page.getByLabel(/Nội dung chi tiết/).fill('Thiết bị cần được kiểm tra bảo hành.');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  const status = page.getByRole('status');
  await expect(status).toBeFocused();
  await expect(status).toContainText('TCK-2026-000001');
  expect(forwardedBody).toContain('Bảo hành');
  expect(forwardedKey).toMatch(/^[0-9a-f-]{36}$/);
});

test('gửi một PDF bằng multipart và vẫn nhận xác nhận', async ({ page }) => {
  let multipartBody: string | null = null;
  await page.route('**/bff/tickets', async (route) => {
    multipartBody = route.request().postData();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
      code: 'TCK-2026-000002', status: 'WAITING', receivedAt: '2026-09-25T00:00:00Z',
    }) });
  });
  await page.goto('/');
  await page.getByLabel(/Họ và tên/).fill('Nguyễn Văn A');
  await page.getByLabel(/Số điện thoại/).fill('0912345678');
  await page.getByLabel(/Email/).fill('a@example.com');
  await page.getByLabel(/Bạn cần hỗ trợ/).selectOption('Bảo hành');
  await page.getByLabel(/Nội dung chi tiết/).fill('Thiết bị cần được kiểm tra bảo hành.');
  await page.getByLabel(/Tệp minh họa/).setInputFiles({
    name: 'bang-chung.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  });
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  await expect(page.getByRole('status')).toContainText('TCK-2026-000002');
  expect(multipartBody).toContain('filename="bang-chung.pdf"');
  expect(multipartBody).toContain('Content-Type: application/pdf');
});
