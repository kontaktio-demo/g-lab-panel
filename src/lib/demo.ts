/**
 * Tryb DEMO — pozwala uruchomić panel bez Supabase, bez backendu i bez logowania.
 *
 * Uaktywnia się automatycznie, gdy nie jest ustawiona zmienna `NEXT_PUBLIC_SUPABASE_URL`.
 * W tym trybie:
 *   - middleware nie wymusza logowania,
 *   - klient Supabase (server + browser) jest zastąpiony stubem zwracającym dane przykładowe,
 *   - klient backendu (`lib/backend.ts`) udaje API leadów / statystyk,
 *   - operacje zapisu (insert/update/delete, upload obrazów) zachowują się jak no-op
 *     (interfejs reaguje, ale nic nie jest faktycznie zapisywane).
 *
 * Dane przykładowe są trzymane w pamięci procesu (czyli per-instancja serwera).
 */

import type { CatalogCar, GalleryItem, Lead, Realization } from './types';

/* ────────────────────────── detekcja trybu demo ────────────────────────── */

export function isDemoMode(): boolean {
  // Bez URL Supabase nie ma jak się połączyć — uruchamiamy tryb demo.
  // Można też wymusić: NEXT_PUBLIC_DEMO_MODE=1
  if (process.env.NEXT_PUBLIC_DEMO_MODE === '1') return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.trim() === '';
}

/* ────────────────────────── dane przykładowe ────────────────────────── */

const COVER_PLACEHOLDER = (label: string, hue = 0) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stop-color="hsl(${hue},70%,18%)"/>
           <stop offset="100%" stop-color="hsl(${(hue + 40) % 360},70%,8%)"/>
         </linearGradient>
       </defs>
       <rect width="800" height="500" fill="url(#g)"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="Inter,system-ui,sans-serif" font-size="42" font-weight="700"
             fill="rgba(255,255,255,0.85)">${label}</text>
     </svg>`,
  )}`;

function mkCover(label: string, hue: number): GalleryItem {
  const url = COVER_PLACEHOLDER(label, hue);
  return { url, alt: label, width: 800, height: 500 };
}

const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const dateOnly = (n: number) => daysAgo(n).slice(0, 10);

const realizations: Realization[] = [
  {
    id: 'demo-1',
    slug: 'audi-rs6-stage2',
    title: 'Audi RS6 4.0 TFSI — Stage 2',
    samochod: 'Audi RS6 C8 (2022)',
    data: dateOnly(3),
    krotki_opis: 'Stage 2 + downpipe, mapa pod 100 oktanów. Realny wzrost mocy potwierdzony na hamowni.',
    body: 'Pełen pakiet Stage 2 obejmujący downpipe, intercooler oraz dedykowaną mapę paliwową.',
    cover_url: COVER_PLACEHOLDER('Audi RS6', 0),
    cover: mkCover('Audi RS6', 0),
    gallery: [mkCover('Hamownia', 10), mkCover('Silnik', 20)],
    marka: 'Audi',
    usluga: 'chiptuning',
    stage: 'Stage 2',
    silnik: '4.0 TFSI V8',
    sterownik: 'Bosch MG1CS201',
    km0: 600, km1: 780,
    nm0: 800, nm1: 1020,
    narzedzia: ['KESS3', 'WinOLS', 'Hamownia MAHA LPS3000'],
    published: true,
    created_at: daysAgo(10),
    updated_at: daysAgo(3),
  },
  {
    id: 'demo-2',
    slug: 'bmw-m3-g80-stage1',
    title: 'BMW M3 Competition G80 — Stage 1',
    samochod: 'BMW M3 G80 (2023)',
    data: dateOnly(8),
    krotki_opis: 'Optymalizacja dla codziennej jazdy + wyraźniejsza reakcja gazu.',
    body: 'Stage 1 z naciskiem na kulturę pracy oraz responsywność jednostki S58.',
    cover_url: COVER_PLACEHOLDER('BMW M3', 200),
    cover: mkCover('BMW M3', 200),
    gallery: [mkCover('Wnętrze', 210)],
    marka: 'BMW',
    usluga: 'chiptuning',
    stage: 'Stage 1',
    silnik: 'S58 3.0 R6 BiTurbo',
    sterownik: 'Bosch MG1CS003',
    km0: 510, km1: 620,
    nm0: 650, nm1: 820,
    narzedzia: ['CMD Flash', 'WinOLS'],
    published: true,
    created_at: daysAgo(15),
    updated_at: daysAgo(8),
  },
  {
    id: 'demo-3',
    slug: 'vw-golf-7-gti-dpf-off',
    title: 'VW Golf 7 GTI — odbicie po DPF/EGR (szkic)',
    samochod: 'VW Golf 7 GTI (2017)',
    data: dateOnly(12),
    krotki_opis: 'Realizacja w trakcie opisu — finalne pomiary już wkrótce.',
    body: '',
    cover_url: COVER_PLACEHOLDER('Golf GTI', 120),
    cover: mkCover('Golf GTI', 120),
    gallery: [],
    marka: 'Volkswagen',
    usluga: 'dpf-egr',
    stage: '',
    silnik: '2.0 TSI',
    sterownik: 'Bosch MED17.5',
    km0: 220, km1: 280,
    nm0: 350, nm1: 420,
    narzedzia: ['KESS3'],
    published: false,
    created_at: daysAgo(14),
    updated_at: daysAgo(12),
  },
  {
    id: 'demo-4',
    slug: 'porsche-cayenne-diesel-stage1',
    title: 'Porsche Cayenne 3.0 TDI — Stage 1',
    samochod: 'Porsche Cayenne 9Y0 (2019)',
    data: dateOnly(20),
    krotki_opis: 'Większy moment w niskim zakresie obrotów + lepsze reakcje skrzyni.',
    body: 'Mapa Stage 1 z naciskiem na komfort prowadzenia i ekonomię paliwa.',
    cover_url: COVER_PLACEHOLDER('Cayenne', 280),
    cover: mkCover('Cayenne', 280),
    gallery: [mkCover('Hamownia', 290)],
    marka: 'Porsche',
    usluga: 'chiptuning',
    stage: 'Stage 1',
    silnik: '3.0 V6 TDI',
    sterownik: 'Bosch EDC17CP54',
    km0: 286, km1: 340,
    nm0: 600, nm1: 720,
    narzedzia: ['KESS3', 'WinOLS'],
    published: true,
    created_at: daysAgo(25),
    updated_at: daysAgo(20),
  },
];

