'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DayTotals } from '@/types/domain';
import { Card, CardContent } from '@/components/ui/card';

export function WeekView({ totals }: { totals: DayTotals[] }) {
  const week = totals.slice(-7);
  const data = week.map((d) => ({
    date: d.date.slice(5),
    kcal: Math.round(d.kcal),
    protein_kcal: Math.round(d.protein_g * 4),
    carb_kcal: Math.round(Math.max(0, d.carb_g - d.fiber_g) * 4),
    fat_kcal: Math.round(d.fat_g * 9),
    gl: d.gl_total,
    gi: d.gi_weighted ?? null,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Kalorie podle maker (7 dní)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                  }}
                  labelStyle={{ color: '#fafafa' }}
                />
                <Legend />
                <Bar dataKey="protein_kcal" stackId="m" fill="#10b981" name="B kcal" />
                <Bar dataKey="carb_kcal" stackId="m" fill="#f59e0b" name="S kcal" />
                <Bar dataKey="fat_kcal" stackId="m" fill="#f43f5e" name="T kcal" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Glykemický load (7 dní)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
                <YAxis stroke="#a1a1aa" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                  }}
                  labelStyle={{ color: '#fafafa' }}
                />
                <Line type="monotone" dataKey="gl" stroke="#3b82f6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
