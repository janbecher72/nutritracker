import { fetchDailyTotals } from '@/lib/nutrition/fetch-day';
import { todayLocalISO } from '@/lib/utils';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';

function shiftDate(date: string, deltaDays: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

export default async function DashboardPage() {
  const today = todayLocalISO();
  const monthAgo = shiftDate(today, -29);
  const totals = await fetchDailyTotals(monthAgo, today);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <DashboardTabs totals={totals} />
    </div>
  );
}
