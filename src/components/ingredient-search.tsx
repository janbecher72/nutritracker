'use client';

import { useEffect, useRef, useState } from 'react';
import type { Database } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];

interface ResultItem extends Ingredient {
  /** transient marker — true if this row was just fetched from OFF (not yet visible elsewhere) */
  _justFetched?: boolean;
}

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
  const [localResults, setLocalResults] = useState<ResultItem[]>([]);
  const [externalResults, setExternalResults] = useState<ResultItem[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const externalAbortRef = useRef<AbortController | null>(null);

  // Merged + dedup'd list (OFF results filtered if same off_code already in local)
  const merged: ResultItem[] = (() => {
    const seenIds = new Set(localResults.map((r) => r.id));
    const seenOff = new Set(
      localResults.map((r) => r.off_code).filter((x): x is string => !!x)
    );
    const extraExternal = externalResults.filter(
      (r) => !seenIds.has(r.id) && !(r.off_code && seenOff.has(r.off_code))
    );
    return [...localResults, ...extraExternal];
  })();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (externalAbortRef.current) externalAbortRef.current.abort();
    if (q.length < 2) {
      setLocalResults([]);
      setExternalResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingLocal(true);
      setLoadingExternal(true);
      setExternalResults([]);
      setOpen(true);
      setHighlighted(0);

      // Local search — fast, immediate
      try {
        const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setLocalResults((json.results ?? []) as ResultItem[]);
      } catch {
        setLocalResults([]);
      } finally {
        setLoadingLocal(false);
      }

      // External search — runs in parallel, slower
      const abort = new AbortController();
      externalAbortRef.current = abort;
      try {
        const res = await fetch(
          `/api/ingredients/search-external?q=${encodeURIComponent(q)}&limit=8`,
          { signal: abort.signal }
        );
        if (res.ok) {
          const json = await res.json();
          setExternalResults(
            ((json.results ?? []) as Ingredient[]).map((r) => ({ ...r, _justFetched: true }))
          );
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('External search failed:', (err as Error).message);
        }
      } finally {
        setLoadingExternal(false);
      }
    }, 300);
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
    if (idx >= 0 && idx < merged.length) {
      onSelect(merged[idx]);
      setQ('');
      setLocalResults([]);
      setExternalResults([]);
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
        onFocus={() => merged.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, merged.length - 1));
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
        <div className="absolute top-full left-0 right-0 mt-1 max-h-96 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl z-20">
          {loadingLocal && merged.length === 0 && (
            <div className="p-3 text-sm text-zinc-400">Hledám…</div>
          )}

          {merged.map((r, i) => (
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
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-100 truncate flex items-center gap-2">
                    {r.name_cs ?? r.name_en}
                    {r.source === 'off' && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        OFF
                      </Badge>
                    )}
                    {r.source === 'custom' && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        vlastní
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {r.name_cs ? r.name_en : r.category}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="text-zinc-300 tabular-nums">
                    {r.kcal ? `${Math.round(Number(r.kcal))} kcal` : '—'}
                  </span>
                  {r.gi != null && (
                    <Badge variant={giBadgeVariant(r.gi_source)}>
                      GI {Number(r.gi).toFixed(0)}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}

          {loadingExternal && (
            <div className="px-3 py-2 text-xs text-zinc-500 border-t border-zinc-800 italic">
              Hledám další v Open Food Facts…
            </div>
          )}

          {!loadingLocal && !loadingExternal && merged.length === 0 && q.length >= 2 && (
            <div className="p-3 text-sm text-zinc-400">
              Nic jsme nenašli — můžeš přidat <a href="/ingredients/new" className="underline">vlastní potravinu</a>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function giBadgeVariant(
  source: string
): 'measured' | 'estimated_category' | 'estimated_composition' | 'user_override' | 'na' {
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
