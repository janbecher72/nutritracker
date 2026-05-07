import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the user's auth session on every request and forwards refreshed cookies.
 * Called from the project-root middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching getUser() refreshes the access token if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect app routes — redirect unauthenticated users to /login.
  const path = request.nextUrl.pathname;
  const isPublic =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/auth');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}
