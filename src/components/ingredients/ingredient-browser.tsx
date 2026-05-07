'use client';

import { useEffect, useState, useTransition } from 'react';
import type { Database } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateIngredientCzechName } from '@/app/actions/ingredients';
import { Pencil, Check, X } from 'lucide-react';

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

  function patchLocal(id: string, patch: Partial<Ingredient>) {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

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
          <IngredientRow key={r.id} ingredient={r} onUpdate={patchLocal} />
        ))}
      </div>
    </div>
  );
}

function IngredientRow({
  ingredient: r,
  onUpdate,
}: {
  ingredient: Ingredient;
  onUpdate: (id: string, patch: Partial<Ingredient>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.name_cs ?? '');
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const value = draft.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await updateIngredientCzechName({ id: r.id, name_cs: value });
      if (result?.error) {
        alert(`Chyba: ${result.error}`);
        return;
      }
      onUpdate(r.id, { name_cs: value });
      setEditing(false);
    });
  }

  return (
    <div className="p-3 flex items-center gap-3 hover:bg-zinc-900/50">
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') {
                  setDraft(r.name_cs ?? '');
                  setEditing(false);
                }
              }}
              placeholder="Český název"
              className="h-8"
            />
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={pending}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setDraft(r.name_cs ?? '');
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium truncate flex items-center gap-2">
              {r.name_cs ?? <span className="text-zinc-500 italic">— bez českého názvu —</span>}
              <button
                type="button"
                onClick={() => {
                  setDraft(r.name_cs ?? '');
                  setEditing(true);
                }}
                className="text-zinc-600 hover:text-zinc-300"
                title="Upravit český název"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <div className="text-xs text-zinc-500 truncate">
              {r.name_en}
              {r.category && ` · ${r.category}`}
            </div>
          </>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-300 tabular-nums">
        <span>{r.kcal ? `${Math.round(Number(r.kcal))} kcal` : '—'}</span>
        <span className="text-zinc-500">B {r.protein_g != null ? Number(r.protein_g).toFixed(0) : '—'}</span>
        <span className="text-zinc-500">S {r.carb_g != null ? Number(r.carb_g).toFixed(0) : '—'}</span>
        <span className="text-zinc-500">T {r.fat_g != null ? Number(r.fat_g).toFixed(0) : '—'}</span>
      </div>
      {r.gi != null && (
        <Badge
          variant={
            r.gi_source === 'measured'
              ? 'measured'
              : r.gi_source === 'estimated_category'
                ? 'estimated_category'
                : 'estimated_composition'
          }
        >
          GI {Number(r.gi).toFixed(0)}
        </Badge>
      )}
    </div>
  );
}
