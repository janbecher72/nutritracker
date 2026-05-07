import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <>
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-lg">
              NutriTracker
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-zinc-300 hover:text-white">
                Dashboard
              </Link>
              <Link href="/diary" className="text-zinc-300 hover:text-white">
                Deník
              </Link>
              <Link href="/recipes" className="text-zinc-300 hover:text-white">
                Recepty
              </Link>
              <Link href="/ingredients" className="text-zinc-300 hover:text-white">
                Potraviny
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-400 hidden sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </nav>
        <nav className="sm:hidden border-t border-zinc-800 px-4 py-2 flex gap-4 text-sm overflow-x-auto">
          <Link href="/dashboard" className="text-zinc-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/diary" className="text-zinc-300 hover:text-white">
            Deník
          </Link>
          <Link href="/recipes" className="text-zinc-300 hover:text-white">
            Recepty
          </Link>
          <Link href="/ingredients" className="text-zinc-300 hover:text-white">
            Potraviny
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </>
  );
}
