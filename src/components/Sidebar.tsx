'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const items = [
  { href: '/',           label: 'Pulpit',        icon: '◧' },
  { href: '/realizacje', label: 'Realizacje',    icon: '★' },
  { href: '/leads',      label: 'Skrzynka',      icon: '✉' },
  { href: '/katalog',    label: 'Katalog (CSV)', icon: '⊞' },
];

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

function NavList({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-1">
      {items.map((it) => {
        const active = it.href === '/'
          ? path === '/'
          : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors',
              active
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'text-text-muted hover:text-text hover:bg-bg-elev-2 border border-transparent',
            ].join(' ')}
          >
            <span className="w-5 text-center text-base">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
      {SITE_URL && (
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors
                     text-text-muted hover:text-text hover:bg-bg-elev-2 border border-transparent"
        >
          <span className="w-5 text-center text-base">↗</span>
          Strona publiczna
        </a>
      )}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="w-9 h-9 rounded-[10px] bg-grad-accent flex items-center justify-center font-bold text-white shadow-soft">
        G
      </div>
      <div>
        <div className="font-bold tracking-tight leading-none">G-Lab</div>
        <div className="text-[11px] uppercase tracking-widest text-text-muted mt-0.5">CMS</div>
      </div>
    </Link>
  );
}

function Footer() {
  return (
    <div className="p-3 border-t border-border text-[11px] text-text-muted">
      <div className="px-3 py-2">
        v1.1 · <a className="hover:text-accent" href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a> · <a className="hover:text-accent" href="https://render.com" target="_blank" rel="noreferrer">Render</a>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => { setOpen(false); }, [path]);

  // Lock body scroll while the mobile drawer is open + close on Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar (only visible below md) */}
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-elev/85 backdrop-blur-md">
        <button
          type="button"
          aria-label="Otwórz menu"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          onClick={() => setOpen(true)}
          className="w-10 h-10 inline-flex items-center justify-center rounded-[10px] border border-border bg-bg-elev-2 text-text hover:border-accent hover:text-accent transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Brand />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-border bg-bg-elev/60 backdrop-blur-sm">
        <div className="px-6 py-6 border-b border-border">
          <Brand />
        </div>
        <NavList path={path} />
        <Footer />
      </aside>

      {/* Mobile drawer */}
      <div
        className={[
          'md:hidden fixed inset-0 z-50 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Zamknij menu"
          onClick={() => setOpen(false)}
          className="absolute inset-0 w-full h-full bg-black/60"
        />
        <aside
          id="admin-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={[
            'absolute top-0 left-0 h-full w-[80%] max-w-xs flex flex-col',
            'border-r border-border bg-bg-elev shadow-elev',
            'transition-transform duration-200 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Brand />
            <button
              type="button"
              aria-label="Zamknij menu"
              onClick={() => setOpen(false)}
              className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] border border-border bg-bg-elev-2 text-text-muted hover:text-text hover:border-accent transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <NavList path={path} onNavigate={() => setOpen(false)} />
          <Footer />
        </aside>
      </div>
    </>
  );
}
