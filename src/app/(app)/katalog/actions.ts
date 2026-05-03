'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { CATALOG_CSV_HEADERS, type CsvImportRow } from '@/lib/types';

const NUMERIC = new Set([
  'moc_kw_seryjna','moc_km_seryjna','moc_kw_tuning','moc_km_tuning','moment_seryjny','moment_tuning',
]);

export type ImportResult = { ok: true; inserted: number } | { ok: false; error: string };

function normalizeRow(raw: Record<string, string>): CsvImportRow {
  const get = (k: string) => (raw[k] ?? '').trim();
  const numOrNull = (k: string) => {
    const v = get(k);
    if (v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const marka     = get('marka');
  const model     = get('model');
  const generacja = get('generacja');
  const silnik    = get('silnik');
  const slug = slugify(get('slug') || [marka, model, generacja, silnik].filter(Boolean).join(' '));
  return {
    marka, model, generacja,
    rok_od: get('rok_od'), rok_do: get('rok_do'),
    silnik,
    moc_kw_seryjna: numOrNull('moc_kw_seryjna'),
    moc_km_seryjna: numOrNull('moc_km_seryjna'),
    moc_kw_tuning:  numOrNull('moc_kw_tuning'),
    moc_km_tuning:  numOrNull('moc_km_tuning'),
    moment_seryjny: numOrNull('moment_seryjny'),
    moment_tuning:  numOrNull('moment_tuning'),
    sterownik: get('sterownik'),
    slug,
  };
}

export async function importCatalog(formData: FormData): Promise<ImportResult> {
  // Wymagaj zalogowanego użytkownika (RLS i tak by zablokowała, ale walidujemy wyżej).
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: 'Brak autoryzacji.' };

  const file = formData.get('file');
  const mode = (formData.get('mode') as string) || 'replace'; // 'replace' | 'upsert'
  if (!(file instanceof File)) return { ok: false, error: 'Brak pliku CSV.' };

  let csvText = await file.text();
  // BOM
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

  // Parsowanie po stronie serwera (papaparse z CDN nie potrzebny, użyjemy prostego parsera).
  const Papa = (await import('papaparse')).default;
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    const e = parsed.errors[0];
    return { ok: false, error: `Błąd CSV w wierszu ${e.row}: ${e.message}` };
  }

  // Walidacja nagłówków
  const headers = parsed.meta.fields ?? [];
  const required = ['marka','silnik']; // minimum sensowne
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) return { ok: false, error: `CSV nie zawiera wymaganych kolumn: ${missing.join(', ')}` };

  const rows = parsed.data
    .map(normalizeRow)
    .filter((r) => r.marka && r.silnik && r.slug);

  if (!rows.length) return { ok: false, error: 'CSV nie zawiera ważnych wierszy (brak marka/silnik).' };

  // Deduplikacja po slug w obrębie pliku
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true)));

  // Service-role client - omija RLS, by przyspieszyć bulk insert
  const admin = createServiceClient();

  if (mode === 'replace') {
    const { error: delErr } = await admin.from('catalog_cars').delete().neq('id', 0);
    if (delErr) return { ok: false, error: `Błąd czyszczenia: ${delErr.message}` };
  }

  // Wstawianie w paczkach po 500
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { error } = await admin.from('catalog_cars').upsert(chunk, { onConflict: 'slug' });
    if (error) return { ok: false, error: `Błąd zapisu (paczka ${i / chunkSize + 1}): ${error.message}` };
    inserted += chunk.length;
  }

  await admin.from('csv_imports').insert({
    filename: file.name, rows_count: inserted, mode, created_by: user.id,
  });

  revalidatePath('/katalog');
  revalidatePath('/');
  return { ok: true, inserted };
}

export const __headers = CATALOG_CSV_HEADERS;
