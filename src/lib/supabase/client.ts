import { createBrowserClient } from '@supabase/ssr';
import { createDemoClient, isDemoMode } from '@/lib/demo';

export function createClient() {
  if (isDemoMode()) {
    return createDemoClient() as unknown as ReturnType<typeof createBrowserClient>;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
