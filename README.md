# G-Lab CMS — panel admina

Samodzielna aplikacja Next.js 15 (App Router) + Supabase, gotowa do wdrożenia na Vercelu.
Pozwala zarządzać **realizacjami** warsztatu (CRUD + zdjęcia z konwersją AVIF/WebP),
**skrzynką zapytań** z formularzy oraz importować **katalog aut** z pliku CSV.

> Ten folder jest niezależny — możesz go skopiować do osobnego repo, podlinkować pod
> Vercela i działa od razu po ustawieniu zmiennych środowiskowych.
>
> Współpracuje z **backendem G-Lab** (`backend/` w repo głównym, deploy na Render) — backend
> obsługuje konwersję obrazów do AVIF/WebP/JPG, magazynuje leady i wystawia API dla strony
> publicznej. Bez backendu panel działa w trybie ograniczonym (upload bez konwersji,
> brak skrzynki).

---

## ✨ Co dostajesz

- 🔐 **Logowanie** przez Supabase Auth (e-mail + hasło).
- 🖼️ **CRUD realizacji** z pełnym zestawem pól:
  - tytuł, slug, samochód, data, krótki + pełny opis (Markdown),
  - **dane techniczne**: marka (z autouzupełnianiem), usługa (chiptuning / dpf-egr / hamownia / inne),
    stage, silnik, sterownik,
  - **pomiar dyno** — moc i moment seryjne vs po tuningu, live-podsumowanie +KM/+Nm,
  - **narzędzia** jako tag input (KESS V3, Alientech, …),
  - **okładka + galeria** uploadowane przez backend → konwersja **AVIF + WebP + JPG**
    × 3 szerokości (480 / 1280 / 2400 px) + LQIP + blurhash,
  - status publikacji + przycisk **„Otwórz na stronie ↗"**,
  - **podgląd kafelka 1:1** jak na stronie publicznej.
- ✉️ **Skrzynka zapytań** (`/leads`) — wszystkie zapytania z formularzy ze strony:
  filtry po statusie, wyszukiwarka, bulk actions, eksport CSV, auto-refresh co 60 s,
  rozwijany pełny `payload` formularza.
- 📊 **Pulpit** — kafelki ze statystykami: realizacje (+ liczba szkiców), katalog,
  **liczba nowych zapytań**, ostatnia zmiana.
- 📥 **Import CSV katalogu** — drag & drop, tryb „Zastąp całość" lub „Aktualizuj (upsert)",
  walidacja nagłówków, historia importów.
- 🔁 **Auto-trigger rebuildu** strony statycznej po zapisie realizacji
  (POST do `BUILD_HOOK_URL` Netlify/Vercel z HMAC).
- 🎨 **Wygląd spójny ze stroną G-Lab** — ten sam ciemny motyw, pomarańczowy akcent, Inter.
- 🛡️ **RLS** w Supabase: publiczny odczyt opublikowanych realizacji i katalogu
  (żeby strona statyczna mogła je pobierać), zapis tylko dla zalogowanych.

---

## 📁 Struktura

```
admin-panel/
├── src/
│   ├── app/
│   │   ├── (app)/                  # Trasy chronione (wymagają logowania)
│   │   │   ├── layout.tsx          # Sidebar + content
│   │   │   ├── page.tsx            # Pulpit (statystyki + najnowsze)
│   │   │   ├── realizacje/
│   │   │   │   ├── page.tsx        # Lista (kafelki)
│   │   │   │   ├── new/page.tsx    # Nowa realizacja
│   │   │   │   ├── [id]/edit/...   # Edycja istniejącej
│   │   │   │   ├── RealizationForm.tsx
│   │   │   │   └── actions.ts      # Server Actions: create/update/delete
│   │   │   └── katalog/
│   │   │       ├── page.tsx        # Importer CSV + tabela
│   │   │       ├── CatalogImporter.tsx
│   │   │       └── actions.ts      # Server Action: import CSV
│   │   ├── login/                  # Strona logowania (publiczna)
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css             # Tailwind + design system
│   ├── components/                 # Sidebar, Topbar, RealizationCard, LogoutButton
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── types.ts
│   │   └── utils.ts                # slugify, formatDatePL
│   └── middleware.ts               # Ochrona tras
├── supabase/schema.sql             # 👈 Schemat bazy do wklejenia w SQL Editor
├── .env.example                    # Wymagane zmienne środowiskowe
├── next.config.mjs
├── tailwind.config.ts
├── package.json
└── vercel.json
```

---

## 🚀 Setup — krok po kroku

### 1) Załóż projekt w Supabase

1. Wejdź na <https://supabase.com> → **New project**.
2. Podaj nazwę (np. `g-lab-cms`), region najbliżej Polski (`eu-central-1`), wymyśl hasło do bazy.
3. Poczekaj 1–2 minuty aż projekt się utworzy.

### 2) Utwórz strukturę bazy

W panelu Supabase otwórz **SQL Editor → New query**, wklej całą zawartość pliku
[`supabase/schema.sql`](./supabase/schema.sql) i kliknij **Run**.

Skrypt utworzy:

- 📦 **Tabele:**
  - `realizations` — realizacje (id, slug, title, samochod, data, krotki_opis, body,
    cover_url, gallery JSONB, published, created_at, updated_at).
  - `catalog_cars` — auta z CSV (marka, model, generacja, lata, silnik, moce, momenty, sterownik, slug).
  - `csv_imports` — historia importów CSV (kto, kiedy, ile wierszy).
