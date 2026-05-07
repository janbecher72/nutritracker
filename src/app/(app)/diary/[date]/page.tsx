import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { sumDay } from '@/lib/nutrition/calculate';
import { ingredientToRow, recipeToRow, adhocToRow } from '@/lib/nutrition/resolve';
import type { NutritionRow } from '@/types/domain';
import { MEAL_CATEGORIES, MEAL_LABELS } from '@/lib/meals';
import { DiaryEntryRow } from '@/components/diary/diary-entry-row';
import { AddEntryDialog } from '@/components/diary/add-entry-dialog';
import { CopyFromYesterdayButton } from '@/components/diary/copy-yesterday';
import { DayTotals } from '@/components/diary/day-totals';

function dateRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);
  return { start: start.toISOString(), end: end.toISOString() };
}

function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

export default async function DiaryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const { start, end } = dateRange(date);

  const { data: entries, error } = await supabase
    .from('diary_entries')
    .select(
      `
      *,
      ingredient:ingredients(*),
      recipe:recipes(
        *,
        recipe_ingredients(*, ingredient:ingredients(*))
      )
    `
    )
    .gte('eaten_at', start)
    .lte('eaten_at', end)
    .order('eaten_at', { ascending: true });

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Chyba načítání: {error.message}
      </div>
    );
  }

  const entriesByMeal = new Map<string, typeof entries>();
  for (const cat of MEAL_CATEGORIES) entriesByMeal.set(cat.value, []);
  for (const e of entries ?? []) {
    const arr = entriesByMeal.get(e.meal_category) ?? [];
    arr.push(e);
    entriesByMeal.set(e.meal_category, arr);
  }

  // Build NutritionRows for day total
  const allRows: NutritionRow[] = [];
  for (const e of entries ?? []) {
    if (e.source_type === 'ingredient' && e.ingredient && e.amount_g) {
      allRows.push(ingredientToRow(e.ingredient, Number(e.amount_g)));
    } else if (e.source_type === 'recipe' && e.recipe && e.servings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allRows.push(recipeToRow(e.recipe as any, Number(e.servings)));
    } else if (e.source_type === 'adhoc') {
      allRows.push(adhocToRow(e));
    }
  }
  const totals = sumDay(date, allRows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={`/diary/${shiftDate(date, -1)}`}
            className="px-3 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800 text-sm"
          >
            ← Předchozí
          </Link>
          <h1 className="text-2xl font-bold tabular-nums">{date}</h1>
          <Link
            href={`/diary/${shiftDate(date, 1)}`}
            className="px-3 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800 text-sm"
          >
            Další →
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <CopyFromYesterdayButton date={date} />
          <AddEntryDialog date={date} />
        </div>
      </div>

      <DayTotals totals={totals} />

      <div className="space-y-4">
        {MEAL_CATEGORIES.map((cat) => {
          const list = entriesByMeal.get(cat.value) ?? [];
          if (list.length === 0) return null;
          return (
            <section
              key={cat.value}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50"
            >
              <h2 className="px-4 py-2 text-sm font-semibold text-zinc-300 border-b border-zinc-800">
                {MEAL_LABELS[cat.value]}
              </h2>
              <div className="divide-y divide-zinc-800">
                {list.map((e) => (
                  <DiaryEntryRow key={e.id} entry={e} />
                ))}
              </div>
            </section>
          );
        })}

        {(entries?.length ?? 0) === 0 && (
          <div className="text-center text-zinc-400 py-12 border border-dashed border-zinc-800 rounded-lg">
            Zatím žádné záznamy. Přidej první jídlo tlačítkem nahoře.
          </div>
        )}
      </div>
    </div>
  );
}
