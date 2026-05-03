import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Logowanie · G-Lab CMS' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg
                     bg-[radial-gradient(ellipse_at_top,_rgba(255, 0, 30,0.10),transparent_55%)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-[12px] bg-grad-accent items-center justify-center font-bold text-white text-xl shadow-elev mb-4">
            G
          </div>
          <h1 className="text-2xl font-bold tracking-tight">G-Lab CMS</h1>
          <p className="text-text-muted text-sm mt-1">Panel administracyjny</p>
        </div>

        <div className="card p-7">
          <Suspense fallback={null}><LoginForm /></Suspense>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Konto utworzysz w Supabase → Authentication → Users.
        </p>
      </div>
    </main>
  );
}
