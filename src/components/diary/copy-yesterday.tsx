'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { copyDayFromYesterday } from '@/app/actions/diary';

export function CopyFromYesterdayButton({ date }: { date: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await copyDayFromYesterday(date);
      if ('error' in result && result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? 'Kopíruji…' : '⤴ Kopírovat z včerejška'}
    </Button>
  );
}
