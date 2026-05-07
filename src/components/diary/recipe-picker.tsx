'use client';

import { useEffect, useState } from 'react';
import type { Database } from '@/types/database';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

type Recipe = Database['public']['Tables']['recipes']['Row'];

export function RecipePicker({ onSelect }: { onSelect: (r: Recipe) => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);
      setRecipes(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = q
    ? recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    : recipes;

  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtr…" autoFocus />
      <div className="max-h-60 overflow-y-auto rounded-md border border-zinc-800">
        {loading && <div className="p-3 text-sm text-zinc-400">Načítám…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-3 text-sm text-zinc-400">Žádný recept. Vytvoř nějaký na stránce Recepty.</div>
        )}
        {filtered.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r)}
            className="block w-full text-left px-3 py-2 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/60"
          >
            <div className="text-sm">{r.name}</div>
            <div className="text-xs text-zinc-500">{r.servings} porcí</div>
          </button>
        ))}
      </div>
    </div>
  );
}
