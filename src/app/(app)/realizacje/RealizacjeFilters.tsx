'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type Status = '' | 'published' | 'draft';

export default function RealizacjeFilters({ initialQ, initialStatus }: { initialQ: string; initialStatus: Status }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [, startTransition] = useTransition();

  function update(next: { q?: string; status?: Status }) {
    const sp = new URLSearchParams(params.toString());
    const nq = next.q ?? q;
    const ns = next.status ?? status;
    if (nq) sp.set('q', nq); else sp.delete('q');
    if (ns) sp.set('status', ns); else sp.delete('status');
    sp.delete('deleted');
    startTransition(() => router.replace(`/realizacje${sp.toString() ? '?' + sp.toString() : ''}`));
  }

  return (
    <div className="card p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); update({ q: e.target.value }); }}
        placeholder="Szukaj po tytule, marce, samochodzie, slug…"
        className="field-input flex-1 min-w-0"
      />
      <div className="flex gap-2">
        {([
          { value: '' as Status,          label: 'Wszystko' },
          { value: 'published' as Status, label: 'Opublikowane' },
          { value: 'draft' as Status,     label: 'Szkice' },
        ]).map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => { setStatus(o.value); update({ status: o.value }); }}
            className={[
              'text-sm px-3 py-2 rounded-md border whitespace-nowrap',
              status === o.value
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-bg-elev border-border text-text-muted hover:text-text',
            ].join(' ')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
