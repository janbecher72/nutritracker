import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4">NutriTracker</h1>
      <p className="text-lg text-zinc-400 max-w-xl mb-8">
        Osobní tracker maker, mikronutrientů, kalorií a glykemického load. Postavený pro
        sportovce, kteří chtějí vidět trendy ve své stravě.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-base h-11 px-6 font-medium transition-colors"
      >
        Přihlásit se
      </Link>
    </main>
  );
}
