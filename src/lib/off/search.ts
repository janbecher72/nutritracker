/**
 * Open Food Facts lookup — Czech-first, falls back to global.
 *
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * Per OFF guidelines we identify our app via User-Agent.
 */

import { estimateGi } from '@/lib/gi/estimate';

const OFF_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT = 'NutriTracker/0.1 (jdostal1@gmail.com)';

interface OffNutriments {
  'energy-kcal_100g'?: number;
  'energy-kj_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fat_100g?: number;
  'saturated-fat_100g'?: number;
  fiber_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;
  // Vitamins (g per 100g, very inconsistent coverage)
  'vitamin-a_100g'?: number;
  'vitamin-c_100g'?: number;
  'vitamin-d_100g'?: number;
  // Minerals
  iron_100g?: number;
  calcium_100g?: number;
  potassium_100g?: number;
  magnesium_100g?: number;
  zinc_100g?: number;
}

interface OffProduct {
  code: string;
  product_name?: string;
  product_name_cs?: string;
  brands?: string;
  categories?: string;
  countries_tags?: string[];
  image_front_url?: string;
  image_url?: string;
  nutriments?: OffNutriments;
}

interface OffSearchResponse {
  count: number;
  products: OffProduct[];
}

export interface NormalizedOffIngredient {
  off_code: string;
  name_en: string;
  name_cs: string;
  category: string | null;
  brand: string | null;
  image_url: string | null;
  external_url: string;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  sugar_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  fiber_g: number | null;
  vitamins: Record<string, number> | null;
  minerals: Record<string, number> | null;
  gi: number | null;
  gi_source: 'measured' | 'estimated_category' | 'estimated_composition' | 'user_override' | 'n/a';
}

const FIELDS = [
  'code',
  'product_name',
  'product_name_cs',
  'brands',
  'categories',
  'countries_tags',
  'image_front_url',
  'image_url',
  'nutriments',
].join(',');

/**
 * Search Open Food Facts. Czech products preferred; if 0 results, broaden to global.
 * Returns at most `limit` normalized ingredients with sufficient nutrition data.
 */
export async function searchOpenFoodFacts(
  q: string,
  limit = 10
): Promise<NormalizedOffIngredient[]> {
  if (!q || q.trim().length < 2) return [];

  // Try CZ first
  let products = await fetchSearch(q, 'czech-republic', limit);

  // Fall back to global if CZ didn't find anything
  if (products.length === 0) {
    products = await fetchSearch(q, null, limit);
  }

  return products.map(transformProduct).filter(hasMinimalNutrition).slice(0, limit);
}

async function fetchSearch(
  q: string,
  country: string | null,
  pageSize: number
): Promise<OffProduct[]> {
  const url = new URL(`${OFF_BASE}/cgi/search.pl`);
  url.searchParams.set('search_terms', q);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('fields', FIELDS);
  if (country) {
    url.searchParams.set('tagtype_0', 'countries');
    url.searchParams.set('tag_contains_0', 'contains');
    url.searchParams.set('tag_0', country);
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      // Polite timeout — OFF can be slow at peak
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`OFF search returned ${res.status} for "${q}"`);
      return [];
    }
    const json = (await res.json()) as OffSearchResponse;
    return json.products ?? [];
  } catch (err) {
    console.warn(`OFF search failed for "${q}":`, (err as Error).message);
    return [];
  }
}

function transformProduct(p: OffProduct): NormalizedOffIngredient {
  const n = p.nutriments ?? {};
  const nameCs = (p.product_name_cs ?? '').trim();
  const nameEn = (p.product_name ?? '').trim();
  const brand = (p.brands ?? '').split(',')[0]?.trim() || null;

  // Compose display name: prefer Czech, fall back to English. Add brand prefix if useful.
  const baseName = nameCs || nameEn || `Product ${p.code}`;
  const displayName = brand && !baseName.toLowerCase().includes(brand.toLowerCase())
    ? `${baseName} (${brand})`
    : baseName;

  const category = (p.categories ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)[0] ?? null;

  // Build vitamins/minerals objects (only if values present)
  const vitamins: Record<string, number> = {};
  const minerals: Record<string, number> = {};
  if (n['vitamin-a_100g'] != null) vitamins.vitamin_a_ug = n['vitamin-a_100g'] * 1_000_000; // g → µg
  if (n['vitamin-c_100g'] != null) vitamins.vitamin_c_mg = n['vitamin-c_100g'] * 1000; // g → mg
  if (n['vitamin-d_100g'] != null) vitamins.vitamin_d_ug = n['vitamin-d_100g'] * 1_000_000;
  if (n.iron_100g != null) minerals.iron_mg = n.iron_100g * 1000;
  if (n.calcium_100g != null) minerals.calcium_mg = n.calcium_100g * 1000;
  if (n.potassium_100g != null) minerals.potassium_mg = n.potassium_100g * 1000;
  if (n.magnesium_100g != null) minerals.magnesium_mg = n.magnesium_100g * 1000;
  if (n.zinc_100g != null) minerals.zinc_mg = n.zinc_100g * 1000;
  if (n.sodium_100g != null) minerals.sodium_mg = n.sodium_100g * 1000;

  const giResult = estimateGi({
    category,
    sugar_g: n.sugars_100g ?? 0,
    carb_g: n.carbohydrates_100g ?? 0,
    fiber_g: n.fiber_100g ?? 0,
    fat_g: n.fat_100g ?? 0,
    protein_g: n.proteins_100g ?? 0,
  });

  return {
    off_code: p.code,
    name_en: nameEn || displayName,
    name_cs: displayName,
    category,
    brand,
    image_url: p.image_front_url ?? p.image_url ?? null,
    external_url: `https://world.openfoodfacts.org/product/${p.code}`,
    kcal: n['energy-kcal_100g'] ?? null,
    protein_g: n.proteins_100g ?? null,
    carb_g: n.carbohydrates_100g ?? null,
    sugar_g: n.sugars_100g ?? null,
    fat_g: n.fat_100g ?? null,
    sat_fat_g: n['saturated-fat_100g'] ?? null,
    fiber_g: n.fiber_100g ?? null,
    vitamins: Object.keys(vitamins).length > 0 ? vitamins : null,
    minerals: Object.keys(minerals).length > 0 ? minerals : null,
    gi: giResult.gi,
    gi_source: giResult.gi_source,
  };
}

/** Filter out products that lack enough nutrition data to be useful. */
function hasMinimalNutrition(ing: NormalizedOffIngredient): boolean {
  // Need at least kcal + one macro
  if (ing.kcal == null) return false;
  return (
    ing.protein_g != null ||
    ing.carb_g != null ||
    ing.fat_g != null
  );
}
