'use client';

import { useEffect, useState } from 'react';
import type { Database } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];

export function IngredientBrowser({
  initialResults,
  initialQuery,
}: {
  initialResults: Ingredient[];
  initialQuery: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q === initialQuery) return;
    if (q.length > 0 && q.length < 2) return;

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (q.length >= 2) {
          const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}&limit=50`);
          const json = await res.json();
          setResults(json.results ?? []);
        } else {
          setResults(initialResults);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, initialResults, initialQuery]);

  return (
    <div className="space-y-4">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Hledat potravinu (CZ nebo EN)…"
      />

      {loading && <div className="text-sm text-zinc-400">Načítám…</div>}

      <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
        {results.length === 0 && !loading && (
          <div className="p-4 text-sm text-zinc-400">Žádné výsledky.</div>
        )}
        {results.map((r) => (
          <div key={r.id} className="p-3 flex items-center gap-3 hover:bg-zinc-900/50">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {r.name_cs ?? r.name_en}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {r.name_cs ? r.name_en : null}
                {r.category && (r.name_cs ? ` · ${r.category}` : r.category)}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-300 tabular-nums">
              <span>{r.kcal ? `${Math.round(r.kcal)} kcal` : '—'}</span>
              <span className="text-zinc-500">B {r.protein_g?.toFixed(0) ?? '—'}</span>
              <span className="text-zinc-500">S {r.carb_g?.toFixed(0) ?? '—'}</span>
              <span className="text-zinc-500">T {r.fat_g?.toFixed(0) ?? '—'}</span>
            </div>
            {r.gi != null && (
              <Badge variant={r.gi_source === 'measured' ? 'measured' : 'estimated_composition'}>
                GI {r.gi}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
