'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const recipeIngredientSchema = z.object({
  ingredient_id: z.string().uuid(),
  amount_g: z.number().positive(),
});

const recipeSchema = z.object({
  name: z.string().min(1).max(200),
  servings: z.number().positive(),
  tags: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  rating: z.number().min(1).max(5).nullable().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

export async function createRecipe(input: RecipeInput) {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.issues };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      servings: parsed.data.servings,
      tags: parsed.data.tags,
      notes: parsed.data.notes ?? null,
      rating: parsed.data.rating ?? null,
    })
    .select('id')
    .single();

  if (recipeError || !recipe) return { error: recipeError?.message ?? 'Insert failed' };

  const ingredientRows = parsed.data.ingredients.map((ri, idx) => ({
    recipe_id: recipe.id,
    ingredient_id: ri.ingredient_id,
    amount_g: ri.amount_g,
    position: idx,
  }));

  const { error: riError } = await supabase
    .from('recipe_ingredients')
    .insert(ingredientRows);

  if (riError) {
    // best-effort cleanup
    await supabase.from('recipes').delete().eq('id', recipe.id);
    return { error: riError.message };
  }

  revalidatePath('/recipes');
  return { success: true, id: recipe.id };
}

export async function updateRecipe(id: string, input: RecipeInput) {
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.issues };

  const supabase = await createClient();

  const { error: updateError } = await supabase
    .from('recipes')
    .update({
      name: parsed.data.name,
      servings: parsed.data.servings,
      tags: parsed.data.tags,
      notes: parsed.data.notes ?? null,
      rating: parsed.data.rating ?? null,
    })
    .eq('id', id);

  if (updateError) return { error: updateError.message };

  // Replace ingredients
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
  const ingredientRows = parsed.data.ingredients.map((ri, idx) => ({
    recipe_id: id,
    ingredient_id: ri.ingredient_id,
    amount_g: ri.amount_g,
    position: idx,
  }));
  const { error: riError } = await supabase
    .from('recipe_ingredients')
    .insert(ingredientRows);
  if (riError) return { error: riError.message };

  revalidatePath('/recipes');
  revalidatePath(`/recipes/${id}`);
  return { success: true };
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/recipes');
  redirect('/recipes');
}
