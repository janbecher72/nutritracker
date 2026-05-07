'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { estimateGi } from '@/lib/gi/estimate';

const customIngredientSchema = z.object({
  name_en: z.string().min(1).max(200),
  name_cs: z.string().max(200).nullable().optional(),
  category: z.string().max(200).nullable().optional(),
  kcal: z.number().min(0).nullable().optional(),
  protein_g: z.number().min(0).nullable().optional(),
  carb_g: z.number().min(0).nullable().optional(),
  sugar_g: z.number().min(0).nullable().optional(),
  fat_g: z.number().min(0).nullable().optional(),
  fiber_g: z.number().min(0).nullable().optional(),
  portion_g: z.number().positive().nullable().optional(),
});

export async function createCustomIngredient(input: z.infer<typeof customIngredientSchema>) {
  const parsed = customIngredientSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.issues };

  const supabase = await createClient();
  const giResult = estimateGi({
    category: parsed.data.category ?? null,
    sugar_g: parsed.data.sugar_g ?? 0,
    carb_g: parsed.data.carb_g ?? 0,
    fiber_g: parsed.data.fiber_g ?? 0,
    fat_g: parsed.data.fat_g ?? 0,
    protein_g: parsed.data.protein_g ?? 0,
  });

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      ...parsed.data,
      source: 'custom',
      gi: giResult.gi,
      gi_source: giResult.gi_source,
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Insert failed' };

  revalidatePath('/ingredients');
  redirect('/ingredients');
}
