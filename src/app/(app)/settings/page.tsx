import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nastavení</h1>

      <Card>
        <CardHeader>
          <CardTitle>Účet</CardTitle>
          <CardDescription>Cloud sync přes Supabase Auth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-300">
            Email: <span className="font-mono">{user?.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export dat</CardTitle>
          <CardDescription>Stáhni svá data v CSV formátu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href={`/api/export/diary?from=${monthAgoStr}&to=${today}`}
            className="inline-flex items-center px-3 py-1.5 rounded-md border border-zinc-700 hover:bg-zinc-800 text-sm"
          >
            ⬇ Posledních 30 dní (denní souhrny)
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>O aplikaci</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400 space-y-1">
          <div>NutriTracker v0.1</div>
          <div>Postaveno na Next.js 16, Supabase, Recharts</div>
          <div>Data potravin: USDA FoodData Central</div>
          <div>GI hodnoty: Atkinson 2021 (měřené) + kompoziční odhad</div>
        </CardContent>
      </Card>
    </div>
  );
}
