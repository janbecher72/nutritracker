import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Next.js 16: cookies() is async — must be awaited before use.
 *
 * Note: We omit the <Database> generic here because the hand-written types in
 * src/types/database.ts don't match the latest @supabase/ssr generic shape.
 * Once you run `supabase gen types`, switch to the generated types and add the generic.
 */
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
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies; safe to ignore.
            // Middleware refreshes the session.
          }
        },
      },
    }
  );
}

/**
 * Privileged admin client (service_role). Server-only.
 * Bypasses Row-Level Security. Use only for trusted server-side operations
 * (USDA import, GI seed, snapshot recalculation).
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // no-op
        },
      },
    }
  );
}