const catalogCars: CatalogCar[] = [
  ['Audi','RS6','C8','2019','2024','4.0 TFSI V8',441,600,574,780,800,1020,'Bosch MG1CS201'],
  ['Audi','S3','8Y','2020','2024','2.0 TSI',228,310,272,370,400,500,'Bosch MG1CS111'],
  ['BMW','M3 Competition','G80','2021','2024','3.0 R6 BiTurbo',375,510,456,620,650,820,'Bosch MG1CS003'],
  ['BMW','335d','F30','2013','2018','3.0 R6 TDI',230,313,272,370,630,720,'Bosch EDC17CP45'],
  ['Mercedes-Benz','C 220 d','W205','2014','2020','2.1 OM651',125,170,160,218,400,500,'Bosch EDC17C66'],
  ['Volkswagen','Golf GTI','Mk7','2013','2019','2.0 TSI',162,220,210,285,350,420,'Bosch MED17.5'],
  ['Volkswagen','Passat','B8 2.0 TDI','2014','2023','2.0 TDI',140,190,176,240,400,460,'Bosch EDC17C74'],
  ['Skoda','Octavia RS','Mk3','2013','2020','2.0 TDI',135,184,170,231,380,440,'Bosch EDC17C74'],
  ['Skoda','Superb','B8 2.0 TSI','2015','2023','2.0 TSI',162,220,210,285,350,420,'Bosch MED17.5'],
  ['Porsche','Cayenne','9Y0','2017','2024','3.0 V6 TDI',210,286,250,340,600,720,'Bosch EDC17CP54'],
  ['Ford','Focus ST','Mk3','2014','2018','2.0 EcoBoost',184,250,221,300,360,440,'Bosch MED17.0.7'],
  ['Opel','Insignia OPC','A','2009','2017','2.8 V6 Turbo',239,325,272,370,435,520,'Bosch ME9.6'],
].map((row, i): CatalogCar => {
  const [marka, model, generacja, rok_od, rok_do, silnik, kw0, km0, kw1, km1, nm0, nm1, sterownik] = row as [
    string,string,string,string,string,string,number,number,number,number,number,number,string,
  ];
  return {
    id: i + 1,
    marka, model, generacja, rok_od, rok_do, silnik,
    moc_kw_seryjna: kw0, moc_km_seryjna: km0,
    moc_kw_tuning:  kw1, moc_km_tuning:  km1,
    moment_seryjny: nm0, moment_tuning: nm1,
    sterownik,
    slug: `${marka}-${model}-${silnik}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    created_at: daysAgo(30 + i),
  };
});

const csvImports = [
  { id: 1, filename: 'katalog-2024-q4.csv', mode: 'replace', rows_count: catalogCars.length, created_at: daysAgo(3) },
  { id: 2, filename: 'katalog-uzupelnienie.csv', mode: 'append', rows_count: 7, created_at: daysAgo(11) },
];

const leads: Lead[] = [
  {
    id: 'lead-1',
    source: 'wycena', status: 'new',
    name: 'Marek Kowalski',
    email: 'marek.k@example.com',
    phone: '+48 600 100 200',
    message: 'Witam, chciałbym poznać cenę Stage 1 do Audi A4 B9 2.0 TFSI.',
    payload: { samochod: 'Audi A4 B9', silnik: '2.0 TFSI', rok: '2018' },
    user_agent: 'Mozilla/5.0', ip: '203.0.113.10',
    created_at: daysAgo(0), updated_at: daysAgo(0),
  },
  {
    id: 'lead-2',
    source: 'kontakt', status: 'new',
    name: 'Anna Nowak', email: 'a.nowak@example.com', phone: '+48 511 222 333',
    message: 'Czy robicie usuwanie DPF w VW Passacie 2.0 TDI? Pozdrawiam.',
    payload: {},
    user_agent: 'Mozilla/5.0', ip: '203.0.113.11',
    created_at: daysAgo(1), updated_at: daysAgo(1),
  },
  {
    id: 'lead-3',
    source: 'wycena', status: 'in_progress',
    name: 'Tomasz Lis', email: 't.lis@example.com', phone: '+48 600 999 888',
    message: 'Stage 2 do BMW M3 G80 — proszę o termin oraz wycenę z downpipem.',
    payload: { samochod: 'BMW M3 G80', stage: 'Stage 2' },
    user_agent: 'Mozilla/5.0', ip: '203.0.113.12',
    created_at: daysAgo(2), updated_at: daysAgo(1),
  },
  {
    id: 'lead-4',
    source: 'kontakt', status: 'done',
    name: 'Karolina Wójcik', email: 'karolina.w@example.com', phone: null,
    message: 'Dziękuję za szybkie wykonanie usługi, polecam!',
    payload: {},
    user_agent: 'Mozilla/5.0', ip: '203.0.113.13',
    created_at: daysAgo(5), updated_at: daysAgo(4),
  },
  {
    id: 'lead-5',
    source: 'newsletter', status: 'spam',
    name: null, email: 'spam-bot@bad.example', phone: null,
    message: 'Zakup tanich linków SEO — promocja!',
    payload: {},
    user_agent: 'curl/8.0', ip: '198.51.100.7',
    created_at: daysAgo(6), updated_at: daysAgo(6),
  },
  {
    id: 'lead-6',
    source: 'wycena', status: 'new',
    name: 'Piotr Zieliński', email: 'piotr.z@example.com', phone: '+48 502 010 020',
    message: 'Skoda Octavia RS Mk3 2.0 TDI — czy da się zrobić Stage 1?',
    payload: { samochod: 'Skoda Octavia RS', silnik: '2.0 TDI' },
    user_agent: 'Mozilla/5.0', ip: '203.0.113.20',
    created_at: daysAgo(0), updated_at: daysAgo(0),
  },
];

/* ────────────────────────── publiczne gettery ────────────────────────── */

export const demoStore = {
  realizations,
  catalogCars,
  csvImports,
  leads,
};

/* ────────────────────────── stub klienta Supabase ────────────────────────── */

type AnyRow = Record<string, unknown>;

const TABLES: Record<string, AnyRow[]> = {
  realizations: realizations as unknown as AnyRow[],
  catalog_cars: catalogCars as unknown as AnyRow[],
  csv_imports: csvImports as unknown as AnyRow[],
  leads: leads as unknown as AnyRow[],
};

class DemoQuery<T extends AnyRow> implements PromiseLike<{ data: T[] | T | null; error: null; count?: number }> {
  private rows: T[];
  private headOnly = false;
  private wantCount = false;
  private singleMaybe = false;

  constructor(private all: T[]) {
    this.rows = [...all];
  }

  select(_cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    if (opts?.head) this.headOnly = true;
    if (opts?.count) this.wantCount = true;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    const asc = opts?.ascending !== false;
    this.rows = [...this.rows].sort((a, b) => {
      const av = a[col]; const bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return this;
  }

  limit(n: number): this {
    this.rows = this.rows.slice(0, n);
    return this;
  }

  eq(col: string, val: unknown): this {
    this.rows = this.rows.filter((r) => r[col] === val);
    return this;
  }

  gte(col: string, val: unknown): this {
    this.rows = this.rows.filter((r) => {
      const v = r[col];
      return v != null && (v as number | string) >= (val as number | string);
    });
    return this;
  }

  lte(col: string, val: unknown): this {
    this.rows = this.rows.filter((r) => {
      const v = r[col];
      return v != null && (v as number | string) <= (val as number | string);
    });
    return this;
  }

  ilike(col: string, pattern: string): this {
    const re = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
    this.rows = this.rows.filter((r) => re.test(String(r[col] ?? '')));
    return this;
  }

  in(col: string, values: unknown[]): this {
    const set = new Set(values);
    this.rows = this.rows.filter((r) => set.has(r[col]));
    return this;
  }

  maybeSingle() {
    this.singleMaybe = true;
    return this;
  }

  single() {
    this.singleMaybe = true;
    return this;
  }

  then<R1 = { data: T[] | T | null; error: null; count?: number }, R2 = never>(
    onFulfilled?: ((value: { data: T[] | T | null; error: null; count?: number }) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    const result: { data: T[] | T | null; error: null; count?: number } = { data: null, error: null };
    if (this.singleMaybe) result.data = this.rows[0] ?? null;
    else if (this.headOnly) result.data = null;
    else result.data = this.rows;
    if (this.wantCount) result.count = this.rows.length;
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

class DemoMutation implements PromiseLike<{ data: null; error: null }> {
  // Mutacje są no-op — w trybie demo nic nie zapisujemy trwale.
  eq(): this { return this; }
  select(): this { return this; }
  async single() {
    // `.insert().select().single()` musi zwrócić jakiś wiersz, żeby kod kontynuował.
    return { data: { id: 'demo-new', slug: 'demo-new' }, error: null };
  }
  async maybeSingle() {
    return { data: null, error: null };
  }
  then<R1 = { data: null; error: null }, R2 = never>(
    onFulfilled?: ((value: { data: null; error: null }) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
  }
}

class DemoTable {
  constructor(private rows: AnyRow[]) {}
  select(cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    return new DemoQuery(this.rows).select(cols, opts);
  }
  insert(_row: unknown): DemoMutation { return new DemoMutation(); }
  update(_row: unknown): DemoMutation { return new DemoMutation(); }
  delete(): DemoMutation { return new DemoMutation(); }
  upsert(_row: unknown): DemoMutation { return new DemoMutation(); }
}

class DemoStorageBucket {
  async upload(path: string, _file: unknown) {
    return { data: { path }, error: null };
  }
  async remove(_paths: string[]) {
    return { data: [], error: null };
  }
  getPublicUrl(path: string) {
    // Zwraca URL na placeholder, więc kafelek pokaże okładkę.
    return { data: { publicUrl: COVER_PLACEHOLDER('upload', 30) + `#${path}` } };
  }
}

class DemoStorage {
  from(_bucket: string) { return new DemoStorageBucket(); }
}

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@g-lab.local',
  app_metadata: {},
  user_metadata: { name: 'Demo' },
  aud: 'authenticated',
  created_at: new Date(0).toISOString(),
};

class DemoAuth {
  async getUser() {
    return { data: { user: DEMO_USER }, error: null };
  }
  async getSession() {
    return { data: { session: { access_token: 'demo-token', user: DEMO_USER } }, error: null };
  }
  async signInWithPassword(_creds: unknown) {
    return { data: { user: DEMO_USER, session: { access_token: 'demo-token', user: DEMO_USER } }, error: null };
  }
  async signOut() {
    return { error: null };
  }
}

export class DemoSupabaseClient {
  auth = new DemoAuth();
  storage = new DemoStorage();
  from(table: string) {
    return new DemoTable(TABLES[table] ?? []);
  }
}

export function createDemoClient(): DemoSupabaseClient {
  return new DemoSupabaseClient();
}
