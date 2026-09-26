'use client';
import { useEffect } from 'react';
// Browser history and the App Router may restore an earlier tree without asking
// the server. Revalidate private destinations through a full request first.
export default function SessionHistoryGuard() {
  useEffect(() => {
    const privatePage = () => window.location.pathname.startsWith('/portal');
    const restore = () => { if (privatePage()) { document.body.style.visibility='hidden'; window.location.reload(); } };
    const show = (event: PageTransitionEvent) => { if (event.persisted) restore(); };
    const hide = () => { if (privatePage()) document.body.style.visibility='hidden'; };
    window.addEventListener('popstate',restore); window.addEventListener('pageshow',show); window.addEventListener('pagehide',hide);
    return () => { window.removeEventListener('popstate',restore); window.removeEventListener('pageshow',show); window.removeEventListener('pagehide',hide); };
  }, []);
  return null;
}
