'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayTotals } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';

export function MonthView({ totals }: { totals: DayTotals[] }) {
  const data = totals.map((d) => ({
    date: d.date.slice(5),
    kcal: Math.round(d.kcal),
    avg7:
      Math.round(
        (totals
          .slice(Math.max(0, totals.indexOf(d) - 6), totals.indexOf(d) + 1)
          .reduce((s, x) => s + x.kcal, 0) /
          Math.min(7, totals.indexOf(d) + 1)) || 0
      ),
  }));

  // Heatmap data — last 30 days
  const max = Math.max(1, ...totals.map((d) => d.kcal));
  const heatCells = totals.map((d) => ({
    date: d.date,
    intensity: d.kcal === 0 ? 0 : Math.min(1, d.kcal / max),
    kcal: Math.round(d.kcal),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Kalorie + 7denní průměr (30 dní)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} />
                <YAxis stroke="#a1a1aa" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                  }}
                  labelStyle={{ color: '#fafafa' }}
                />
                <Line type="monotone" dataKey="kcal" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="avg7" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Heatmapa kcal</h3>
          <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
            {heatCells.map((c) => (
              <div
                key={c.date}
                title={`${c.date}: ${c.kcal} kcal`}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor:
                    c.intensity === 0
                      ? '#18181b'
                      : `rgba(59, 130, 246, ${0.2 + c.intensity * 0.8})`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span>méně</span>
            <div className="flex gap-0.5">
              {[0.2, 0.4, 0.6, 0.8, 1].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${i})` }}
                />
              ))}
            </div>
            <span>více</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
