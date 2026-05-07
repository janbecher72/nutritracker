'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteDiaryEntry, updateDiaryEntry } from '@/app/actions/diary';
import { ingredientToRow, recipeToRow, adhocToRow } from '@/lib/nutrition/resolve';
import { Trash2, Pencil, Check, X } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DiaryEntryRow({ entry }: { entry: any }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState<string>(
    entry.source_type === 'ingredient'
      ? String(entry.amount_g ?? '')
      : entry.source_type === 'recipe'
        ? String(entry.servings ?? '')
        : ''
  );
  const [pending, startTransition] = useTransition();

  const row =
    entry.source_type === 'ingredient' && entry.ingredient && entry.amount_g
      ? ingredientToRow(entry.ingredient, Number(entry.amount_g))
      : entry.source_type === 'recipe' && entry.recipe && entry.servings
        ? recipeToRow(entry.recipe, Number(entry.servings))
        : entry.source_type === 'adhoc'
          ? adhocToRow(entry)
          : null;

  const name =
    entry.source_type === 'ingredient'
      ? entry.ingredient?.name_cs ?? entry.ingredient?.name_en ?? '?'
      : entry.source_type === 'recipe'
        ? entry.recipe?.name ?? '?'
        : entry.adhoc_name ?? '?';

  const portionLabel =
    entry.source_type === 'ingredient'
      ? `${Number(entry.amount_g).toFixed(0)} g`
      : entry.source_type === 'recipe'
        ? `${Number(entry.servings).toFixed(1)} ×`
        : 'ad-hoc';

  function handleSave() {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    const patch =
      entry.source_type === 'ingredient'
        ? { amount_g: num }
        : entry.source_type === 'recipe'
          ? { servings: num }
          : {};
    startTransition(async () => {
      await updateDiaryEntry(entry.id, patch);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm('Smazat záznam?')) return;
    startTransition(async () => {
      await deleteDiaryEntry(entry.id);
    });
  }

  return (
    <div className="px-4 py-2 flex items-center gap-3 hover:bg-zinc-900/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 truncate">{name}</div>
        <div className="text-xs text-zinc-500 flex gap-2">
          {editing && entry.source_type !== 'adhoc' ? (
            <Input
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="h-6 w-20 text-xs"
            />
          ) : (
            <span>{portionLabel}</span>
          )}
        </div>
      </div>
      {row && (
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-300 tabular-nums">
          <span>{Math.round(row.kcal)} kcal</span>
          <span className="text-zinc-500">B {row.protein_g.toFixed(0)}</span>
          <span className="text-zinc-500">S {row.carb_g.toFixed(0)}</span>
          <span className="text-zinc-500">T {row.fat_g.toFixed(0)}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <Button size="icon" variant="ghost" onClick={handleSave} disabled={pending}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {entry.source_type !== 'adhoc' && (
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={handleDelete} disabled={pending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
