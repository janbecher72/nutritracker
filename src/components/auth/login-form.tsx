'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus('error');
      setError(error.message);
      return;
    }
    setStatus('sent');
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Přihlášení</CardTitle>
        <CardDescription>
          Pošleme ti magic link na email — nepotřebuješ heslo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'sent' ? (
          <div className="text-emerald-400 text-sm">
            ✓ Magic link odeslán na <strong>{email}</strong>. Otevři ho ve stejném prohlížeči.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="ty@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'sending'}
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={status === 'sending'}>
              {status === 'sending' ? 'Odesílám…' : 'Poslat magic link'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
