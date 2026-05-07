'use client';

import type { DayTotals } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';
import { pcfSplit } from '@/lib/nutrition/calculate';

export function DayView({ totals }: { totals: DayTotals[] }) {
  const today = totals[totals.length - 1];
  const yesterday = totals[totals.length - 2];

  if (!today) return <div className="text-zinc-400">Žádná data.</div>;

  const split = pcfSplit(today);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Kalorie"
          value={Math.round(today.kcal)}
          unit="kcal"
          delta={yesterday ? Math.round(today.kcal - yesterday.kcal) : null}
        />
        <Stat
          label="Bílkoviny"
          value={today.protein_g.toFixed(1)}
          unit="g"
          delta={yesterday ? Number((today.protein_g - yesterday.protein_g).toFixed(1)) : null}
        />
        <Stat
          label="Sacharidy"
          value={today.carb_g.toFixed(1)}
          unit="g"
          delta={yesterday ? Number((today.carb_g - yesterday.carb_g).toFixed(1)) : null}
        />
        <Stat
          label="Tuky"
          value={today.fat_g.toFixed(1)}
          unit="g"
          delta={yesterday ? Number((today.fat_g - yesterday.fat_g).toFixed(1)) : null}
        />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
              Rozdělení energie (B/S/T)
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
              <div className="bg-emerald-500" style={{ width: `${split.protein_pct}%` }} />
              <div className="bg-amber-500" style={{ width: `${split.carb_pct}%` }} />
              <div className="bg-rose-500" style={{ width: `${split.fat_pct}%` }} />
            </div>
            <div className="mt-1 flex gap-3 text-xs text-zinc-400">
              <span>B {split.protein_pct}%</span>
              <span>S {split.carb_pct}%</span>
              <span>T {split.fat_pct}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800">
            <Stat label="Vláknina" value={today.fiber_g.toFixed(1)} unit="g" />
            <Stat
              label="GI ø"
              value={today.gi_weighted ?? '—'}
              unit=""
            />
            <Stat label="GL" value={today.gl_total.toFixed(1)} unit="" />
            <Stat label="Cukry" value={today.sugar_g.toFixed(1)} unit="g" />
          </div>
        </CardContent>
      </Card>

      {today.incomplete.length > 0 && (
        <div className="text-xs text-amber-400">
          ⚠ Některé mikronutrienty mají nekompletní data: {today.incomplete.join(', ')}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string | number;
  unit: string;
  delta?: number | null;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold tabular-nums">
        {value} <span className="text-xs font-normal text-zinc-400">{unit}</span>
      </div>
      {delta != null && delta !== 0 && (
        <div className={`text-xs ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {delta > 0 ? '+' : ''}
          {delta} vs. včera
        </div>
      )}
    </div>
  );
}
