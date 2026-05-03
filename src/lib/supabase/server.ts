import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createJsClient } from '@supabase/supabase-js';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Wywołane z Server Component - można zignorować, middleware odświeży sesję.
          }
        },
      },
    }
  );
}

/**
 * Klient z service_role - omija RLS.
 * Używać WYŁĄCZNIE w Route Handlers / Server Actions, NIGDY w komponentach klienckich.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY i NEXT_PUBLIC_SUPABASE_URL muszą być ustawione.');
  }
  return createJsClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
