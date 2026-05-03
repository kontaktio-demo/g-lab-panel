/**
 * Cienki klient HTTP do backendu G-Lab (Render).
 * Używany po stronie panelu (browser) do uploadu obrazów oraz akcji na leads.
 *
 * Konfiguracja:
 *   NEXT_PUBLIC_BACKEND_URL = https://g-lab-backend.onrender.com
 *
 * Token Supabase Auth (JWT) dołączamy automatycznie - bierzemy go z aktualnej
 * sesji (createClient() z @/lib/supabase/client).
 */
import { createClient } from '@/lib/supabase/client';
import { demoStore, isDemoMode } from '@/lib/demo';
import type { GalleryItem, Lead, LeadStatus } from '@/lib/types';

export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export class BackendError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isBackendConfigured(): boolean {
  // W trybie demo udajemy, że backend działa — leady i statystyki idą z lokalnych danych.
  return isDemoMode() || !!BACKEND_URL;
}

async function getToken(): Promise<string | null> {
  const sb = createClient();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

async function api<T>(path: string, init: RequestInit = {}, opts: { auth?: boolean } = {}): Promise<T> {
  if (!BACKEND_URL) throw new BackendError('NEXT_PUBLIC_BACKEND_URL nie jest ustawione.', 0);
  const headers = new Headers(init.headers || {});
  if (opts.auth !== false) {
    const token = await getToken();
    if (!token) throw new BackendError('Sesja wygasła - zaloguj się ponownie.', 401);
    headers.set('authorization', `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: string } } | null)?.error;
    throw new BackendError(err?.message || res.statusText || `HTTP ${res.status}`, res.status, err?.code);
  }
  return (json as T) ?? (undefined as unknown as T);
}

/* ──────── Image uploads ──────── */

/** Upload pojedynczego obrazu - backend sam konwertuje do AVIF/WebP/JPG (3 szerokości). */
export async function uploadImage(file: File, opts: { folder: 'cover' | 'gallery' | 'misc'; alt?: string }): Promise<GalleryItem> {
  if (isDemoMode()) {
    // Tryb demo — generujemy lokalny URL za pomocą object URL i udajemy odpowiedź backendu.
    const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : `data:${file.type || 'image/jpeg'};base64,`;
    return {
      url,
      alt: opts.alt || file.name,
      path: `demo/${opts.folder}/${file.name}`,
      width: 800, height: 500, size: file.size, mime: file.type,
    };
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', opts.folder);
  if (opts.alt) fd.append('alt', opts.alt);
  return api<GalleryItem>('/api/uploads/image', { method: 'POST', body: fd });
}

/** Usuwa wszystkie pliki (i warianty) na podstawie listy ścieżek z `path` w GalleryItem. */
export async function deleteImage(paths: string[]): Promise<{ ok: boolean; removed: number }> {
  if (!paths.length) return { ok: true, removed: 0 };
  if (isDemoMode()) return { ok: true, removed: paths.length };
  return api<{ ok: boolean; removed: number }>('/api/uploads/image', {
    method: 'DELETE',
    body: JSON.stringify({ paths }),
  });
}

/* ──────── Leads ──────── */

export async function listLeads(params: {
  status?: LeadStatus | '';
  source?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: Lead[]; total: number; limit: number; offset: number }> {
  if (isDemoMode()) {
    const all = demoStore.leads;
    const q = (params.q ?? '').trim().toLowerCase();
    const filtered = all.filter((l) => {
      if (params.status && l.status !== params.status) return false;
      if (params.source && l.source !== params.source) return false;
      if (q) {
        const hay = `${l.name ?? ''} ${l.email ?? ''} ${l.phone ?? ''} ${l.message ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const limit = params.limit ?? 200;
    const offset = params.offset ?? 0;
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return api(`/api/leads?${qs.toString()}`, { method: 'GET' });
}

export async function patchLead(id: string, body: { status: LeadStatus }): Promise<Lead> {
  if (isDemoMode()) {
    const lead = demoStore.leads.find((l) => l.id === id);
    if (lead) {
      lead.status = body.status;
      lead.updated_at = new Date().toISOString();
    }
    return lead ?? ({ id } as Lead);
  }
  return api(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteLead(id: string): Promise<{ ok: boolean }> {
  if (isDemoMode()) {
    const i = demoStore.leads.findIndex((l) => l.id === id);
    if (i >= 0) demoStore.leads.splice(i, 1);
    return { ok: true };
  }
  return api(`/api/leads/${id}`, { method: 'DELETE' });
}

export async function bulkLeads(action: 'delete' | 'set-status', ids: string[], status?: LeadStatus): Promise<{ ok: boolean; affected: number }> {
  if (isDemoMode()) {
    let affected = 0;
    if (action === 'delete') {
      for (const id of ids) {
        const i = demoStore.leads.findIndex((l) => l.id === id);
        if (i >= 0) { demoStore.leads.splice(i, 1); affected++; }
      }
    } else if (action === 'set-status' && status) {
      for (const id of ids) {
        const lead = demoStore.leads.find((l) => l.id === id);
        if (lead) { lead.status = status; lead.updated_at = new Date().toISOString(); affected++; }
      }
    }
    return { ok: true, affected };
  }
  return api('/api/leads/bulk', { method: 'POST', body: JSON.stringify({ action, ids, status }) });
}

/** URL eksportu CSV (przeglądarka pobiera bezpośrednio - z dołączonym tokenem). */
export async function leadsCsvBlobUrl(): Promise<string> {
  if (isDemoMode()) {
    const head = ['id','source','status','name','email','phone','message','created_at'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = demoStore.leads.map((l) => head.map((k) => esc((l as unknown as Record<string, unknown>)[k])).join(','));
    const csv = [head.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    return URL.createObjectURL(blob);
  }
  const token = await getToken();
  if (!token) throw new BackendError('Sesja wygasła.', 401);
  const res = await fetch(`${BACKEND_URL}/api/leads/export.csv`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new BackendError(`Eksport nie powiódł się (HTTP ${res.status}).`, res.status);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/* ──────── Stats ──────── */

export type DashboardStats = {
  realizations: { published: number; drafts: number; last_updated: string | null };
  catalog: { total: number };
  leads: { total: number; new: number; this_week: number };
};

export async function getStats(): Promise<DashboardStats> {
  if (isDemoMode()) {
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;
    return {
      realizations: {
        published: demoStore.realizations.filter((r) => r.published).length,
        drafts: demoStore.realizations.filter((r) => !r.published).length,
        last_updated: demoStore.realizations[0]?.updated_at ?? null,
      },
      catalog: { total: demoStore.catalogCars.length },
      leads: {
        total: demoStore.leads.length,
        new: demoStore.leads.filter((l) => l.status === 'new').length,
        this_week: demoStore.leads.filter((l) => new Date(l.created_at).getTime() >= sevenDaysAgo).length,
      },
    };
  }
  return api('/api/stats', { method: 'GET' });
}
