'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import type { GalleryItem, RealizationUsluga } from '@/lib/types';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'realizacje';
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || '';

const USLUGI: readonly RealizationUsluga[] = ['chiptuning', 'dpf-egr', 'hamownia', 'inne'] as const;

export type RealizationFormState = { error?: string; ok?: boolean } | null;

/* ─────── helpers ─────── */

function readJsonField<T>(formData: FormData, field: string, fallback: T): T {
  const raw = formData.get(field);
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function sanitizeGallery(arr: unknown): GalleryItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((g): g is GalleryItem => g != null && typeof (g as GalleryItem).url === 'string')
    .map((g) => ({
      url: g.url,
      alt: typeof g.alt === 'string' ? g.alt : '',
      path: typeof g.path === 'string' ? g.path : undefined,
      width: typeof g.width === 'number' ? g.width : undefined,
      height: typeof g.height === 'number' ? g.height : undefined,
      size: typeof g.size === 'number' ? g.size : undefined,
      mime: typeof g.mime === 'string' ? g.mime : undefined,
      lqip: typeof g.lqip === 'string' ? g.lqip : undefined,
      blurhash: typeof g.blurhash === 'string' ? g.blurhash : undefined,
      variants: Array.isArray(g.variants) ? g.variants : undefined,
    }));
}

function readNum(v: FormDataEntryValue | null): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function readTags(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function buildPayload(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Tytuł jest wymagany.');

  const slugInput = String(formData.get('slug') ?? '').trim();
  const slug = slugify(slugInput || title);
  if (!slug) throw new Error('Slug jest wymagany.');

  const data = String(formData.get('data') ?? '').trim() || new Date().toISOString().slice(0, 10);

  // Cover może przyjść w dwóch wariantach:
  //  - cover_json (pełny GalleryItem - z backendu, z wariantami AVIF/WebP/JPG)
  //  - cover_url  (legacy - sam URL z bezpośredniego uploadu do Supabase)
  const coverJson = readJsonField<GalleryItem | null>(formData, 'cover_json', null);
  const coverUrlPlain = String(formData.get('cover_url') ?? '').trim();
  const cover: GalleryItem | null = coverJson ?? (coverUrlPlain ? { url: coverUrlPlain } : null);

  const uslugaRaw = String(formData.get('usluga') ?? '').trim();
  const usluga = (USLUGI as readonly string[]).includes(uslugaRaw) ? (uslugaRaw as RealizationUsluga) : null;

  return {
    title,
    slug,
    samochod:    String(formData.get('samochod')    ?? '').trim(),
    data,
    krotki_opis: String(formData.get('krotki_opis') ?? '').trim(),
    body:        String(formData.get('body')        ?? ''),

    // legacy: trzymamy stary URL kompatybilnie + nowy cover jako jsonb
    cover_url:   cover?.url ?? null,
    cover:       cover,
    gallery:     sanitizeGallery(readJsonField<unknown>(formData, 'gallery_json', [])),

    marka:       String(formData.get('marka')       ?? '').trim(),
    usluga,
    stage:       String(formData.get('stage')       ?? '').trim(),
    silnik:      String(formData.get('silnik')      ?? '').trim(),
    sterownik:   String(formData.get('sterownik')   ?? '').trim(),
    km0:         readNum(formData.get('km0')),
    km1:         readNum(formData.get('km1')),
    nm0:         readNum(formData.get('nm0')),
    nm1:         readNum(formData.get('nm1')),
    narzedzia:   readTags(formData.get('narzedzia')),

    published:   formData.get('published') === 'on' || formData.get('published') === 'true',
  };
}

/** "Fire-and-forget" - po zapisie realizacji prosi backend o trigger Netlify/Vercel build hooka. */
async function notifyRevalidate(slug: string): Promise<void> {
  if (!BACKEND_URL || !REVALIDATE_SECRET) return;
  try {
    await fetch(`${BACKEND_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': REVALIDATE_SECRET },
      body: JSON.stringify({ type: 'realization', slug }),
    });
  } catch {
    // Cisza - to tylko optymalizacja, brak rebuildu nie blokuje pracy admina.
  }
}

/* ─────── actions ─────── */

export async function createRealization(_prev: RealizationFormState, formData: FormData): Promise<RealizationFormState> {
  const supabase = await createClient();
  let payload;
  try { payload = buildPayload(formData); }
  catch (e) { return { error: (e as Error).message }; }

  const { data, error } = await supabase
    .from('realizations')
    .insert(payload)
    .select('id, slug')
    .single();

  if (error) return { error: error.message };

  void notifyRevalidate(data.slug);
  revalidatePath('/realizacje');
  revalidatePath('/');
  redirect(`/realizacje/${data.id}/edit?saved=1`);
}

export async function updateRealization(id: string, _prev: RealizationFormState, formData: FormData): Promise<RealizationFormState> {
  const supabase = await createClient();
  let payload;
  try { payload = buildPayload(formData); }
  catch (e) { return { error: (e as Error).message }; }

  const { error } = await supabase.from('realizations').update(payload).eq('id', id);
  if (error) return { error: error.message };

  void notifyRevalidate(payload.slug);
  revalidatePath('/realizacje');
  revalidatePath(`/realizacje/${id}/edit`);
  revalidatePath('/');
  return { ok: true };
}

export async function deleteRealization(id: string): Promise<void> {
  const supabase = await createClient();

  // Pobierz pliki, by usunąć z Storage
  const { data: row } = await supabase
    .from('realizations')
    .select('cover_url, cover, gallery, slug')
    .eq('id', id)
    .single();

  const paths = new Set<string>();
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const extractFromUrl = (url?: string | null) => {
    if (!url) return;
    const idx = url.indexOf(marker);
    if (idx >= 0) paths.add(url.slice(idx + marker.length));
  };
  const extractFromItem = (g?: GalleryItem | null) => {
    if (!g) return;
    if (g.path) paths.add(g.path);
    extractFromUrl(g.url);
    if (Array.isArray(g.variants)) for (const v of g.variants) {
      if (v.path) paths.add(v.path);
      extractFromUrl(v.url);
    }
  };

  extractFromUrl(row?.cover_url);
  extractFromItem(row?.cover as GalleryItem | null);
  if (Array.isArray(row?.gallery)) {
    for (const g of row!.gallery as GalleryItem[]) extractFromItem(g);
  }
  if (paths.size) {
    await supabase.storage.from(BUCKET).remove([...paths]);
  }

  const { error } = await supabase.from('realizations').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (row?.slug) void notifyRevalidate(row.slug);
  revalidatePath('/realizacje');
  revalidatePath('/');
  redirect('/realizacje?deleted=1');
}
