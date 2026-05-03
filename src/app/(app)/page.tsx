import Link from 'next/link';
import Topbar from '@/components/Topbar';
import { createClient } from '@/lib/supabase/server';
import RealizationCard from '@/components/RealizationCard';
import type { Realization } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

export default async function DashboardPage() {
  const supabase = await createClient();

  // Liczniki z bazy (jeden round-trip, żadnych N+1).
  // `leads` może nie istnieć w starszych instalacjach - łapiemy błąd cicho.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: realizationsCount },
    { count: catalogCount },
    { data: latest },
    { count: publishedCount },
    { count: draftsCount },
    leadsTotalRes,
    leadsNewRes,
    leadsWeekRes,
  ] = await Promise.all([
    supabase.from('realizations').select('*', { count: 'exact', head: true }),
    supabase.from('catalog_cars').select('*', { count: 'exact', head: true }),
    supabase.from('realizations').select('*').order('updated_at', { ascending: false }).limit(3),
    supabase.from('realizations').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('realizations').select('*', { count: 'exact', head: true }).eq('published', false),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
  ]);

  const leadsTotal = leadsTotalRes.error ? null : (leadsTotalRes.count ?? 0);
  const leadsNew   = leadsNewRes.error   ? null : (leadsNewRes.count   ?? 0);
  const leadsWeek  = leadsWeekRes.error  ? null : (leadsWeekRes.count  ?? 0);

  const stats = [
    {
      label: 'Realizacje',
      value: realizationsCount ?? 0,
      hint: `${publishedCount ?? 0} opublikowanych · ${draftsCount ?? 0} szkice`,
      href: '/realizacje',
      accent: true,
    },
    {
      label: 'Auta w katalogu',
      value: catalogCount ?? 0,
      hint: 'Słownik mocy seryjnych i po tuningu',
      href: '/katalog',
    },
    {
      label: 'Skrzynka zapytań',
      value: leadsTotal ?? '—',
      hint: leadsTotal == null
        ? 'Wymaga tabeli leads w Supabase'
        : `${leadsNew ?? 0} nowych · ${leadsWeek ?? 0} z ostatnich 7 dni`,
      href: '/leads',
      accent: (leadsNew ?? 0) > 0,
    },
    {
      label: 'Ostatnia zmiana',
      value: latest?.[0]?.updated_at
        ? new Date(latest[0].updated_at).toLocaleDateString('pl-PL')
        : '—',
      hint: latest?.[0]?.title ?? 'Brak edycji',
    },
  ];

  return (
    <>
      <Topbar
        title="Pulpit"
        subtitle="Witaj w panelu G-Lab CMS"
        actions={
          <div className="flex flex-wrap gap-2">
            {SITE_URL && (
              <a href={SITE_URL} target="_blank" rel="noreferrer" className="btn-secondary">
                Strona ↗
              </a>
            )}
            <Link href="/realizacje/new" className="btn-primary">
              <span aria-hidden>＋</span> Nowa realizacja
            </Link>
          </div>
        }
      />

      <main className="p-5 md:p-8 space-y-8">
        {/* Statystyki */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => {
            const Wrap = s.href ? Link : 'div';
            const wrapProps = s.href ? { href: s.href } : {};
            return (
              <Wrap
                key={s.label}
                {...(wrapProps as { href: string })}
                className={[
                  'card p-6',
                  s.href ? 'card-hover' : '',
                  s.accent ? 'border-accent/40' : '',
                ].join(' ')}
              >
                <div className="text-xs uppercase tracking-widest text-text-muted">{s.label}</div>
                <div className="mt-2 text-3xl font-bold tracking-tight">{s.value as React.ReactNode}</div>
                {s.hint && <div className="mt-1 text-xs text-text-muted">{s.hint}</div>}
              </Wrap>
            );
          })}
        </section>

        {/* Najnowsze realizacje */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Najnowsze realizacje</h2>
              <p className="section-subtitle">Tak wyglądają kafelki na stronie publicznej.</p>
            </div>
            <Link href="/realizacje" className="btn-secondary text-xs">Zobacz wszystkie</Link>
          </div>

          {latest && latest.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(latest as Realization[]).map((r) => <RealizationCard key={r.id} r={r} />)}
            </div>
          ) : (
            <div className="card p-10 text-center text-text-muted">
              Brak realizacji. <Link href="/realizacje/new" className="text-accent hover:underline">Dodaj pierwszą</Link>.
            </div>
          )}
        </section>
      </main>
    </>
  );
}
