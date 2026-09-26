import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test.describe.configure({ mode:'serial' });
async function login(page: import('@playwright/test').Page, user='employee', route='/portal') {
  await page.goto(route); await page.getByRole('link',{name:user,exact:true}).click();
}
test('guest public form grants no internal access; callback cookies and direct destinations', async ({page,context}) => {
  await page.goto('/'); await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await page.goto('/portal/resources'); await expect(page).toHaveURL(/3101.*auth/); await expect(page.getByText('Resources — Tri thức công ty')).toHaveCount(0);
  await page.getByRole('link',{name:'employee',exact:true}).click();
  const cookie=(await context.cookies()).find(cookie => cookie.name==='__Host-dx-session')!;
  expect(cookie.secure).toBe(true); expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe('Lax');
  await page.goto('/portal/dashboard'); await expect(page.getByRole('heading',{name:'Truy cập không khả dụng'})).toBeVisible();
});
test('tiles keyboard/reflow/accessibility, H P return, logout Back rechecks', async ({page}) => {
  await login(page);
  const links = page.locator('.portal-tile'); await expect(links).toHaveCount(4);
  await expect(page.getByRole('heading',{name:'Không gian làm việc'})).toBeFocused();
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom='2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom=''; });
  await links.first().focus(); await expect(links.first()).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.getByRole('heading',{name:'H — Con người'})).toBeFocused();
  await page.getByRole('link',{name:'← Quay lại Portal'}).click(); await links.nth(1).click(); await expect(page.getByRole('heading',{name:'P — Tiến trình'})).toBeVisible();
  await page.getByRole('link',{name:'← Quay lại Portal'}).click();
  const accessibility=await new AxeBuilder({page}).analyze(); expect(accessibility.violations).toEqual([]);
  await page.getByRole('button',{name:'Đăng xuất'}).click(); await expect(page).toHaveURL('http://localhost:3100/');
  expect((await page.context().cookies()).find(cookie=>cookie.name==='__Host-dx-session')).toBeUndefined();
  await page.goBack(); await expect(page).toHaveURL(/3101.*auth/);
});
test('director D I share sections; revoke and P outage are denied', async ({page,request}) => {
  await login(page,'director');
  await page.setViewportSize({width:1280,height:900}); await page.screenshot({path:join(tmpdir(),'dx-portal-director-desktop.png'),fullPage:true});
  await page.setViewportSize({width:320,height:800}); await page.screenshot({path:join(tmpdir(),'dx-portal-director-mobile.png'),fullPage:true});
  await page.locator('.portal-tile').nth(2).click(); await expect(page.locator('#d')).toBeFocused();
  await page.getByRole('link',{name:'← Quay lại Portal'}).click(); await page.locator('.portal-tile').nth(3).click(); await expect(page.locator('#i')).toBeFocused();
  await request.get('http://localhost:3101/control?sub=director&role=employee');
  await page.reload(); await expect(page.getByRole('heading',{name:'Truy cập không khả dụng'})).toBeVisible();
  await request.get('http://localhost:3101/control?sub=director&role=director&offline=true');
  await page.goto('/portal'); await expect(page.getByText('Dịch vụ xác thực không khả dụng. Vui lòng thử lại.')).toBeVisible();
  await request.get('http://localhost:3101/control?sub=director&role=director');
});
for (const user of ['outsider','disabled']) test(`${user} callback denies membership`, async ({page}) => { await login(page,user); await expect(page.getByRole('heading',{name:'Truy cập không khả dụng'})).toBeVisible(); });
test('department head membership does not grant Dashboard', async ({page}) => { await login(page,'department_head'); await page.goto('/portal/dashboard'); await expect(page.getByRole('heading',{name:'Truy cập không khả dụng'})).toBeVisible(); });
for (const route of ['/portal/h','/portal/p','/portal/resources']) test(`signed-out ${route} preserves post-login destination`,async({page})=>{
  await login(page,'employee',route);await expect(page).toHaveURL(`http://localhost:3100${route}`);
});
for (const section of ['d','i']) test(`signed-out Dashboard ${section} preserves selected section`,async({page})=>{
  await login(page,'director',`/portal/dashboard?section=${section}#${section}`);
  await expect(page).toHaveURL(`http://localhost:3100/portal/dashboard?section=${section}#${section}`);
  await expect(page.locator(`#${section}`)).toBeFocused();
});
for (const hash of ['#]','#unknown']) test(`Dashboard heading fallback for ${hash}`,async({page})=>{
  await login(page,'director'); await page.goto(`/portal/dashboard${hash}`);
  await expect(page.getByRole('heading',{name:'Dashboard Giám đốc'})).toBeFocused();
});

