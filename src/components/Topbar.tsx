import { createClient } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';

export default async function Topbar({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-20 bg-bg/85 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-4 px-5 md:px-8 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="section-title truncate">{title}</h1>
          {subtitle && <p className="section-subtitle truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <div className="hidden sm:flex items-center gap-2 pl-3 ml-1 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-bg-elev-2 border border-border flex items-center justify-center text-xs font-semibold text-text-muted">
              {(user?.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="hidden md:block text-xs text-text-muted max-w-[160px] truncate">
              {user?.email}
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
