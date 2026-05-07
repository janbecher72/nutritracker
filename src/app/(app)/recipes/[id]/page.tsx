import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RecipeForm } from '@/components/recipes/recipe-form';
import { DeleteRecipeButton } from '@/components/recipes/delete-button';

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(
      `
      *,
      recipe_ingredients(*, ingredient:ingredients(*))
    `
    )
    .eq('id', id)
    .single();

  if (error || !recipe) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ingredients: { ingredient: any; amount_g: number }[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipe.recipe_ingredients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.sort((a: any, b: any) => a.position - b.position)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((ri: any) => ({
        ingredient: ri.ingredient,
        amount_g: Number(ri.amount_g),
      })) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upravit recept</h1>
        <DeleteRecipeButton id={recipe.id} />
      </div>
      <RecipeForm
        initial={{
          id: recipe.id,
          name: recipe.name,
          servings: Number(recipe.servings),
          tags: recipe.tags ?? [],
          notes: recipe.notes,
          rating: recipe.rating,
          ingredients,
        }}
      />
    </div>
  );
}
