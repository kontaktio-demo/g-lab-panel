import Link from 'next/link';
import Topbar from '@/components/Topbar';
import RealizationForm from '../RealizationForm';

export const dynamic = 'force-dynamic';

export default function NewRealizationPage() {
  return (
    <>
      <Topbar
        title="Nowa realizacja"
        subtitle="Dodaj nową realizację do bazy"
        actions={<Link href="/realizacje" className="btn-secondary text-xs">← Wróć</Link>}
      />
      <main className="p-5 md:p-8">
        <RealizationForm />
      </main>
    </>
  );
}
