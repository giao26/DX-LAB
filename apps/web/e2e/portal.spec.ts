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
for (const route of ['/portal/h','/portal/resources']) test(`signed-out ${route} preserves post-login destination`,async({page})=>{
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
