import Link from 'next/link';
import { notFound } from 'next/navigation';
import Topbar from '@/components/Topbar';
import RealizationForm from '../../RealizationForm';
import { createClient } from '@/lib/supabase/server';
import type { Realization } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditRealizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('realizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) notFound();
  const r = data as Realization;

  return (
    <>
      <Topbar
        title={r.title}
        subtitle={`Edycja realizacji · /realizacje/${r.slug}`}
        actions={<Link href="/realizacje" className="btn-secondary text-xs">← Wróć</Link>}
      />
      <main className="p-5 md:p-8">
        <RealizationForm initial={r} />
      </main>
    </>
  );
}
