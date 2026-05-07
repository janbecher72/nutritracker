import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function RecipesPage() {
  const supabase = await createClient();

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(count)')
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recepty</h1>
        <Link href="/recipes/new">
          <Button>+ Nový recept</Button>
        </Link>
      </div>

      {error && <div className="text-red-400 text-sm">{error.message}</div>}

      {(recipes?.length ?? 0) === 0 && !error && (
        <div className="text-center text-zinc-400 py-12 border border-dashed border-zinc-800 rounded-lg">
          Žádné recepty. Vytvoř první.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recipes?.map((r) => (
          <Link
            key={r.id}
            href={`/recipes/${r.id}`}
            className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:bg-zinc-800/60 transition-colors"
          >
            <div className="font-semibold mb-1">{r.name}</div>
            <div className="text-xs text-zinc-500 mb-2">
              {r.servings} porcí
              {r.rating ? ` · ${'★'.repeat(r.rating)}` : ''}
            </div>
            {r.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {r.tags.map((t: string) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
