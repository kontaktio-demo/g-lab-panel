import LeadsClient from './LeadsClient';
import Topbar from '@/components/Topbar';

export const dynamic = 'force-dynamic';

export default function LeadsPage() {
  return (
    <>
      <Topbar
        title="Skrzynka zapytań"
        subtitle="Wszystkie zapytania z formularzy na stronie (kontakt, wycena)."
      />
      <main className="p-5 md:p-8">
        <LeadsClient />
      </main>
    </>
  );
}
