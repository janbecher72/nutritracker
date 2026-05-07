'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IngredientSearch } from '@/components/ingredient-search';
import { RecipePicker } from '@/components/diary/recipe-picker';
import { addDiaryEntry } from '@/app/actions/diary';
import { MEAL_CATEGORIES } from '@/lib/meals';
import type { Database, MealCategory } from '@/types/database';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type Recipe = Database['public']['Tables']['recipes']['Row'];

type Tab = 'ingredient' | 'recipe' | 'adhoc';

export function AddEntryDialog({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('ingredient');
  const [meal, setMeal] = useState<MealCategory>('breakfast');
  const [pending, startTransition] = useTransition();

  // Ingredient tab state
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [amountG, setAmountG] = useState<string>('100');

  // Recipe tab state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState<string>('1');

  // Adhoc tab state
  const [adhoc, setAdhoc] = useState({
    name: '',
    kcal: '',
    protein_g: '',
    carb_g: '',
    fat_g: '',
    fiber_g: '',
    sugar_g: '',
  });

  function reset() {
    setSelectedIngredient(null);
    setSelectedRecipe(null);
    setAmountG('100');
    setServings('1');
    setAdhoc({ name: '', kcal: '', protein_g: '', carb_g: '', fat_g: '', fiber_g: '', sugar_g: '' });
  }

  function eatenAtFor(mealCat: MealCategory): string {
    const cat = MEAL_CATEGORIES.find((c) => c.value === mealCat);
    const hour = cat?.defaultHour ?? 12;
    return `${date}T${String(hour).padStart(2, '0')}:00:00`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const eaten_at = eatenAtFor(meal);
      let result: { success?: boolean; error?: string };

      if (tab === 'ingredient') {
        if (!selectedIngredient) {
          alert('Vyber potravinu.');
          return;
        }
        const num = Number(amountG);
        if (!Number.isFinite(num) || num <= 0) {
          alert('Zadej kladnou gramáž.');
          return;
        }
        result = await addDiaryEntry({
          source_type: 'ingredient',
          ingredient_id: selectedIngredient.id,
          amount_g: num,
          meal_category: meal,
          eaten_at,
        });
      } else if (tab === 'recipe') {
        if (!selectedRecipe) {
          alert('Vyber recept.');
          return;
        }
        const num = Number(servings);
        if (!Number.isFinite(num) || num <= 0) {
          alert('Zadej kladný počet porcí.');
          return;
        }
        result = await addDiaryEntry({
          source_type: 'recipe',
          recipe_id: selectedRecipe.id,
          servings: num,
          meal_category: meal,
          eaten_at,
        });
      } else {
        if (!adhoc.name.trim() || !adhoc.kcal) {
          alert('Vyplň název a kalorie.');
          return;
        }
        result = await addDiaryEntry({
          source_type: 'adhoc',
          adhoc_name: adhoc.name.trim(),
          adhoc_kcal: Number(adhoc.kcal),
          adhoc_protein_g: adhoc.protein_g ? Number(adhoc.protein_g) : null,
          adhoc_carb_g: adhoc.carb_g ? Number(adhoc.carb_g) : null,
          adhoc_fat_g: adhoc.fat_g ? Number(adhoc.fat_g) : null,
          adhoc_fiber_g: adhoc.fiber_g ? Number(adhoc.fiber_g) : null,
          adhoc_sugar_g: adhoc.sugar_g ? Number(adhoc.sugar_g) : null,
          meal_category: meal,
          eaten_at,
        });
      }

      if (result?.error) {
        alert(`Chyba: ${result.error}`);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Přidat záznam</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Přidat záznam do deníku</DialogTitle>
            <DialogDescription>Datum: {date}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-800 rounded-md">
              {(['ingredient', 'recipe', 'adhoc'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t === 'ingredient' ? 'Potravina' : t === 'recipe' ? 'Recept' : 'Vlastní'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Jídlo</Label>
              <Select value={meal} onChange={(e) => setMeal(e.target.value as MealCategory)}>
                {MEAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>

            {tab === 'ingredient' && (
              <>
                <div className="space-y-2">
                  <Label>Potravina</Label>
                  {selectedIngredient ? (
                    <div className="flex items-center justify-between p-2 rounded-md border border-zinc-700">
                      <span className="text-sm">
                        {selectedIngredient.name_cs ?? selectedIngredient.name_en}
                      </span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIngredient(null)}>
                        Změnit
                      </Button>
                    </div>
                  ) : (
                    <IngredientSearch onSelect={setSelectedIngredient} autoFocus />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Gramáž (g)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={amountG}
                    onChange={(e) => setAmountG(e.target.value)}
                  />
                </div>
              </>
            )}

            {tab === 'recipe' && (
              <>
                <div className="space-y-2">
                  <Label>Recept</Label>
                  {selectedRecipe ? (
                    <div className="flex items-center justify-between p-2 rounded-md border border-zinc-700">
                      <span className="text-sm">{selectedRecipe.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedRecipe(null)}>
                        Změnit
                      </Button>
                    </div>
                  ) : (
                    <RecipePicker onSelect={setSelectedRecipe} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Počet porcí</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                </div>
              </>
            )}

            {tab === 'adhoc' && (
              <div className="space-y-3">
                <div>
                  <Label>Název</Label>
                  <Input
                    value={adhoc.name}
                    onChange={(e) => setAdhoc({ ...adhoc, name: e.target.value })}
                    placeholder="Pizza v restauraci"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kalorie</Label>
                    <Input
                      type="number"
                      value={adhoc.kcal}
                      onChange={(e) => setAdhoc({ ...adhoc, kcal: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Bílkoviny (g)</Label>
                    <Input
                      type="number"
                      value={adhoc.protein_g}
                      onChange={(e) => setAdhoc({ ...adhoc, protein_g: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sacharidy (g)</Label>
                    <Input
                      type="number"
                      value={adhoc.carb_g}
                      onChange={(e) => setAdhoc({ ...adhoc, carb_g: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tuky (g)</Label>
                    <Input
                      type="number"
                      value={adhoc.fat_g}
                      onChange={(e) => setAdhoc({ ...adhoc, fat_g: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Vláknina (g)</Label>
                    <Input
                      type="number"
                      value={adhoc.fiber_g}
                      onChange={(e) => setAdhoc({ ...adhoc, fiber_g: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cukry (g)</Label>
                    <Input
                      type="number"
                      value={adhoc.sugar_g}
                      onChange={(e) => setAdhoc({ ...adhoc, sugar_g: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Ukládám…' : 'Přidat'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
