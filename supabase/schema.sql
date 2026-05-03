-- =====================================================================
--  G-Lab — kompletny schemat bazy Supabase (single source of truth).
--
--  Z tego pliku korzystają:
--    • backend (REST API na Render)
--    • admin-panel (Next.js / Vercel)
--    • strona publiczna (statyczna, runtime fetch z backendu)
--
--  Wklej całość w: Supabase Dashboard → SQL Editor → New query → Run.
--  Skrypt jest idempotentny — można uruchamiać wielokrotnie.
-- =====================================================================

-- 1) Rozszerzenia ----------------------------------------------------
create extension if not exists "pgcrypto";

-- =====================================================================
-- 2) Wspólne funkcje pomocnicze
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- =====================================================================
-- 3) Tabela: realizations (realizacje warsztatu)
--    cover  jsonb : { url, width, height, variants:[{format,width,url}], alt }
--    gallery jsonb: tablica obiektów j.w.
-- =====================================================================
create table if not exists public.realizations (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  samochod     text not null default '',
  data         date not null default current_date,
  krotki_opis  text not null default '',
  body         text not null default '',

  -- klasyfikacja / filtry / wyszukiwarka
  marka        text not null default '',                         -- np. BMW
  usluga       text not null default 'chiptuning'                -- chiptuning | dpf-egr | hamownia | inne
                check (usluga in ('chiptuning','dpf-egr','hamownia','inne')),
  stage        text not null default '',                         -- np. Stage 1
  silnik       text not null default '',                         -- np. 2.0 TDI
  sterownik    text not null default '',                         -- np. EDC17C50

  -- pomiar dyno (do mini-wykresu na podstronie i agregacji w galerii hamowni)
  km0          integer,                                          -- moc seryjna [KM]
  km1          integer,                                          -- moc po tuningu [KM]
  nm0          integer,                                          -- moment seryjny [Nm]
  nm1          integer,                                          -- moment po tuningu [Nm]

  -- użyte narzędzia: ["KESS V3","Hamownia MAHA",...]
  narzedzia    jsonb not null default '[]'::jsonb,

  -- obrazy (z wariantami AVIF/WebP/fallback wygenerowanymi przez backend)
  cover        jsonb,                                            -- { url, width, height, alt, variants:[...] }
  gallery      jsonb not null default '[]'::jsonb,               -- [ { url, width, height, alt, variants:[...] } ]

  -- legacy: pojedyncze URL-e (dla starych wpisów / kompatybilności wstecz)
  cover_url    text,

  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists realizations_data_idx       on public.realizations (data desc);
create index if not exists realizations_published_idx  on public.realizations (published);
create index if not exists realizations_marka_idx      on public.realizations (marka);
create index if not exists realizations_usluga_idx     on public.realizations (usluga);

drop trigger if exists realizations_set_updated_at on public.realizations;
create trigger realizations_set_updated_at
  before update on public.realizations
  for each row execute function public.set_updated_at();

-- Wygodny widok dla strony publicznej (bez pól wewnętrznych)
create or replace view public.public_realizations as
  select
    id, slug, title, samochod, data, krotki_opis, body,
    marka, usluga, stage, silnik, sterownik,
    km0, km1, nm0, nm1, narzedzia,
    cover, gallery, cover_url,
    extract(year from data)::int as rok
  from public.realizations
  where published = true
  order by data desc;

-- =====================================================================
-- 4) Tabela: catalog_cars (auta z CSV)
-- =====================================================================
create table if not exists public.catalog_cars (
  id               bigserial primary key,
  marka            text not null,
  model            text not null default '',
  generacja        text not null default '',
  rok_od           text not null default '',
  rok_do           text not null default '',
  silnik           text not null default '',
  moc_kw_seryjna   integer,
  moc_km_seryjna   integer,
  moc_kw_tuning    integer,
  moc_km_tuning    integer,
  moment_seryjny   integer,
  moment_tuning    integer,
  sterownik        text not null default '',
  slug             text not null unique,
  created_at       timestamptz not null default now()
);

create index if not exists catalog_cars_marka_idx     on public.catalog_cars (marka);
create index if not exists catalog_cars_sterownik_idx on public.catalog_cars (sterownik);

-- =====================================================================
-- 5) Tabela: csv_imports (historia importów katalogu)
-- =====================================================================
create table if not exists public.csv_imports (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  rows_count  integer not null default 0,
  mode        text not null default 'replace' check (mode in ('replace', 'upsert')),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);

