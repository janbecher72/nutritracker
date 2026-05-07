'use client';

import { useState } from 'react';
import type { DayTotals } from '@/types/domain';
import { DayView } from './day-view';
import { WeekView } from './week-view';
import { MonthView } from './month-view';

type Tab = 'day' | 'week' | 'month';

export function DashboardTabs({ totals }: { totals: DayTotals[] }) {
  const [tab, setTab] = useState<Tab>('day');

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-900 p-1">
        {(['day', 'week', 'month'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded ${
              tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t === 'day' ? 'Den' : t === 'week' ? 'Týden' : 'Měsíc'}
          </button>
        ))}
      </div>

      {tab === 'day' && <DayView totals={totals} />}
      {tab === 'week' && <WeekView totals={totals} />}
      {tab === 'month' && <MonthView totals={totals} />}
    </div>
  );
}
