/**
 * Resolve a diary entry (ingredient / recipe / adhoc) into a NutritionRow
 * — i.e. compute the nutritional contribution scaled to the actual amount.
 */

import type { Database } from '@/types/database';
import type { NutritionRow, Micros } from '@/types/domain';

type Ingredient = Database['public']['Tables']['ingredients']['Row'];
type DiaryEntry = Database['public']['Tables']['diary_entries']['Row'];
type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row'];
type Recipe = Database['public']['Tables']['recipes']['Row'];

const MACRO_FIELDS = [
  'kcal',
  'protein_g',
  'carb_g',
  'sugar_g',
  'fat_g',
  'sat_fat_g',
  'fiber_g',
] as const;

/**
 * Convert an ingredient + amount (g) into a NutritionRow.
 * Ingredient fields are per 100 g — we scale by amount/100.
 */
export function ingredientToRow(
  ingredient: Ingredient,
  amount_g: number
): NutritionRow {
  const factor = amount_g / 100;
  const out: NutritionRow = {
    amount_g,
    kcal: (ingredient.kcal ?? 0) * factor,
    protein_g: (ingredient.protein_g ?? 0) * factor,
    carb_g: (ingredient.carb_g ?? 0) * factor,
    sugar_g: (ingredient.sugar_g ?? 0) * factor,
    fat_g: (ingredient.fat_g ?? 0) * factor,
    sat_fat_g: (ingredient.sat_fat_g ?? 0) * factor,
    fiber_g: (ingredient.fiber_g ?? 0) * factor,
    gi: ingredient.gi,
    micros: scaleMicros(ingredient.vitamins, ingredient.minerals, factor),
  };
  return out;
}

/**
 * Convert a recipe (with its ingredients already loaded) + servings count into a NutritionRow.
 * Computes the per-serving values, then multiplies by `servings`.
 */
export function recipeToRow(
  recipe: Recipe & {
    recipe_ingredients: (RecipeIngredient & { ingredient: Ingredient })[];
  },
  servings: number
): NutritionRow {
  // Sum nutritional totals for the whole recipe
  const totalRow: NutritionRow = {
    amount_g: 0,
    kcal: 0,
    protein_g: 0,
    carb_g: 0,
    sugar_g: 0,
    fat_g: 0,
    sat_fat_g: 0,
    fiber_g: 0,
    gi: null,
    micros: {},
  };

  let weightedGISum = 0;
  let weightedGITotal = 0;

  for (const ri of recipe.recipe_ingredients) {
    const row = ingredientToRow(ri.ingredient, ri.amount_g);
    totalRow.amount_g += row.amount_g;
    for (const f of MACRO_FIELDS) totalRow[f] += row[f];
    addMicros(totalRow.micros, row.micros);

    if (row.gi != null) {
      const availableCarb = Math.max(0, row.carb_g - row.fiber_g);
      weightedGISum += row.gi * availableCarb;
      weightedGITotal += availableCarb;
    }
  }

  totalRow.gi = weightedGITotal > 0 ? Math.round(weightedGISum / weightedGITotal) : null;

  // Scale by serving fraction (servings / recipe.servings)
  const factor = servings / recipe.servings;
  for (const f of MACRO_FIELDS) totalRow[f] *= factor;
  totalRow.amount_g *= factor;
  for (const k of Object.keys(totalRow.micros) as (keyof Micros)[]) {
    const v = totalRow.micros[k];
    if (v != null) totalRow.micros[k] = v * factor;
  }

  return totalRow;
}

/**
 * Build a NutritionRow from an ad-hoc diary entry (manually entered macros).
 */
export function adhocToRow(entry: DiaryEntry): NutritionRow {
  return {
    amount_g: 0,
    kcal: entry.adhoc_kcal ?? 0,
    protein_g: entry.adhoc_protein_g ?? 0,
    carb_g: entry.adhoc_carb_g ?? 0,
    sugar_g: entry.adhoc_sugar_g ?? 0,
    fat_g: entry.adhoc_fat_g ?? 0,
    sat_fat_g: 0,
    fiber_g: entry.adhoc_fiber_g ?? 0,
    gi: null,
    micros: {},
  };
}

function scaleMicros(
  vitamins: unknown,
  minerals: unknown,
  factor: number
): Micros {
  const out: Micros = {};
  for (const obj of [vitamins, minerals]) {
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, number>)) {
        if (typeof v === 'number') {
          out[k as keyof Micros] = v * factor;
        }
      }
    }
  }
  return out;
}

function addMicros(target: Micros, source: Micros) {
  for (const k of Object.keys(source) as (keyof Micros)[]) {
    const v = source[k];
    if (v == null) continue;
    target[k] = (target[k] ?? 0) + v;
  }
}
