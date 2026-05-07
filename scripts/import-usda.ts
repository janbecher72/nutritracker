/**
 * Import a curated subset of USDA FoodData Central into the ingredients table.
 *
 * Strategy: query USDA's Foundation + SR Legacy datasets via the public API.
 * For an initial seed we pull the most-common foods (~500 items) by querying
 * a list of canonical food names; full bulk import of all ~7000 items can be
 * done by switching DATA_TYPES to include 'Branded' and removing the query list.
 *
 * Run: pnpm tsx scripts/import-usda.ts
 */

import { createClient } from '@supabase/supabase-js';
import { estimateGi } from '../src/lib/gi/estimate';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USDA_API_KEY = process.env.USDA_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USDA_API_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USDA_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';
const DATA_TYPES = ['Foundation', 'SR Legacy'];

// USDA nutrient ID → our column name
const NUTRIENT_MAP: Record<number, string> = {
  1008: 'kcal', // Energy
  1003: 'protein_g',
  1005: 'carb_g',
  2000: 'sugar_g', // Sugars, total
  1004: 'fat_g',
  1258: 'sat_fat_g',
  1079: 'fiber_g',
  1009: 'starch_g',
  // Vitamins (μg or mg)
  1106: 'vitamin_a_ug', // Vitamin A, RAE
  1165: 'vitamin_b1_mg', // Thiamin
  1166: 'vitamin_b2_mg', // Riboflavin
  1167: 'vitamin_b3_mg', // Niacin
  1175: 'vitamin_b6_mg',
  1177: 'vitamin_b9_ug', // Folate
  1178: 'vitamin_b12_ug',
  1162: 'vitamin_c_mg',
  1114: 'vitamin_d_ug',
  1109: 'vitamin_e_mg',
  1185: 'vitamin_k_ug',
  // Minerals
  1087: 'calcium_mg',
  1089: 'iron_mg',
  1090: 'magnesium_mg',
  1092: 'potassium_mg',
  1093: 'sodium_mg',
  1095: 'zinc_mg',
  1103: 'selenium_ug',
};

const VITAMIN_KEYS = new Set([
  'vitamin_a_ug',
  'vitamin_b1_mg',
  'vitamin_b2_mg',
  'vitamin_b3_mg',
  'vitamin_b6_mg',
  'vitamin_b9_ug',
  'vitamin_b12_ug',
  'vitamin_c_mg',
  'vitamin_d_ug',
  'vitamin_e_mg',
  'vitamin_k_ug',
]);

const MINERAL_KEYS = new Set([
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'potassium_mg',
  'sodium_mg',
  'zinc_mg',
  'selenium_ug',
]);

const MACRO_COLUMNS = [
  'kcal',
  'protein_g',
  'carb_g',
  'sugar_g',
  'fat_g',
  'sat_fat_g',
  'fiber_g',
  'starch_g',
];

interface UsdaFood {
  fdcId: number;
  description: string;
  foodCategory?: string;
  foodNutrients: Array<{
    nutrientId: number;
    value: number;
    unitName?: string;
  }>;
}

interface IngredientRow {
  usda_fdc_id: number;
  name_en: string;
  source: 'usda';
  category: string | null;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  sugar_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  fiber_g: number | null;
  starch_g: number | null;
  vitamins: Record<string, number> | null;
  minerals: Record<string, number> | null;
  gi: number | null;
  gi_source: 'measured' | 'estimated_category' | 'estimated_composition' | 'user_override' | 'n/a';
}

const SEARCH_QUERIES = [
  'banana',
  'apple',
  'orange',
  'pear',
  'strawberry',
  'blueberry',
  'grapes',
  'mango',
  'pineapple',
  'watermelon',
  'peach',
  'plum',
  'kiwifruit',
  'avocado',
  'lemon',
  'cherry',
  'raspberry',
  'tomato',
  'cucumber',
  'lettuce',
  'spinach',
  'kale',
  'broccoli',
  'cauliflower',
  'carrot',
  'potato',
  'sweet potato',
  'onion',
  'garlic',
  'bell pepper',
  'zucchini',
  'eggplant',
  'celery',
  'cabbage',
  'corn',
  'mushroom',
  'rice white',
  'rice brown',
  'basmati rice',
  'quinoa',
  'oats',
  'wheat bread',
  'pasta',
  'spaghetti',
  'couscous',
  'bulgur',
  'buckwheat',
  'lentils',
  'chickpeas',
  'kidney beans',
  'black beans',
  'soybeans',
  'tofu',
  'milk',
  'yogurt',
  'cheese cheddar',
  'cottage cheese',
  'butter',
  'egg whole',
  'chicken breast',
  'chicken thigh',
  'beef ground',
  'pork loin',
  'salmon',
  'tuna',
  'cod',
  'shrimp',
  'almonds',
  'walnuts',
  'cashews',
  'peanuts',
  'pumpkin seeds',
  'sunflower seeds',
  'olive oil',
  'coconut oil',
  'honey',
  'sugar',
  'chocolate dark',
  'protein powder whey',
  'oat milk',
  'almond milk',
  'beef steak',
  'cauliflower rice',
  'hummus',
  'peanut butter',
];

