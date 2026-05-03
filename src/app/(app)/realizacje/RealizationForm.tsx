'use client';

import { useEffect, useId, useRef, useState, useTransition, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { GalleryItem, Realization, RealizationUsluga } from '@/lib/types';
import { isBackendConfigured, uploadImage } from '@/lib/backend';
import {
  createRealization,
  updateRealization,
  deleteRealization,
  type RealizationFormState,
} from './actions';
import { slugify } from '@/lib/utils';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'realizacje';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

const USLUGI: { value: RealizationUsluga | ''; label: string }[] = [
  { value: '',           label: '— wybierz —' },
  { value: 'chiptuning', label: 'Chiptuning' },
  { value: 'dpf-egr',    label: 'DPF / EGR' },
  { value: 'hamownia',   label: 'Hamownia' },
  { value: 'inne',       label: 'Inne' },
];

type Props = { initial?: Realization };

export default function RealizationForm({ initial }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendingDelete, startDelete] = useTransition();

  const isEdit = Boolean(initial);

  const action = isEdit
    ? updateRealization.bind(null, initial!.id)
    : createRealization;

  const [state, formAction] = useActionState<RealizationFormState, FormData>(action, null);

  const [title, setTitle]             = useState(initial?.title ?? '');
  const [slug, setSlug]               = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [samochod, setSamochod]       = useState(initial?.samochod ?? '');
  const [data, setData]               = useState(initial?.data ?? new Date().toISOString().slice(0, 10));
  const [krotki, setKrotki]           = useState(initial?.krotki_opis ?? '');
  const [body, setBody]               = useState(initial?.body ?? '');

  // Cover - obiekt (z wariantami) ALBO sam URL (legacy).
  const initialCover: GalleryItem | null =
    initial?.cover ?? (initial?.cover_url ? { url: initial.cover_url } : null);
  const [cover, setCover] = useState<GalleryItem | null>(initialCover);

  const [gallery, setGallery]         = useState<GalleryItem[]>(initial?.gallery ?? []);
  const [published, setPublished]     = useState(initial?.published ?? true);

  // Nowe pola
  const [marka, setMarka]         = useState(initial?.marka ?? '');
  const [usluga, setUsluga]       = useState<RealizationUsluga | ''>(initial?.usluga ?? '');
  const [stage, setStage]         = useState(initial?.stage ?? '');
  const [silnik, setSilnik]       = useState(initial?.silnik ?? '');
  const [sterownik, setSterownik] = useState(initial?.sterownik ?? '');
  const [km0, setKm0]             = useState<string>(initial?.km0 != null ? String(initial.km0) : '');
  const [km1, setKm1]             = useState<string>(initial?.km1 != null ? String(initial.km1) : '');
  const [nm0, setNm0]             = useState<string>(initial?.nm0 != null ? String(initial.nm0) : '');
  const [nm1, setNm1]             = useState<string>(initial?.nm1 != null ? String(initial.nm1) : '');
  const [narzedzia, setNarzedzia] = useState<string>((initial?.narzedzia ?? []).join(', '));

  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Auto-generuj slug z tytułu, dopóki user go nie tknie
  useEffect(() => { if (!slugTouched) setSlug(slugify(title)); }, [title, slugTouched]);

  // Toast po zapisie / sukcesie
  useEffect(() => {
    if (state?.ok || params.get('saved') === '1') {
      setSavedToast('Zapisano zmiany.');
      const t = setTimeout(() => setSavedToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [state, params]);

  const onDelete = () => {
    if (!isEdit) return;
    if (!window.confirm(`Usunąć realizację "${initial!.title}"? Operacji nie można cofnąć.`)) return;
    startDelete(async () => { await deleteRealization(initial!.id); });
  };

  const kmGain = km0 && km1 ? Number(km1) - Number(km0) : null;
  const nmGain = nm0 && nm1 ? Number(nm1) - Number(nm0) : null;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Lewa kolumna - treść */}
      <div className="space-y-5 min-w-0">
        <div className="card p-5 space-y-4">
          <div>
            <label htmlFor="title" className="field-label">Tytuł *</label>
            <input
              id="title" name="title" required
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="field-input text-lg font-semibold"
              placeholder="np. BMW 320d F30 - Stage 1 + EGR off"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="slug" className="field-label">Slug (URL)</label>
              <input
                id="slug" name="slug"
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
                className="field-input font-mono text-sm"
                placeholder="bmw-320d-stage-1"
              />
              <p className="field-hint">Adres: <code>/realizacje/{slug || '...'}</code></p>
            </div>
            <div>
              <label htmlFor="data" className="field-label">Data realizacji</label>
              <input
                id="data" name="data" type="date"
                value={data} onChange={(e) => setData(e.target.value)}
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="samochod" className="field-label">Samochód (pełna nazwa)</label>
            <input
              id="samochod" name="samochod"
              value={samochod} onChange={(e) => setSamochod(e.target.value)}
              className="field-input"
              placeholder="np. BMW 320d F30 (2014)"
            />
          </div>

          <div>
            <label htmlFor="krotki_opis" className="field-label">Krótki opis (na kafelku)</label>
            <textarea
              id="krotki_opis" name="krotki_opis" rows={2}
              value={krotki} onChange={(e) => setKrotki(e.target.value)}
              className="field-textarea min-h-0"
              maxLength={240}
            />
            <p className="field-hint">{krotki.length}/240 znaków</p>
          </div>

          <div>
            <label htmlFor="body" className="field-label">Pełny opis (Markdown)</label>
            <textarea
              id="body" name="body" rows={12}
              value={body} onChange={(e) => setBody(e.target.value)}
              className="field-textarea font-mono text-sm leading-relaxed"
              placeholder="## Co zostało wykonane&#10;- Stage 1&#10;- Wyłączenie EGR&#10;..."
            />
          </div>
        </div>

        {/* Dane techniczne */}
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="font-semibold">Dane techniczne i klasyfikacja</h3>
            <p className="text-xs text-text-muted">Używane przez filtry na stronie publicznej.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="marka" className="field-label">Marka</label>
              <input id="marka" name="marka" value={marka} onChange={(e) => setMarka(e.target.value)}
                className="field-input" placeholder="BMW" list="lst-marki" />
              <datalist id="lst-marki">
                {['Audi','BMW','Ford','Hyundai','Kia','Mercedes-Benz','Opel','Renault','Seat','Škoda','Toyota','Volkswagen','Volvo'].map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="usluga" className="field-label">Usługa</label>
              <select id="usluga" name="usluga" value={usluga} onChange={(e) => setUsluga(e.target.value as RealizationUsluga | '')} className="field-input">
                {USLUGI.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="stage" className="field-label">Stage / zakres</label>
              <input id="stage" name="stage" value={stage} onChange={(e) => setStage(e.target.value)}
                className="field-input" placeholder="Stage 1" list="lst-stage" />
              <datalist id="lst-stage">
                <option value="Stage 1" /><option value="Stage 2" /><option value="Stage 3" />
                <option value="DPF off" /><option value="EGR off" /><option value="AdBlue off" /><option value="Hamownia" />
              </datalist>
            </div>
            <div>
              <label htmlFor="silnik" className="field-label">Silnik</label>
              <input id="silnik" name="silnik" value={silnik} onChange={(e) => setSilnik(e.target.value)}
                className="field-input" placeholder="2.0 TDI 184 KM" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sterownik" className="field-label">Sterownik / ECU</label>
              <input id="sterownik" name="sterownik" value={sterownik} onChange={(e) => setSterownik(e.target.value)}
                className="field-input" placeholder="Bosch EDC17C46" />
            </div>
          </div>

          {/* Pomiar dyno */}
          <div className="pt-2 border-t border-border">
            <h4 className="font-medium mb-2">Pomiar na hamowni (opcjonalny)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="km0" className="field-label">Moc seryjna [KM]</label>
                <input id="km0" name="km0" type="number" inputMode="numeric" min={0} step={1}
                  value={km0} onChange={(e) => setKm0(e.target.value)} className="field-input" placeholder="184" />
              </div>
              <div>
                <label htmlFor="km1" className="field-label">Moc po tuningu [KM]</label>
                <input id="km1" name="km1" type="number" inputMode="numeric" min={0} step={1}
                  value={km1} onChange={(e) => setKm1(e.target.value)} className="field-input" placeholder="225" />
              </div>
              <div>
                <label htmlFor="nm0" className="field-label">Moment seryjny [Nm]</label>
                <input id="nm0" name="nm0" type="number" inputMode="numeric" min={0} step={1}
                  value={nm0} onChange={(e) => setNm0(e.target.value)} className="field-input" placeholder="380" />
              </div>
              <div>
                <label htmlFor="nm1" className="field-label">Moment po tuningu [Nm]</label>
                <input id="nm1" name="nm1" type="number" inputMode="numeric" min={0} step={1}
                  value={nm1} onChange={(e) => setNm1(e.target.value)} className="field-input" placeholder="450" />
              </div>
            </div>
            {(kmGain != null || nmGain != null) && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {kmGain != null && (
                  <div className="px-3 py-2 rounded-md bg-bg-elev-2 border border-border">
                    Moc: <strong>{km0} → {km1} KM</strong>{' '}
                    <span className={kmGain >= 0 ? 'text-success' : 'text-danger'}>
                      ({kmGain >= 0 ? '+' : ''}{kmGain} KM)
                    </span>
                  </div>
                )}
                {nmGain != null && (
                  <div className="px-3 py-2 rounded-md bg-bg-elev-2 border border-border">
                    Moment: <strong>{nm0} → {nm1} Nm</strong>{' '}
                    <span className={nmGain >= 0 ? 'text-success' : 'text-danger'}>
                      ({nmGain >= 0 ? '+' : ''}{nmGain} Nm)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="narzedzia" className="field-label">Użyte narzędzia (oddzielone przecinkiem)</label>
            <input id="narzedzia" name="narzedzia" value={narzedzia} onChange={(e) => setNarzedzia(e.target.value)}
              className="field-input" placeholder="KESS V3, Alientech, MPPS, hamownia MAHA" />
            <p className="field-hint">Każde narzędzie pojawi się jako osobny tag pod realizacją.</p>
          </div>
        </div>

        {/* Galeria */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Galeria</h3>
              <p className="text-xs text-text-muted">
                {isBackendConfigured()
                  ? 'Wgrane zdjęcia są automatycznie konwertowane na AVIF + WebP (3 szerokości) - szybciej się ładują na telefonach.'
                  : 'Backend nie skonfigurowany - obrazy zapisywane bez optymalizacji.'}
              </p>
            </div>
          </div>
          <GalleryEditor items={gallery} onChange={setGallery} />
          <input type="hidden" name="gallery_json" value={JSON.stringify(gallery)} />
        </div>
      </div>

      {/* Prawa kolumna - sidebar z metadanymi */}
      <aside className="space-y-5">
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold">Publikacja</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox" name="published"
              checked={published} onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            Opublikowana
          </label>
          <p className="field-hint">Niepublikowane realizacje nie pojawią się na stronie.</p>

          <div className="flex flex-col gap-2 pt-2">
            <SubmitButton isEdit={isEdit} />
            {isEdit && SITE_URL && published && (
              <a
                href={`${SITE_URL}/realizacje/podglad/?slug=${encodeURIComponent(slug)}`}
                target="_blank" rel="noreferrer"
                className="btn-secondary w-full text-center"
              >
                Otwórz na stronie ↗
              </a>
            )}
            {isEdit && (
              <button
                type="button"
                onClick={onDelete}
                disabled={pendingDelete}
                className="btn-danger w-full"
              >
                {pendingDelete ? 'Usuwanie…' : 'Usuń realizację'}
              </button>
            )}
            <button type="button" className="btn-ghost w-full" onClick={() => router.push('/realizacje')}>
              Anuluj
            </button>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Zdjęcie główne (okładka)</h3>
          <CoverUploader value={cover} onChange={setCover} />
          <input type="hidden" name="cover_json" value={cover ? JSON.stringify(cover) : ''} />
          <input type="hidden" name="cover_url" value={cover?.url ?? ''} />
        </div>

        {/* Podgląd kafelka 1:1 jak na stronie */}
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted mb-2 px-1">
            Podgląd kafelka
          </div>
          <CardPreview
            title={title || 'Tytuł realizacji'}
            samochod={samochod}
            data={data}
            krotki={krotki || 'Krótki opis pojawi się tutaj…'}
            cover={cover?.url ?? ''}
          />
        </div>
      </aside>

      {/* Toasty / błędy */}
      {state?.error && (
        <div className="lg:col-span-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
          {state.error}
        </div>
      )}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-[10px] bg-success/15 border border-success/40 text-success text-sm shadow-elev">
          ✓ {savedToast}
        </div>
      )}
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Utwórz realizację'}
    </button>
  );
}

/* ---------------- Cover uploader ---------------- */

/**
 * Próbuje wgrywać przez backend (image pipeline → AVIF/WebP/JPG warianty).
 * Jeśli backend nie skonfigurowany lub padnie - fallback na bezpośredni upload do Supabase Storage.
 */
async function uploadFile(file: File, folder: 'cover' | 'gallery'): Promise<GalleryItem> {
  if (isBackendConfigured()) {
    try {
      return await uploadImage(file, { folder });
    } catch (e) {
      // Loguje błąd - admin zobaczy w consoli, jeśli backend zwrócił coś specyficznego.
      console.warn('Backend upload failed, fallback to direct Supabase:', e);
    }
  }
  const sb = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000', upsert: false, contentType: file.type,
  });
  if (upErr) throw upErr;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, size: file.size, mime: file.type };
}

function CoverUploader({ value, onChange }: { value: GalleryItem | null; onChange: (v: GalleryItem | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null); setUploading(true);
    try { onChange(await uploadFile(file, 'cover')); }
    catch (e) { setError((e as Error).message); }
    finally { setUploading(false); }
  }

  return (
    <div>
      {value?.url ? (
        <div className="relative group rounded-[10px] overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt="Okładka" className="w-full aspect-[16/10] object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md bg-bg/80 backdrop-blur border border-border hover:border-danger hover:text-danger"
          >
            Usuń
          </button>
          {value.variants && value.variants.length > 0 && (
            <span className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-success/20 border border-success/40 text-success">
              ✓ {value.variants.length} wariantów
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[16/10] rounded-[10px] border-2 border-dashed border-border hover:border-accent
                     bg-bg-elev-2 text-text-muted hover:text-accent transition-colors
                     flex flex-col items-center justify-center text-sm"
        >
          {uploading ? 'Wgrywanie…' : (
            <>
              <span className="text-2xl mb-1">＋</span>
              Wgraj zdjęcie
              <span className="text-xs text-text-muted/80 mt-0.5">JPG / PNG / WebP / HEIC</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ''; }}
      />
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}

/* ---------------- Gallery editor ---------------- */

function GalleryEditor({ items, onChange }: {
  items: GalleryItem[]; onChange: (v: GalleryItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadMany(files: FileList) {
    setError(null); setUploading(true);
    try {
      const next = [...items];
      for (const file of Array.from(files)) {
        next.push(await uploadFile(file, 'gallery'));
      }
      onChange(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((g, i) => (
          <div key={`${id}-${i}`} className="relative group rounded-[10px] overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.url} alt={g.alt || ''} className="w-full aspect-[4/3] object-cover" />
            <input
              type="text"
              value={g.alt ?? ''}
              onChange={(e) => {
                const next = [...items]; next[i] = { ...next[i], alt: e.target.value }; onChange(next);
              }}
              placeholder="opis (alt)"
              className="absolute inset-x-0 bottom-0 bg-bg/80 backdrop-blur text-xs px-2 py-1.5 border-t border-border focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-bg/80 backdrop-blur border border-border text-xs hover:border-danger hover:text-danger"
              aria-label="Usuń"
            >
              ✕
            </button>
            {g.variants && g.variants.length > 0 && (
              <span className="absolute top-1.5 left-1.5 text-[10px] px-1 py-0.5 rounded bg-success/20 border border-success/40 text-success">
                AVIF
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-[4/3] rounded-[10px] border-2 border-dashed border-border hover:border-accent
                     bg-bg-elev-2 text-text-muted hover:text-accent transition-colors
                     flex flex-col items-center justify-center text-xs"
        >
          {uploading ? 'Wgrywanie…' : (<><span className="text-xl mb-0.5">＋</span>Dodaj zdjęcia</>)}
        </button>
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { const fs = e.target.files; if (fs && fs.length) uploadMany(fs); e.currentTarget.value = ''; }}
      />
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}

/* ---------------- Card preview (1:1 jak na stronie) ---------------- */

function CardPreview({ title, samochod, data, krotki, cover }: {
  title: string; samochod: string; data: string; krotki: string; cover: string;
}) {
  return (
    <div className="block bg-bg-elev border border-border rounded-lg overflow-hidden shadow-soft">
      <div className="aspect-[16/10] bg-bg-elev-2">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted/50 text-xs uppercase tracking-widest">
            brak okładki
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="text-xs text-text-muted mb-2">
          {data ? new Date(data).toLocaleDateString('pl-PL') : '—'}{samochod ? ` · ${samochod}` : ''}
        </div>
        <h3 className="text-lg font-bold mb-1.5 line-clamp-2">{title}</h3>
        <p className="text-sm text-text-muted line-clamp-2">{krotki}</p>
      </div>
    </div>
  );
}
