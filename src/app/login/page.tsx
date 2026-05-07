import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-zinc-400">Načítám…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
