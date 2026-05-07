import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchDailyTotals } from '@/lib/nutrition/fetch-day';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? defaultFromDate();
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const totals = await fetchDailyTotals(from, to);

  const headers = [
    'date',
    'kcal',
    'protein_g',
    'carb_g',
    'sugar_g',
    'fat_g',
    'sat_fat_g',
    'fiber_g',
    'gi_weighted',
    'gl_total',
  ];
  const rows = totals.map((d) =>
    [
      d.date,
      d.kcal.toFixed(1),
      d.protein_g.toFixed(1),
      d.carb_g.toFixed(1),
      d.sugar_g.toFixed(1),
      d.fat_g.toFixed(1),
      d.sat_fat_g.toFixed(1),
      d.fiber_g.toFixed(1),
      d.gi_weighted ?? '',
      d.gl_total.toFixed(1),
    ].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="diary_${from}_to_${to}.csv"`,
    },
  });
}

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}
