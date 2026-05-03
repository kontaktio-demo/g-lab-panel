'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bulkLeads,
  isBackendConfigured,
  leadsCsvBlobUrl,
  listLeads,
  patchLead,
  deleteLead,
} from '@/lib/backend';
import {
  type Lead,
  type LeadStatus,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from '@/lib/types';

const STATUS_TABS: { value: LeadStatus | ''; label: string }[] = [
  { value: '',            label: 'Wszystkie' },
  { value: 'new',         label: 'Nowe' },
  { value: 'in_progress', label: 'W toku' },
  { value: 'done',        label: 'Zrealizowane' },
  { value: 'spam',        label: 'Spam' },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:         'bg-accent/15 border-accent/40 text-accent',
  in_progress: 'bg-warning/15 border-warning/40 text-warning',
  done:        'bg-success/15 border-success/40 text-success',
  spam:        'bg-text-muted/15 border-border text-text-muted',
};

export default function LeadsClient() {
  const [items, setItems] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const backendOk = isBackendConfigured();

  const refresh = useCallback(async () => {
    if (!backendOk) {
      setError('Backend (NEXT_PUBLIC_BACKEND_URL) nie jest skonfigurowany. Skrzynka zapytań pobiera dane z backendu G-Lab.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await listLeads({ status, q, limit: 200 });
      setItems(res.items);
      setTotal(res.total);
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [backendOk, status, q]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Auto-refresh co 60s, żeby admin widział nowe zapytania bez F5.
  useEffect(() => {
    if (!backendOk) return;
    const t = setInterval(() => { void refresh(); }, 60_000);
    return () => clearInterval(t);
  }, [backendOk, refresh]);

  const counts = useMemo(() => {
    const c: Record<LeadStatus, number> & { all: number } = {
      all: items.length,
      new: 0, in_progress: 0, done: 0, spam: 0,
    };
    items.forEach((l) => { c[l.status]++; });
    return c;
  }, [items]);

  async function setStatusFor(ids: string[], next: LeadStatus) {
    if (!ids.length) return;
    try {
      if (ids.length === 1) await patchLead(ids[0], { status: next });
      else await bulkLeads('set-status', ids, next);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteOne(id: string) {
    if (!confirm('Usunąć zapytanie? Operacji nie można cofnąć.')) return;
    try { await deleteLead(id); await refresh(); }
    catch (e) { setError((e as Error).message); }
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Usunąć ${selected.size} zaznaczonych zapytań?`)) return;
    try { await bulkLeads('delete', [...selected]); await refresh(); }
    catch (e) { setError((e as Error).message); }
  }

  async function exportCsv() {
    try {
      const url = await leadsCsvBlobUrl();
      const a = document.createElement('a');
      a.href = url; a.download = `leads-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelAll() {
    setSelected((prev) => prev.size === items.length ? new Set() : new Set(items.map((l) => l.id)));
  }

  if (!backendOk) {
    return (
      <div className="card p-6 text-sm">
        <p className="font-semibold mb-2">Skrzynka zapytań nie jest skonfigurowana</p>
        <p className="text-text-muted">
          Ustaw zmienną środowiskową <code className="px-1 py-0.5 rounded bg-bg-elev-2">NEXT_PUBLIC_BACKEND_URL</code>{' '}
          (np. <code className="px-1 py-0.5 rounded bg-bg-elev-2">https://g-lab-backend.onrender.com</code>) i przeładuj panel.
          Zapytania z formularzy na stronie publicznej trafiają przez backend G-Lab do tabeli <code>leads</code> w Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="card p-3 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => setStatus(t.value)}
              className={[
                'text-sm px-3 py-1.5 rounded-md border whitespace-nowrap',
                status === t.value
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-bg-elev border-border text-text-muted hover:text-text',
              ].join(' ')}
            >
              {t.label}
              {t.value && <span className="ml-1.5 text-xs opacity-70">({counts[t.value]})</span>}
              {!t.value && <span className="ml-1.5 text-xs opacity-70">({counts.all})</span>}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po imieniu, e-mail, telefonie, treści…"
          className="field-input lg:w-72"
        />
        <button onClick={refresh} className="btn-secondary text-sm" disabled={loading}>
          {loading ? 'Wczytywanie…' : '↻ Odśwież'}
        </button>
        <button onClick={exportCsv} className="btn-ghost text-sm">⤓ Eksport CSV</button>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">{error}</div>
      )}

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 card p-3 flex flex-wrap gap-2 items-center bg-bg-elev/95 backdrop-blur">
          <span className="text-sm">Zaznaczono: <strong>{selected.size}</strong></span>
          <div className="flex-1" />
          <button onClick={() => setStatusFor([...selected], 'in_progress')} className="btn-ghost text-xs">→ W toku</button>
          <button onClick={() => setStatusFor([...selected], 'done')}        className="btn-ghost text-xs">→ Zrealizowane</button>
          <button onClick={() => setStatusFor([...selected], 'spam')}        className="btn-ghost text-xs">→ Spam</button>
          <button onClick={bulkDelete} className="btn-danger text-xs">Usuń</button>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-5xl mb-3">✉</div>
          <h2 className="text-xl font-bold mb-1">Brak zapytań</h2>
          <p className="text-text-muted">
            Tu pojawią się zapytania wysłane z formularzy na stronie publicznej (kontakt, wycena).
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elev-2 text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox" className="accent-accent"
                      checked={selected.size === items.length && items.length > 0}
                      onChange={toggleSelAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Źródło</th>
                  <th className="px-3 py-2 text-left">Kto</th>
                  <th className="px-3 py-2 text-left">Treść</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const isOpen = openId === l.id;
                  return (
                    <tr key={l.id} className="border-t border-border align-top">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox" className="accent-accent"
                          checked={selected.has(l.id)} onChange={() => toggleSel(l.id)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[l.status]}`}>
                          {LEAD_STATUS_LABELS[l.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-muted">{LEAD_SOURCE_LABELS[l.source] ?? l.source}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{l.name || '—'}</div>
                        {l.email && <div className="text-xs"><a href={`mailto:${l.email}`} className="hover:text-accent">{l.email}</a></div>}
                        {l.phone && <div className="text-xs"><a href={`tel:${l.phone}`} className="hover:text-accent">{l.phone}</a></div>}
                      </td>
                      <td className="px-3 py-3 max-w-[24rem]">
                        <div className={isOpen ? '' : 'line-clamp-2'}>{l.message || <span className="text-text-muted italic">brak treści</span>}</div>
                        {l.payload && Object.keys(l.payload).length > 0 && isOpen && (
                          <pre className="mt-2 text-[11px] bg-bg-elev-2 rounded p-2 overflow-x-auto">
{JSON.stringify(l.payload, null, 2)}
                          </pre>
                        )}
                        {(l.message && l.message.length > 120) || (l.payload && Object.keys(l.payload).length > 0) ? (
                          <button onClick={() => setOpenId(isOpen ? null : l.id)} className="text-xs text-accent hover:underline mt-1">
                            {isOpen ? 'zwiń' : 'rozwiń'}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-text-muted text-xs whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString('pl-PL')}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap gap-1 justify-end">
                          {l.status !== 'in_progress' && (
                            <button onClick={() => setStatusFor([l.id], 'in_progress')} className="btn-ghost text-xs">W toku</button>
                          )}
                          {l.status !== 'done' && (
                            <button onClick={() => setStatusFor([l.id], 'done')} className="btn-ghost text-xs">Zrobione</button>
                          )}
                          {l.status !== 'spam' && (
                            <button onClick={() => setStatusFor([l.id], 'spam')} className="btn-ghost text-xs">Spam</button>
                          )}
                          <button onClick={() => deleteOne(l.id)} className="btn-danger text-xs">Usuń</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-text-muted border-t border-border">
            Pokazano {items.length} / {total} zapytań · auto-odświeżanie co 60 s
          </div>
        </div>
      )}
    </div>
  );
}
