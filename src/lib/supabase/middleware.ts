import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDemoMode } from '@/lib/demo';

/**
 * Wymusza ważną sesję dla wszystkich tras poza /login (i statykami).
 * Niezalogowani -> redirect na /login.
 * Zalogowani odwiedzający /login -> redirect na /.
 *
 * W trybie DEMO (brak NEXT_PUBLIC_SUPABASE_URL) - całość pomijamy,
 * panel jest dostępny od razu, bez logowania.
 */
export async function updateSession(request: NextRequest) {
  if (isDemoMode()) {
    const url = request.nextUrl;
    if (url.pathname.startsWith('/login')) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = '/';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const isLogin = url.pathname.startsWith('/login');
  const isAuth  = url.pathname.startsWith('/auth');

  if (!user && !isLogin && !isAuth) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', url.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLogin) {
    const redirectUrl = url.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
