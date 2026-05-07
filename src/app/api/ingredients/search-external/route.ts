import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { searchOpenFoodFacts } from '@/lib/off/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(20, Math.max(1, Number(searchParams.get('limit') ?? '10')));

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Auth gate — only authenticated users can hit external API
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const offResults = await searchOpenFoodFacts(q, limit);
  if (offResults.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // Upsert into DB (idempotent on off_code) using service-role client to bypass RLS.
  const admin = createAdminClient();
  const rows = offResults.map((r) => ({
    off_code: r.off_code,
    name_en: r.name_en,
    name_cs: r.name_cs,
    source: 'off' as const,
    category: r.category,
    kcal: r.kcal,
    protein_g: r.protein_g,
    carb_g: r.carb_g,
    sugar_g: r.sugar_g,
    fat_g: r.fat_g,
    sat_fat_g: r.sat_fat_g,
    fiber_g: r.fiber_g,
    vitamins: r.vitamins,
    minerals: r.minerals,
    gi: r.gi,
    gi_source: r.gi_source,
    image_url: r.image_url,
    external_url: r.external_url,
  }));

  const { data: saved, error } = await admin
    .from('ingredients')
    .upsert(rows, { onConflict: 'off_code' })
    .select(
      'id, name_en, name_cs, source, category, kcal, protein_g, carb_g, sugar_g, fat_g, sat_fat_g, fiber_g, vitamins, minerals, gi, gi_source, image_url, external_url, off_code'
    );

  if (error) {
    console.error('OFF upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: saved ?? [] });
}
