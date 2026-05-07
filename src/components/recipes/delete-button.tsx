'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { deleteRecipe } from '@/app/actions/recipes';
import { Trash2 } from 'lucide-react';

export function DeleteRecipeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Opravdu smazat tento recept?')) return;
    startTransition(async () => {
      await deleteRecipe(id);
    });
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} disabled={pending}>
      <Trash2 className="h-4 w-4 mr-1" />
      {pending ? 'Mažu…' : 'Smazat'}
    </Button>
  );
}
