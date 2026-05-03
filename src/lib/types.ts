export type ImageVariant = {
  format: 'avif' | 'webp' | 'jpeg';
  width: number;
  height?: number;
  url: string;
  path?: string;
  size?: number;
};

/**
 * Pojedynczy obrazek używany jako cover lub pozycja galerii.
 * - Stary kształt (`{ url, alt }`) działa dalej (legacy compat).
 * - Nowy kształt z backendu zawiera warianty (AVIF/WebP/JPG) + LQIP + blurhash.
 */
export type GalleryItem = {
  url: string;
  alt?: string;
  path?: string;
  width?: number;
  height?: number;
  size?: number;
  mime?: string;
  lqip?: string;
  blurhash?: string;
  variants?: ImageVariant[];
};

export type RealizationUsluga = 'chiptuning' | 'dpf-egr' | 'hamownia' | 'inne';

export type Realization = {
  id: string;
  slug: string;
  title: string;
  samochod: string;
  data: string; // YYYY-MM-DD
  krotki_opis: string;
  body: string;
  cover_url: string | null;             // legacy / fallback (płaski URL)
  cover: GalleryItem | null;            // nowy: pełny obiekt z wariantami
  gallery: GalleryItem[];
  marka: string;
  usluga: RealizationUsluga | '';
  stage: string;
  silnik: string;
  sterownik: string;
  km0: number | null;
  km1: number | null;
  nm0: number | null;
  nm1: number | null;
  narzedzia: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadStatus = 'new' | 'in_progress' | 'done' | 'spam';
export type LeadSource = 'kontakt' | 'wycena' | 'newsletter' | 'inne';

export type Lead = {
  id: string;
  source: LeadSource;
  status: LeadStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  updated_at: string;
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Nowe',
  in_progress: 'W toku',
  done: 'Zrealizowane',
  spam: 'Spam',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  kontakt: 'Kontakt',
  wycena: 'Wycena',
  newsletter: 'Newsletter',
  inne: 'Inne',
};

export type CatalogCar = {
  id: number;
  marka: string;
  model: string;
  generacja: string;
  rok_od: string;
  rok_do: string;
  silnik: string;
  moc_kw_seryjna: number | null;
  moc_km_seryjna: number | null;
  moc_kw_tuning: number | null;
  moc_km_tuning: number | null;
  moment_seryjny: number | null;
  moment_tuning: number | null;
  sterownik: string;
  slug: string;
  created_at: string;
};

export const CATALOG_CSV_HEADERS = [
  'marka','model','generacja','rok_od','rok_do','silnik',
  'moc_kw_seryjna','moc_km_seryjna','moc_kw_tuning','moc_km_tuning',
  'moment_seryjny','moment_tuning','sterownik','slug',
] as const;

export type CsvImportRow = {
  marka: string; model: string; generacja: string;
  rok_od: string; rok_do: string; silnik: string;
  moc_kw_seryjna: number | null; moc_km_seryjna: number | null;
  moc_kw_tuning: number | null;  moc_km_tuning: number | null;
  moment_seryjny: number | null; moment_tuning: number | null;
  sterownik: string; slug: string;
};
