/**
 * Nutrition calculations — pure functions, no DB access.
 * Spec: PRD_NutriTracker_FINAL.md §F4
 */

import type {
  DayTotals,
  MacroBreakdown,
  Micros,
  NutritionRow,
  PCFSplit,
} from '@/types/domain';
import { glycemicLoad } from '@/lib/gi/estimate';

const MICRO_KEYS: (keyof Micros)[] = [
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
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'potassium_mg',
  'sodium_mg',
  'zinc_mg',
  'selenium_ug',
];

const INCOMPLETE_THRESHOLD = 0.2; // > 20% missing flags as incomplete

function emptyMacros(): MacroBreakdown {
  return {
    kcal: 0,
    protein_g: 0,
    carb_g: 0,
    sugar_g: 0,
    fat_g: 0,
    sat_fat_g: 0,
    fiber_g: 0,
  };
}

function emptyMicros(): Micros {
  const m: Micros = {};
  for (const k of MICRO_KEYS) m[k] = 0;
  return m;
}

/** Sum macros + micros across rows. Returns totals + which micros had missing data. */
export function sumRows(rows: NutritionRow[]): {
  macros: MacroBreakdown;
  micros: Micros;
  incomplete: string[];
} {
  const macros = emptyMacros();
  const micros = emptyMicros();
  const missingCounts: Record<string, number> = {};
  for (const k of MICRO_KEYS) missingCounts[k] = 0;

  for (const row of rows) {
    macros.kcal += row.kcal;
    macros.protein_g += row.protein_g;
    macros.carb_g += row.carb_g;
    macros.sugar_g += row.sugar_g;
    macros.fat_g += row.fat_g;
    macros.sat_fat_g += row.sat_fat_g;
    macros.fiber_g += row.fiber_g;

    for (const k of MICRO_KEYS) {
      const v = row.micros[k];
      if (v == null) {
        missingCounts[k]++;
      } else {
        micros[k] = (micros[k] ?? 0) + v;
      }
    }
  }

  const incomplete: string[] = [];
  if (rows.length > 0) {
    for (const k of MICRO_KEYS) {
      if (missingCounts[k] / rows.length > INCOMPLETE_THRESHOLD) {
        incomplete.push(k);
      }
    }
  }

  return { macros: roundMacros(macros), micros: roundMicros(micros), incomplete };
}

/**
 * Weighted average GI for a set of rows.
 * Weight = available carbs (carb - fiber) of each row.
 * Rows where gi is null are ignored entirely.
 */
export function weightedGI(rows: NutritionRow[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const row of rows) {
    if (row.gi == null) continue;
    const availableCarb = Math.max(0, row.carb_g - row.fiber_g);
    if (availableCarb <= 0) continue;
    weightedSum += row.gi * availableCarb;
    totalWeight += availableCarb;
  }
  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

/** Total glycemic load (sum across rows). */
export function totalGL(rows: NutritionRow[]): number {
  let total = 0;
  for (const row of rows) {
    const availableCarb = Math.max(0, row.carb_g - row.fiber_g);
    total += glycemicLoad(row.gi, availableCarb);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Percentage split of energy from protein, carbs, fat (P/C/F).
 * Uses Atwater factors: 4 kcal/g protein, 4 kcal/g carb (net), 9 kcal/g fat.
 * If totals are zero, returns an even null split (zeros).
 */
export function pcfSplit(macros: MacroBreakdown): PCFSplit {
  const proteinKcal = macros.protein_g * 4;
  const carbKcal = Math.max(0, macros.carb_g - macros.fiber_g) * 4;
  const fatKcal = macros.fat_g * 9;
  const total = proteinKcal + carbKcal + fatKcal;
  if (total === 0) {
    return { protein_pct: 0, carb_pct: 0, fat_pct: 0 };
  }
  return {
    protein_pct: Math.round((proteinKcal / total) * 100),
    carb_pct: Math.round((carbKcal / total) * 100),
    fat_pct: Math.round((fatKcal / total) * 100),
  };
}

/** Aggregate everything for a single day. */
export function sumDay(date: string, rows: NutritionRow[]): DayTotals {
  const { macros, micros, incomplete } = sumRows(rows);
  return {
    ...macros,
    date,
    gi_weighted: weightedGI(rows),
    gl_total: totalGL(rows),
    micros,
    incomplete,
  };
}

/** Scale a NutritionRow by an amount factor (e.g. for portion sizing). */
export function scaleRow(row: NutritionRow, factor: number): NutritionRow {
  const scaledMicros: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = row.micros[k];
    scaledMicros[k] = v == null ? null : v * factor;
  }
  return {
    amount_g: row.amount_g * factor,
    kcal: row.kcal * factor,
    protein_g: row.protein_g * factor,
    carb_g: row.carb_g * factor,
    sugar_g: row.sugar_g * factor,
    fat_g: row.fat_g * factor,
    sat_fat_g: row.sat_fat_g * factor,
    fiber_g: row.fiber_g * factor,
    gi: row.gi,
    micros: scaledMicros,
  };
}

function roundMacros(m: MacroBreakdown): MacroBreakdown {
  return {
    kcal: Math.round(m.kcal),
    protein_g: round1(m.protein_g),
    carb_g: round1(m.carb_g),
    sugar_g: round1(m.sugar_g),
    fat_g: round1(m.fat_g),
    sat_fat_g: round1(m.sat_fat_g),
    fiber_g: round1(m.fiber_g),
  };
}

function roundMicros(m: Micros): Micros {
  const out: Micros = {};
  for (const k of MICRO_KEYS) {
    const v = m[k];
    out[k] = v == null ? null : round1(v);
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