async function searchUsda(query: string): Promise<number[]> {
  const url = new URL(`${USDA_BASE}/foods/search`);
  url.searchParams.set('api_key', USDA_API_KEY!);
  url.searchParams.set('query', query);
  url.searchParams.set('dataType', DATA_TYPES.join(','));
  url.searchParams.set('pageSize', '5');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`USDA search failed for "${query}": ${res.status}`);
  const json = (await res.json()) as { foods: Array<{ fdcId: number }> };
  return (json.foods ?? []).map((f) => f.fdcId);
}

async function fetchFoodDetails(fdcIds: number[]): Promise<UsdaFood[]> {
  // POST /foods accepts an array of fdcIds
  const url = new URL(`${USDA_BASE}/foods`);
  url.searchParams.set('api_key', USDA_API_KEY!);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fdcIds, format: 'full' }),
  });
  if (!res.ok) throw new Error(`USDA bulk fetch failed: ${res.status}`);
  return (await res.json()) as UsdaFood[];
}

function transformFood(food: UsdaFood): IngredientRow {
  const macros: Record<string, number | null> = {};
  for (const col of MACRO_COLUMNS) macros[col] = null;
  const vitamins: Record<string, number> = {};
  const minerals: Record<string, number> = {};

  for (const nutrient of food.foodNutrients ?? []) {
    const col = NUTRIENT_MAP[nutrient.nutrientId];
    if (!col) continue;
    const value = nutrient.value;
    if (typeof value !== 'number') continue;

    if (VITAMIN_KEYS.has(col)) {
      vitamins[col] = value;
    } else if (MINERAL_KEYS.has(col)) {
      minerals[col] = value;
    } else {
      macros[col] = value;
    }
  }

  // Run GI estimation
  const giResult = estimateGi({
    category: food.foodCategory,
    sugar_g: macros.sugar_g ?? 0,
    starch_g: macros.starch_g ?? null,
    carb_g: macros.carb_g ?? 0,
    fiber_g: macros.fiber_g ?? 0,
    fat_g: macros.fat_g ?? 0,
    protein_g: macros.protein_g ?? 0,
  });

  return {
    usda_fdc_id: food.fdcId,
    name_en: food.description,
    source: 'usda',
    category: food.foodCategory ?? null,
    kcal: macros.kcal,
    protein_g: macros.protein_g,
    carb_g: macros.carb_g,
    sugar_g: macros.sugar_g,
    fat_g: macros.fat_g,
    sat_fat_g: macros.sat_fat_g,
    fiber_g: macros.fiber_g,
    starch_g: macros.starch_g,
    vitamins: Object.keys(vitamins).length > 0 ? vitamins : null,
    minerals: Object.keys(minerals).length > 0 ? minerals : null,
    gi: giResult.gi,
    gi_source: giResult.gi_source,
  };
}

async function main() {
  console.log(`Importing ${SEARCH_QUERIES.length} queries from USDA…`);
  const allFdcIds = new Set<number>();

  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const q = SEARCH_QUERIES[i];
    try {
      const ids = await searchUsda(q);
      ids.forEach((id) => allFdcIds.add(id));
      console.log(`[${i + 1}/${SEARCH_QUERIES.length}] "${q}" → +${ids.length}`);
    } catch (err) {
      console.warn(`Search failed for "${q}":`, (err as Error).message);
    }
    // Polite throttle
    await new Promise((r) => setTimeout(r, 100));
  }

  const fdcArray = [...allFdcIds];
  console.log(`Fetching full details for ${fdcArray.length} unique foods…`);

  const allFoods: UsdaFood[] = [];
  const batchSize = 20;
  for (let i = 0; i < fdcArray.length; i += batchSize) {
    const batch = fdcArray.slice(i, i + batchSize);
    try {
      const foods = await fetchFoodDetails(batch);
      allFoods.push(...foods);
      console.log(`Fetched ${Math.min(i + batchSize, fdcArray.length)}/${fdcArray.length}`);
    } catch (err) {
      console.warn('Batch fetch failed:', (err as Error).message);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`Transforming ${allFoods.length} foods…`);
  const rows = allFoods.map(transformFood);

  console.log(`Upserting into ingredients (idempotent on usda_fdc_id)…`);
  const insertChunkSize = 50;
  for (let i = 0; i < rows.length; i += insertChunkSize) {
    const chunk = rows.slice(i, i + insertChunkSize);
    const { error } = await supabase
      .from('ingredients')
      .upsert(chunk, { onConflict: 'usda_fdc_id' });
    if (error) {
      console.error(`Upsert error at chunk ${i / insertChunkSize}:`, error);
      process.exit(1);
    }
    console.log(`Upserted ${Math.min(i + insertChunkSize, rows.length)}/${rows.length}`);
  }

  console.log('USDA import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
