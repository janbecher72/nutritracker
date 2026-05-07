'use client';

import { useEffect, useRef, useState } from 'react';
import type { Database } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];

export function IngredientSearch({
  onSelect,
  placeholder = 'Hledat potravinu…',
  autoFocus,
}: {
  onSelect: (ingredient: Ingredient) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(json.results ?? []);
        setOpen(true);
        setHighlighted(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function pickByIndex(idx: number) {
    if (idx >= 0 && idx < results.length) {
      onSelect(results[idx]);
      setQ('');
      setResults([]);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pickByIndex(highlighted);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl z-20">
          {loading && (
            <div className="p-3 text-sm text-zinc-400">Hledám…</div>
          )}
          {!loading && results.length === 0 && q.length >= 2 && (
            <div className="p-3 text-sm text-zinc-400">Žádné výsledky.</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pickByIndex(i)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                'w-full text-left px-3 py-2 border-b border-zinc-800 last:border-0',
                highlighted === i ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 truncate">
                    {r.name_cs ?? r.name_en}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {r.name_cs ? r.name_en : r.category}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="text-zinc-300 tabular-nums">
                    {r.kcal ? `${Math.round(r.kcal)} kcal` : '—'}
                  </span>
                  {r.gi != null && (
                    <Badge variant={giBadgeVariant(r.gi_source)}>GI {r.gi}</Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function giBadgeVariant(source: string): 'measured' | 'estimated_category' | 'estimated_composition' | 'user_override' | 'na' {
  switch (source) {
    case 'measured':
      return 'measured';
    case 'estimated_category':
      return 'estimated_category';
    case 'estimated_composition':
      return 'estimated_composition';
    case 'user_override':
      return 'user_override';
    default:
      return 'na';
  }
}
