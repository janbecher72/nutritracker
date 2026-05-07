/**
 * Fetch all diary rows in a date range and resolve them into NutritionRows
 * grouped by date. Single source of truth for dashboard + day calculations.
 */

import { createClient } from '@/lib/supabase/server';
import { ingredientToRow, recipeToRow, adhocToRow } from '@/lib/nutrition/resolve';
import { sumDay } from '@/lib/nutrition/calculate';
import type { DayTotals, NutritionRow } from '@/types/domain';

export async function fetchDailyTotals(
  fromDate: string,
  toDate: string
): Promise<DayTotals[]> {
  const supabase = await createClient();
  const start = new Date(`${fromDate}T00:00:00`).toISOString();
  const end = new Date(`${toDate}T23:59:59.999`).toISOString();

  const { data: entries, error } = await supabase
    .from('diary_entries')
    .select(
      `
      *,
      ingredient:ingredients(*),
      recipe:recipes(*, recipe_ingredients(*, ingredient:ingredients(*)))
    `
    )
    .gte('eaten_at', start)
    .lte('eaten_at', end);

  if (error || !entries) return [];

  // Group rows by local date
  const byDate = new Map<string, NutritionRow[]>();
  for (const e of entries) {
    const localDate = new Date(e.eaten_at).toISOString().split('T')[0];
    let row: NutritionRow | null = null;
    if (e.source_type === 'ingredient' && e.ingredient && e.amount_g) {
      row = ingredientToRow(e.ingredient, Number(e.amount_g));
    } else if (e.source_type === 'recipe' && e.recipe && e.servings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row = recipeToRow(e.recipe as any, Number(e.servings));
    } else if (e.source_type === 'adhoc') {
      row = adhocToRow(e);
    }
    if (!row) continue;
    if (!byDate.has(localDate)) byDate.set(localDate, []);
    byDate.get(localDate)!.push(row);
  }

  // Generate one DayTotals per date in range (filling missing with zeros)
  const out: DayTotals[] = [];
  const current = new Date(`${fromDate}T00:00:00`);
  const last = new Date(`${toDate}T00:00:00`);
  while (current <= last) {
    const iso = current.toISOString().split('T')[0];
    const rows = byDate.get(iso) ?? [];
    out.push(sumDay(iso, rows));
    current.setDate(current.getDate() + 1);
  }
  return out;
}
