import Topbar from '@/components/Topbar';
import { createClient } from '@/lib/supabase/server';
import type { CatalogCar } from '@/lib/types';
import CatalogImporter from './CatalogImporter';

export const dynamic = 'force-dynamic';

export default async function KatalogPage() {
  const sb = await createClient();
  const [{ count }, { data: sample }, { data: imports }] = await Promise.all([
    sb.from('catalog_cars').select('*', { count: 'exact', head: true }),
    sb.from('catalog_cars').select('*').order('marka').order('model').limit(50),
    sb.from('csv_imports').select('*').order('created_at', { ascending: false }).limit(5),
  ]);
  const total = count ?? 0;
  const cars = (sample ?? []) as CatalogCar[];

  return (
    <>
      <Topbar
        title="Katalog (CSV)"
        subtitle={`${total} ${total === 1 ? 'auto' : 'aut'} w bazie`}
      />

      <main className="p-5 md:p-8 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <CatalogImporter />

          <div className="card p-5 space-y-3 self-start">
            <h3 className="font-semibold">Wymagane kolumny</h3>
            <p className="text-xs text-text-muted">
              Plik CSV musi zawierać nagłówki w pierwszym wierszu. Akceptowane kolumny:
            </p>
            <code className="block text-[11px] bg-bg-elev-2 border border-border rounded-md p-2.5 leading-relaxed font-mono break-all">
              marka, model, generacja, rok_od, rok_do, silnik, moc_kw_seryjna, moc_km_seryjna,
              moc_kw_tuning, moc_km_tuning, moment_seryjny, moment_tuning, sterownik, slug
            </code>
            <p className="text-xs text-text-muted">
              Wymagane minimum: <code className="text-accent">marka</code>, <code className="text-accent">silnik</code>.
              Slug zostanie wygenerowany automatycznie, jeśli go nie podasz.
            </p>
          </div>
        </div>

        {/* Historia importów */}
        {imports && imports.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Historia importów</h3>
            <div className="divide-y divide-border text-sm">
              {imports.map((im) => (
                <div key={im.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{im.filename}</div>
                    <div className="text-xs text-text-muted">{new Date(im.created_at).toLocaleString('pl-PL')}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge-muted">{im.mode}</span>
                    <span className="badge-accent">{im.rows_count} wierszy</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Podgląd tabeli */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Podgląd katalogu (pierwsze 50)</h3>
            <span className="badge-muted">{total} ogółem</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elev-2 text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5">Marka / Model</th>
                  <th className="text-left px-4 py-2.5">Silnik</th>
                  <th className="text-left px-4 py-2.5">Sterownik</th>
                  <th className="text-right px-4 py-2.5">Seryjnie [KM]</th>
                  <th className="text-right px-4 py-2.5">Tuning [KM]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cars.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-text-muted">Brak danych. Zaimportuj CSV powyżej.</td></tr>
                ) : cars.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-elev-2/50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{c.marka} {c.model}</div>
                      <div className="text-xs text-text-muted">{c.generacja} · {c.rok_od}-{c.rok_do}</div>
                    </td>
                    <td className="px-4 py-2.5">{c.silnik}</td>
                    <td className="px-4 py-2.5 text-text-muted">{c.sterownik}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.moc_km_seryjna ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-accent font-semibold">{c.moc_km_tuning ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
