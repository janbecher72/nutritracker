import type { DayTotals as DayTotalsT } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';
import { pcfSplit } from '@/lib/nutrition/calculate';

export function DayTotals({ totals }: { totals: DayTotalsT }) {
  const split = pcfSplit(totals);

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <Stat label="Kalorie" value={Math.round(totals.kcal)} unit="kcal" big />
          <Stat label="Bílkoviny" value={totals.protein_g.toFixed(1)} unit="g" />
          <Stat label="Sacharidy" value={totals.carb_g.toFixed(1)} unit="g" />
          <Stat label="Tuky" value={totals.fat_g.toFixed(1)} unit="g" />
          <Stat label="Vláknina" value={totals.fiber_g.toFixed(1)} unit="g" />
          <Stat
            label="GL"
            value={totals.gl_total.toFixed(1)}
            unit={totals.gi_weighted ? `GI ø ${totals.gi_weighted}` : ''}
          />
        </div>
        <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-zinc-800">
          <div className="bg-emerald-500" style={{ width: `${split.protein_pct}%` }} title={`B ${split.protein_pct}%`} />
          <div className="bg-amber-500" style={{ width: `${split.carb_pct}%` }} title={`S ${split.carb_pct}%`} />
          <div className="bg-rose-500" style={{ width: `${split.fat_pct}%` }} title={`T ${split.fat_pct}%`} />
        </div>
        <div className="mt-1 flex gap-3 text-xs text-zinc-400">
          <span>B {split.protein_pct}%</span>
          <span>S {split.carb_pct}%</span>
          <span>T {split.fat_pct}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  unit,
  big,
}: {
  label: string;
  value: string | number;
  unit: string;
  big?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`tabular-nums ${big ? 'text-3xl font-bold' : 'text-xl font-semibold'}`}>
        {value}{' '}
        {unit && <span className="text-sm font-normal text-zinc-400">{unit}</span>}
      </div>
    </div>
  );
}
