'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { MealCategory } from '@/types/database';

const ingredientEntrySchema = z.object({
  source_type: z.literal('ingredient'),
  ingredient_id: z.string().uuid(),
  amount_g: z.number().positive(),
  meal_category: z.enum([
    'breakfast',
    'snack_morning',
    'lunch',
    'snack_afternoon',
    'dinner',
    'pre_workout',
    'post_workout',
  ]),
  eaten_at: z.string(),
  notes: z.string().optional().nullable(),
});

const recipeEntrySchema = z.object({
  source_type: z.literal('recipe'),
  recipe_id: z.string().uuid(),
  servings: z.number().positive(),
  meal_category: z.enum([
    'breakfast',
    'snack_morning',
    'lunch',
    'snack_afternoon',
    'dinner',
    'pre_workout',
    'post_workout',
  ]),
  eaten_at: z.string(),
  notes: z.string().optional().nullable(),
});

const adhocEntrySchema = z.object({
  source_type: z.literal('adhoc'),
  adhoc_name: z.string().min(1),
  adhoc_kcal: z.number().min(0),
  adhoc_protein_g: z.number().min(0).optional().nullable(),
  adhoc_carb_g: z.number().min(0).optional().nullable(),
  adhoc_fat_g: z.number().min(0).optional().nullable(),
  adhoc_fiber_g: z.number().min(0).optional().nullable(),
  adhoc_sugar_g: z.number().min(0).optional().nullable(),
  meal_category: z.enum([
    'breakfast',
    'snack_morning',
    'lunch',
    'snack_afternoon',
    'dinner',
    'pre_workout',
    'post_workout',
  ]),
  eaten_at: z.string(),
  notes: z.string().optional().nullable(),
});

export type DiaryEntryInput =
  | z.infer<typeof ingredientEntrySchema>
  | z.infer<typeof recipeEntrySchema>
  | z.infer<typeof adhocEntrySchema>;

export async function addDiaryEntry(input: DiaryEntryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Validate based on source type
  const parsed =
    input.source_type === 'ingredient'
      ? ingredientEntrySchema.safeParse(input)
      : input.source_type === 'recipe'
        ? recipeEntrySchema.safeParse(input)
        : adhocEntrySchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.issues };
  }

  const { error } = await supabase.from('diary_entries').insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) return { error: error.message };

  revalidatePath('/diary', 'layout');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateDiaryEntry(
  id: string,
  patch: { amount_g?: number; servings?: number; notes?: string | null; meal_category?: MealCategory }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('diary_entries')
    .update(patch)
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/diary', 'layout');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteDiaryEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('diary_entries').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/diary', 'layout');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function copyDayFromYesterday(targetDate: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const target = new Date(targetDate);
  const previous = new Date(target);
  previous.setDate(previous.getDate() - 1);

  const startPrev = startOfDay(previous).toISOString();
  const endPrev = endOfDay(previous).toISOString();

  const { data: prevEntries, error: fetchError } = await supabase
    .from('diary_entries')
    .select(
      'meal_category, source_type, ingredient_id, recipe_id, amount_g, servings, adhoc_name, adhoc_kcal, adhoc_protein_g, adhoc_carb_g, adhoc_fat_g, adhoc_fiber_g, adhoc_sugar_g, eaten_at'
    )
    .eq('user_id', user.id)
    .gte('eaten_at', startPrev)
    .lte('eaten_at', endPrev);

  if (fetchError) return { error: fetchError.message };
  if (!prevEntries || prevEntries.length === 0) {
    return { error: 'V předchozím dni nejsou žádné záznamy.' };
  }

  const dayDiffMs = startOfDay(target).getTime() - startOfDay(previous).getTime();
  const newEntries = prevEntries.map((e) => ({
    user_id: user.id,
    eaten_at: new Date(new Date(e.eaten_at).getTime() + dayDiffMs).toISOString(),
    meal_category: e.meal_category,
    source_type: e.source_type,
    ingredient_id: e.ingredient_id,
    recipe_id: e.recipe_id,
    amount_g: e.amount_g,
    servings: e.servings,
    adhoc_name: e.adhoc_name,
    adhoc_kcal: e.adhoc_kcal,
    adhoc_protein_g: e.adhoc_protein_g,
    adhoc_carb_g: e.adhoc_carb_g,
    adhoc_fat_g: e.adhoc_fat_g,
    adhoc_fiber_g: e.adhoc_fiber_g,
    adhoc_sugar_g: e.adhoc_sugar_g,
  }));

  const { error: insertError } = await supabase
    .from('diary_entries')
    .insert(newEntries);

  if (insertError) return { error: insertError.message };
  revalidatePath('/diary', 'layout');
  revalidatePath('/dashboard');
  return { success: true, count: newEntries.length };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}