- 🪣 **Storage bucket** `realizacje` (publiczny — pliki są zwracane przez CDN
  Supabase z URL-ami `https://<projekt>.supabase.co/storage/v1/object/public/realizacje/...`).
- 🔒 **RLS** (Row Level Security):
  - Publiczny `SELECT` z `realizations` (tylko gdy `published = true`) i `catalog_cars`.
  - Wszystkie operacje `INSERT/UPDATE/DELETE` — tylko zalogowani.
  - Storage: publiczny odczyt, zapis/usuwanie tylko dla zalogowanych.

> 💡 Dzięki publicznemu odczytowi Twoja **strona statyczna G-Lab** może w buildzie
> pobierać dane z Supabase (klientem `anon`) bez logowania.

### 3) Załóż swoje konto admina

W Supabase: **Authentication → Users → Add user → Create new user**.
Wpisz e-mail + hasło, **zaznacz „Auto confirm user"** (żeby nie trzeba było potwierdzać linkiem mailowym).

> Rejestracja z poziomu panelu jest celowo wyłączona — konta zakładasz ręcznie w Supabase.

### 4) Pobierz klucze API

Supabase → **Settings → API**. Skopiuj:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ tylko po stronie serwera, nigdy w repo!

### 5) Uruchom lokalnie

```bash
cd admin-panel
cp .env.example .env.local
# wypełnij .env.local kluczami z punktu 4
npm install
npm run dev
```

Otwórz <http://localhost:3000>, zaloguj się kontem z punktu 3.

### 6) Wgraj na Vercela

1. Wypchnij ten folder do osobnego repo na GitHubie (lub całe repo z `Root Directory: admin-panel`).
2. Na <https://vercel.com> → **Add New → Project** → wybierz repo.
3. **Root Directory:** `admin-panel` (jeśli folder leży w monorepo).
4. **Environment Variables** — dodaj wszystkie 4 z `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_BUCKET=realizacje`).
5. Deploy. Po chwili dostaniesz URL typu `g-lab-cms.vercel.app`.

---

## 🗃️ Struktura bazy danych

### `realizations`

| kolumna       | typ          | opis                                          |
|---------------|--------------|-----------------------------------------------|
| `id`          | `uuid` PK    | generowane automatycznie                      |
| `slug`        | `text` UQ    | część URL, np. `bmw-320d-stage-1`             |
| `title`       | `text`       | tytuł realizacji                              |
| `samochod`    | `text`       | np. `BMW 320d F30 (2014)`                     |
| `data`        | `date`       | data realizacji                               |
| `krotki_opis` | `text`       | wyświetlany na kafelku                        |
| `body`        | `text`       | pełny opis (Markdown)                         |
| `cover_url`   | `text`       | URL do zdjęcia z Supabase Storage             |
| `gallery`     | `jsonb`      | tablica `[{url, alt}]`                        |
| `published`   | `boolean`    | `true` = widoczna publicznie                  |
| `created_at`, `updated_at` | `timestamptz` | timestampy                       |

### `catalog_cars`

Wszystkie kolumny CSV: `marka, model, generacja, rok_od, rok_do, silnik,
moc_kw_seryjna, moc_km_seryjna, moc_kw_tuning, moc_km_tuning,
moment_seryjny, moment_tuning, sterownik, slug` (slug `UNIQUE` — używany do upsertów).

### `csv_imports`

Audyt importów: `filename, rows_count, mode (replace|upsert), created_at, created_by`.

### Storage bucket `realizacje`

- **Publiczny** odczyt (CDN).
- Upload tylko dla zalogowanych. Pliki układane w katalogach:
  - `cover/<timestamp>-<rand>.<ext>` — okładki
  - `gallery/<timestamp>-<rand>.<ext>` — zdjęcia z galerii

---

## 🔌 Jak podpiąć dane do strony G-Lab (build statyczny)

Strona G-Lab czyta realizacje z plików `content/realizacje/*.md`.
Żeby zaciągnąć je z Supabase, w skrypcie buildu (`build.js`) dorzuć (przykładowo):

```js
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data } = await sb.from('realizations').select('*').eq('published', true).order('data', { ascending: false });
// data → przekaż do buildRealizations(...)
```

Analogicznie dla katalogu (`from('catalog_cars')`). Anon key wystarczy — RLS pozwala
na publiczny odczyt opublikowanych rekordów.

---

## 🧪 Skrypty

| komenda           | działanie                                |
|-------------------|------------------------------------------|
| `npm run dev`     | dev server na <http://localhost:3000>    |
| `npm run build`   | produkcyjny build                        |
| `npm run start`   | uruchamia zbudowany serwer               |
| `npm run lint`    | ESLint (`next lint`)                     |

---

## ❓ FAQ

**Nie mogę się zalogować — „Invalid login credentials".**
Sprawdź, czy konto utworzyłeś w Supabase i zaznaczyłeś „Auto confirm". W razie czego
zresetuj hasło w **Authentication → Users**.

**Po imporcie CSV katalog jest pusty.**
Jeśli wybrałeś tryb „Zastąp całość", a plik nie miał wymaganych kolumn (`marka`, `silnik`),
walidator odrzucił wiersze. Sprawdź historię importów i nagłówki pliku.

**Zdjęcia się nie wyświetlają.**
Bucket musi być publiczny (skrypt `schema.sql` to ustawia). Sprawdź też, czy URL ma format
`https://<projekt>.supabase.co/storage/v1/object/public/realizacje/...`.

**Mogę dodać drugiego admina?**
Tak — Supabase → Authentication → Users → Add user. Dowolnie wielu.

---

## 📜 Licencja

Wewnętrzne narzędzie G-Lab.
