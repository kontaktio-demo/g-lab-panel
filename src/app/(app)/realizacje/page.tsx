import Link from 'next/link';
import Topbar from '@/components/Topbar';
import RealizationCard from '@/components/RealizationCard';
import { createClient } from '@/lib/supabase/server';
import type { Realization } from '@/lib/types';
import RealizacjeFilters from './RealizacjeFilters';

export const dynamic = 'force-dynamic';

export default async function RealizacjeListPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim().toLowerCase();
  const statusFilter = (params.status ?? '') as '' | 'published' | 'draft';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('realizations')
    .select('*')
    .order('data', { ascending: false });

  const all = (data ?? []) as Realization[];
  const items = all.filter((r) => {
    if (statusFilter === 'published' && !r.published) return false;
    if (statusFilter === 'draft' && r.published) return false;
    if (q) {
      const hay = `${r.title} ${r.samochod ?? ''} ${r.marka ?? ''} ${r.slug}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    total: all.length,
    published: all.filter((r) => r.published).length,
    drafts: all.filter((r) => !r.published).length,
  };

  return (
    <>
      <Topbar
        title="Realizacje"
        subtitle={`${counts.total} łącznie · ${counts.published} opublikowanych · ${counts.drafts} szkiców`}
        actions={<Link href="/realizacje/new" className="btn-primary"><span aria-hidden>＋</span> Nowa realizacja</Link>}
      />

      <main className="p-5 md:p-8 space-y-5">
        {params?.deleted === '1' && (
          <div className="text-sm text-success bg-success/10 border border-success/30 rounded-md px-3 py-2">
            Realizacja została usunięta.
          </div>
        )}
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            Błąd: {error.message}
          </div>
        )}

        <RealizacjeFilters initialQ={q} initialStatus={statusFilter} />

        {items.length === 0 ? (
          all.length === 0 ? (
            <div className="card p-14 text-center">
              <div className="text-5xl mb-3">★</div>
              <h2 className="text-xl font-bold mb-1">Brak realizacji</h2>
              <p className="text-text-muted mb-5">
                Dodaj pierwszą realizację — pojawi się jako kafelek na stronie publicznej.
              </p>
              <Link href="/realizacje/new" className="btn-primary inline-flex">
                <span aria-hidden>＋</span> Dodaj realizację
              </Link>
            </div>
          ) : (
            <div className="card p-10 text-center text-text-muted">
              Brak wyników dla bieżących filtrów.
            </div>
          )
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((r) => <RealizationCard key={r.id} r={r} />)}
          </div>
        )}
      </main>
    </>
  );
}
