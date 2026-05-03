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
  return !!BACKEND_URL;
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
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', opts.folder);
  if (opts.alt) fd.append('alt', opts.alt);
  return api<GalleryItem>('/api/uploads/image', { method: 'POST', body: fd });
}

/** Usuwa wszystkie pliki (i warianty) na podstawie listy ścieżek z `path` w GalleryItem. */
export async function deleteImage(paths: string[]): Promise<{ ok: boolean; removed: number }> {
  if (!paths.length) return { ok: true, removed: 0 };
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
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return api(`/api/leads?${qs.toString()}`, { method: 'GET' });
}

export async function patchLead(id: string, body: { status: LeadStatus }): Promise<Lead> {
  return api(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteLead(id: string): Promise<{ ok: boolean }> {
  return api(`/api/leads/${id}`, { method: 'DELETE' });
}

export async function bulkLeads(action: 'delete' | 'set-status', ids: string[], status?: LeadStatus): Promise<{ ok: boolean; affected: number }> {
  return api('/api/leads/bulk', { method: 'POST', body: JSON.stringify({ action, ids, status }) });
}

/** URL eksportu CSV (przeglądarka pobiera bezpośrednio - z dołączonym tokenem). */
export async function leadsCsvBlobUrl(): Promise<string> {
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
  return api('/api/stats', { method: 'GET' });
}
