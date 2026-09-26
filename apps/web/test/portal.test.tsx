import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
vi.mock('../lib/portal', () => ({ requirePortal: vi.fn(async () => ({ csrf:'test' })) }));
import PortalPage from '../app/portal/page';
import DashboardPage from '../app/portal/dashboard/page';
import HumanPage from '../app/portal/h/page';
import { requirePortal } from '../lib/portal';
test('four full tile links in H P D I order; D and I share dashboard', async () => {
  render(await PortalPage());
  expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/portal/h','/portal/p','/portal/dashboard?section=d#d','/portal/dashboard?section=i#i']);
});
test('dashboard rechecks director permission at direct destination', async () => {
  render(await DashboardPage({}));
  expect(requirePortal).toHaveBeenCalledWith('/portal/dashboard', true);
  expect(screen.getByText('Báo cáo và KPI chưa được triển khai.')).toBeVisible();
});
for (const section of ['d','i']) test(`dashboard preserves ${section} through its login guard`, async () => {
  render(await DashboardPage({searchParams:Promise.resolve({section})}));
  expect(requirePortal).toHaveBeenCalledWith(`/portal/dashboard?section=${section}#${section}`,true);
});
test('H links to the existing authenticated Odoo workspace', async () => {
  render(await HumanPage());
  expect(screen.getByRole('link',{name:'Mở Odoo'})).toHaveAttribute('href','/dx/tickets/workspace');
});