-- =====================================================================
-- 6) Tabela: leads (zapytania z formularza wyceny / kontaktu)
-- =====================================================================
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  source      text not null default 'wycena',                    -- wycena | kontakt | api
  name        text,
  email       text,
  phone       text,
  message     text,
  payload     jsonb not null default '{}'::jsonb,                -- pełna treść z formularza
  user_agent  text,
  ip          inet,
  status      text not null default 'new'
              check (status in ('new','in_progress','done','spam')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 7) Storage bucket: realizacje (obrazy + warianty AVIF/WebP)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('realizacje', 'realizacje', true)
on conflict (id) do nothing;

-- =====================================================================
-- 8) Row Level Security
-- =====================================================================
alter table public.realizations enable row level security;
alter table public.catalog_cars enable row level security;
alter table public.csv_imports  enable row level security;
alter table public.leads        enable row level security;

-- realizations: publiczny SELECT tylko opublikowanych, reszta wymaga auth
drop policy if exists "Public can read published realizations" on public.realizations;
create policy "Public can read published realizations"
  on public.realizations for select
  using (published = true);

drop policy if exists "Authenticated full access to realizations" on public.realizations;
create policy "Authenticated full access to realizations"
  on public.realizations for all
  to authenticated using (true) with check (true);

-- catalog_cars: publiczny SELECT, modyfikacja tylko auth
drop policy if exists "Public can read catalog" on public.catalog_cars;
create policy "Public can read catalog"
  on public.catalog_cars for select using (true);

drop policy if exists "Authenticated full access to catalog" on public.catalog_cars;
create policy "Authenticated full access to catalog"
  on public.catalog_cars for all
  to authenticated using (true) with check (true);

-- csv_imports: tylko zalogowani
drop policy if exists "Authenticated read csv imports" on public.csv_imports;
create policy "Authenticated read csv imports"
  on public.csv_imports for select to authenticated using (true);

drop policy if exists "Authenticated insert csv imports" on public.csv_imports;
create policy "Authenticated insert csv imports"
  on public.csv_imports for insert to authenticated with check (true);

-- leads: insert publiczny (formularz), reszta tylko auth
drop policy if exists "Public can insert leads" on public.leads;
create policy "Public can insert leads"
  on public.leads for insert to anon, authenticated with check (true);

drop policy if exists "Authenticated read leads" on public.leads;
create policy "Authenticated read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "Authenticated update leads" on public.leads;
create policy "Authenticated update leads"
  on public.leads for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated delete leads" on public.leads;
create policy "Authenticated delete leads"
  on public.leads for delete to authenticated using (true);

-- Storage policies (bucket "realizacje")
drop policy if exists "Public read realizacje bucket" on storage.objects;
create policy "Public read realizacje bucket"
  on storage.objects for select
  using (bucket_id = 'realizacje');

drop policy if exists "Authenticated upload to realizacje bucket" on storage.objects;
create policy "Authenticated upload to realizacje bucket"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'realizacje');

drop policy if exists "Authenticated update realizacje bucket" on storage.objects;
create policy "Authenticated update realizacje bucket"
  on storage.objects for update to authenticated
  using (bucket_id = 'realizacje') with check (bucket_id = 'realizacje');

drop policy if exists "Authenticated delete realizacje bucket" on storage.objects;
create policy "Authenticated delete realizacje bucket"
  on storage.objects for delete to authenticated
  using (bucket_id = 'realizacje');

-- =====================================================================
-- 9) Migracje miękkie — dodawanie kolumn jeśli ktoś ma starszą wersję
-- =====================================================================
alter table public.realizations add column if not exists marka      text not null default '';
alter table public.realizations add column if not exists usluga     text not null default 'chiptuning';
alter table public.realizations add column if not exists stage      text not null default '';
alter table public.realizations add column if not exists silnik     text not null default '';
alter table public.realizations add column if not exists sterownik  text not null default '';
alter table public.realizations add column if not exists km0        integer;
alter table public.realizations add column if not exists km1        integer;
alter table public.realizations add column if not exists nm0        integer;
alter table public.realizations add column if not exists nm1        integer;
alter table public.realizations add column if not exists narzedzia  jsonb not null default '[]'::jsonb;
alter table public.realizations add column if not exists cover      jsonb;

-- Done.