test('Resources library: navigation from H, search, filter, detail, draft rejection and WCAG', async ({page}) => {
  await login(page, 'employee');
  await page.goto('/portal/h');
  await page.getByRole('link', { name: 'Mở Resources' }).click();
  await expect(page).toHaveURL('http://localhost:3100/portal/resources');
  await expect(page.getByRole('heading', { level: 1, name: 'Resources — Tri thức công ty' })).toBeVisible();

  // Initial list checks
  await expect(page.getByText('SOP-TKT-001')).toBeVisible();
  await expect(page.getByText('Quy trình tiếp nhận và phân công ticket')).toBeVisible();
  await expect(page.getByText('FAQ-GEN-001')).toBeVisible();

  // Filter by type: SOP
  await page.getByRole('link', { name: 'SOP (Quy trình)' }).click();
  await expect(page).toHaveURL(/type=sop/);
  await expect(page.getByText('SOP-TKT-001')).toBeVisible();
  await expect(page.getByText('FAQ-GEN-001')).toHaveCount(0);

  // Filter by type: FAQ
  await page.getByRole('link', { name: 'FAQ (Hỏi đáp)' }).click();
  await expect(page).toHaveURL(/type=faq/);
  await expect(page.getByText('FAQ-GEN-001')).toBeVisible();
  await expect(page.getByText('SOP-TKT-001')).toHaveCount(0);

  // Reset to All
  await page.getByRole('link', { name: 'Tất cả' }).click();
  await expect(page.getByText('SOP-TKT-001')).toBeVisible();
  await expect(page.getByText('FAQ-GEN-001')).toBeVisible();

  // Search keyword
  await page.getByRole('searchbox', { name: 'Tìm kiếm tài liệu' }).fill('bảo hành');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page).toHaveURL(/search=b%E1%BA%A3o\+h%C3%A0nh|search=b%E1%BA%A3o%20h%C3%A0nh/);
  await expect(page.getByText('SOP-WAR-001')).toBeVisible();
  await expect(page.getByText('SOP-TKT-001')).toHaveCount(0);

  // Search with no results -> empty state
  await page.getByRole('searchbox', { name: 'Tìm kiếm tài liệu' }).fill('khongtontai999');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Không tìm thấy tài liệu phù hợp' })).toBeVisible();
  await page.getByRole('link', { name: 'Xóa bộ lọc' }).click();
  await expect(page.getByText('SOP-TKT-001')).toBeVisible();

  // View detail
  await page.getByRole('link', { name: 'Quy trình tiếp nhận và phân công ticket' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quy trình tiếp nhận và phân công ticket' })).toBeVisible();
  await expect(page.getByText('Chi tiết quy trình tiếp nhận và phân công ticket.')).toBeVisible();

  // Back to resources
  await page.getByRole('link', { name: '← Quay lại Thư viện Resources' }).first().click();
  await expect(page).toHaveURL('http://localhost:3100/portal/resources');

  // Direct access to draft ID is rejected
  await page.goto('/portal/resources/60000000-0000-4000-8000-000000000004');
  await expect(page.getByRole('heading', { level: 1, name: 'Tài liệu không khả dụng' })).toBeVisible();
  await expect(page.getByText('Không tìm thấy tài liệu')).toBeVisible();

  // Accessibility and reflow test at 320px
  await page.goto('/portal/resources');
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });

  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
});

test('Story 2.3: H/P scope, lỗi cô lập, retry và WCAG', async ({ page, request }) => {
  await login(page, 'employee');
  await page.goto('/portal/h');
  await expect(page.getByRole('heading', { level: 1, name: 'H — Con người' })).toBeFocused();
  await expect(page.getByText('Chào mừng đến DX-OS – hệ thống quản lý vận hành số')).toBeVisible();
  await expect(page.getByText('Lịch bảo trì hệ thống tháng 10/2026')).toBeVisible();
  await expect(page.getByText('Quy trình onboarding nhân viên mới cập nhật')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Mở Resources' })).toHaveAttribute('href', '/portal/resources');
  await expect(page.getByRole('link', { name: 'Mở Odoo' })).toHaveAttribute('href', '/dx/tickets/workspace');

  await request.get('http://localhost:3101/control?sub=employee&role=employee&announcements_offline=true');
  await page.reload();
  await expect(page.getByText('Không thể tải thông báo.', { exact: true })).toHaveAttribute('role', 'alert');
  await expect(page.getByRole('link', { name: 'Mở Resources' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở Odoo' })).toBeVisible();
  await request.get('http://localhost:3101/control?sub=employee&role=employee&announcements_offline=false');
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Chào mừng đến DX-OS – hệ thống quản lý vận hành số')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });

  await page.goto('/portal/p');
  await expect(page.getByRole('heading', { level: 2, name: 'DX-Ticket' })).toBeVisible();
  await expect(page.getByText('Đang hoạt động')).toBeVisible();
  await expect(page.getByText('Các quy trình khác sẽ sớm ra mắt.')).toBeVisible();
  const ticketLink = page.getByRole('link', { name: /Mở biểu mẫu DX-Ticket/ });
  await expect(ticketLink).toHaveAttribute('href', '/');
  await ticketLink.click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await expect(page.getByRole('heading', { level: 1, name: 'Tạo yêu cầu hỗ trợ' })).toBeVisible();
  await expect(page.locator('a[href^="/portal"]')).toHaveCount(0);
  await page.goto('/portal/p');

  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('Story 2.3: group_lead là membership nội bộ hợp lệ', async ({ page }) => {
  await login(page, 'group_lead', '/portal/h');
  await expect(page.getByRole('heading', { level: 1, name: 'H — Con người' })).toBeVisible();
  await expect(page.getByText('Lịch bảo trì hệ thống tháng 10/2026')).toBeVisible();
});

