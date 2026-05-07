import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IngredientBrowser } from '@/components/ingredients/ingredient-browser';

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let ingredients;
  if (params.q && params.q.length >= 2) {
    const { data } = await supabase.rpc('search_ingredients', {
      q: params.q,
      max_results: 50,
    });
    ingredients = data ?? [];
  } else {
    const { data } = await supabase
      .from('ingredients')
      .select('*')
      .order('name_en')
      .limit(50);
    ingredients = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Potraviny</h1>
        <Link href="/ingredients/new">
          <Button>+ Vlastní potravina</Button>
        </Link>
      </div>

      <IngredientBrowser initialResults={ingredients} initialQuery={params.q ?? ''} />
    </div>
  );
}
