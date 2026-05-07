'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IngredientSearch } from '@/components/ingredient-search';
import { createRecipe, updateRecipe } from '@/app/actions/recipes';
import { ingredientToRow } from '@/lib/nutrition/resolve';
import { sumRows, weightedGI, totalGL } from '@/lib/nutrition/calculate';
import { Trash2 } from 'lucide-react';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];

interface RecipeIngredientRow {
  ingredient: Ingredient;
  amount_g: number;
}

interface RecipeFormProps {
  initial?: {
    id: string;
    name: string;
    servings: number;
    tags: string[];
    notes: string | null;
    rating: number | null;
    ingredients: RecipeIngredientRow[];
  };
}

export function RecipeForm({ initial }: RecipeFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [servings, setServings] = useState<string>(String(initial?.servings ?? 1));
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [items, setItems] = useState<RecipeIngredientRow[]>(initial?.ingredients ?? []);
  const [pending, startTransition] = useTransition();

  // Live nutritional preview per serving
  const preview = useMemo(() => {
    const rows = items.map((it) => ingredientToRow(it.ingredient, it.amount_g));
    const { macros } = sumRows(rows);
    const gi = weightedGI(rows);
    const gl = totalGL(rows);
    const factor = Number(servings) > 0 ? 1 / Number(servings) : 0;
    return {
      kcal: macros.kcal * factor,
      protein_g: macros.protein_g * factor,
      carb_g: macros.carb_g * factor,
      fat_g: macros.fat_g * factor,
      fiber_g: macros.fiber_g * factor,
      gi,
      gl: gl * factor,
    };
  }, [items, servings]);

  function addIngredient(ing: Ingredient) {
    setItems([...items, { ingredient: ing, amount_g: 100 }]);
  }

  function updateAmount(idx: number, amount_g: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, amount_g } : it)));
  }

  function removeAt(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert('Zadej název.');
      return;
    }
    if (items.length === 0) {
      alert('Recept musí mít alespoň jednu ingredienci.');
      return;
    }
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      servings: Number(servings),
      tags,
      notes: notes.trim() || null,
      rating,
      ingredients: items.map((it) => ({
        ingredient_id: it.ingredient.id,
        amount_g: it.amount_g,
      })),
    };

    startTransition(async () => {
      const result = initial
        ? await updateRecipe(initial.id, payload)
        : await createRecipe(payload);

      if (result?.error) {
        alert(`Chyba: ${result.error}`);
        return;
      }
      router.push('/recipes');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Název</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Počet porcí</Label>
          <Input
            type="number"
            min="0.1"
            step="0.5"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Hodnocení</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                className={`text-2xl ${
                  rating && n <= rating ? 'text-yellow-400' : 'text-zinc-700'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Tagy (oddělené čárkou)</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="pre-workout, high-protein, rychlovka"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Poznámky</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Ingredience</Label>
        <IngredientSearch onSelect={addIngredient} />
        <div className="rounded-md border border-zinc-800 divide-y divide-zinc-800">
          {items.length === 0 && (
            <div className="p-3 text-sm text-zinc-500">Zatím žádné ingredience.</div>
          )}
          {items.map((it, idx) => (
            <div key={idx} className="p-3 flex items-center gap-3">
              <div className="flex-1 text-sm">
                {it.ingredient.name_cs ?? it.ingredient.name_en}
              </div>
              <Input
                type="number"
                min="1"
                value={it.amount_g}
                onChange={(e) => updateAmount(idx, Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-zinc-500">g</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAt(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
          Nutriční hodnoty na 1 porci
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm tabular-nums">
          <div>
            <div className="text-xl font-bold">{Math.round(preview.kcal)}</div>
            <div className="text-xs text-zinc-500">kcal</div>
          </div>
          <div>
            <div className="font-semibold">{preview.protein_g.toFixed(1)} g</div>
            <div className="text-xs text-zinc-500">bílkoviny</div>
          </div>
          <div>
            <div className="font-semibold">{preview.carb_g.toFixed(1)} g</div>
            <div className="text-xs text-zinc-500">sacharidy</div>
          </div>
          <div>
            <div className="font-semibold">{preview.fat_g.toFixed(1)} g</div>
            <div className="text-xs text-zinc-500">tuky</div>
          </div>
          <div>
            <div className="font-semibold">{preview.fiber_g.toFixed(1)} g</div>
            <div className="text-xs text-zinc-500">vláknina</div>
          </div>
          <div>
            <div className="font-semibold">
              {preview.gi != null ? `GI ${preview.gi}` : 'GI —'}
            </div>
            <div className="text-xs text-zinc-500">GL {preview.gl.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Zrušit
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Ukládám…' : initial ? 'Uložit změny' : 'Vytvořit recept'}
        </Button>
      </div>
    </form>
  );
}
