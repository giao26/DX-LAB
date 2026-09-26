import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
vi.mock('next/navigation',()=>({usePathname:()=>'/portal/dashboard'}));
import FocusHeading from '../app/portal/focus-heading';
for(const hash of ['#]','#unknown','#d','#i']) test(`focus safe for ${hash}`,()=>{
  window.history.replaceState(null,'',`/portal/dashboard${hash}`);
  render(<main><FocusHeading/><h1 tabIndex={-1}>Dashboard</h1><section id="d" tabIndex={-1}>D</section><section id="i" tabIndex={-1}>I</section></main>);
  expect(hash==='#d'||hash==='#i'?document.getElementById(hash.slice(1)):screen.getByRole('heading')).toHaveFocus();
});
