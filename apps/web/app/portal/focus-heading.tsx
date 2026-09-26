'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export default function FocusHeading() {
  const path = usePathname();
  useEffect(() => {
    const id = window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('section');
    const section = id === 'd' || id === 'i' ? document.getElementById(id) : null;
    (section ?? document.querySelector<HTMLElement>('main h1'))?.focus();
  }, [path]);
  return null;
}
