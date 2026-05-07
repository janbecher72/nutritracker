import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Number(searchParams.get('limit') ?? '20');

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_ingredients', {
    q,
    max_results: Math.min(50, Math.max(1, limit)),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
