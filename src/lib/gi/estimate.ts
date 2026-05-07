/**
 * Glycemic Index estimation engine — 4-tier fallback.
 * Spec: docs/GI_Estimation_Model.md
 *
 *   Tier 1: measured value from gi_seed table         (gi_source = 'measured')
 *   Tier 2: USDA food category default                (gi_source = 'estimated_category')
 *   Tier 3: composition-based regression heuristic    (gi_source = 'estimated_composition')
 *   Tier 4: < 5 g of carbohydrates per 100 g          (gi_source = 'n/a')
 */

import type { GiSource } from '@/types/database';

export interface GiEstimateInput {
  /** USDA food category string (e.g. "Cereal Grains and Pasta") — optional */
  category?: string | null;
  /** g per 100 g */
  sugar_g: number;
  /** g per 100 g — optional; derived from carbs/sugar/fiber if missing */
  starch_g?: number | null;
  carb_g: number;
  fiber_g: number;
  fat_g: number;
  protein_g: number;
}

export interface GiEstimateResult {
  gi: number | null;
  gi_source: GiSource;
  gi_low_ci?: number;
  gi_high_ci?: number;
}

/** GI typical defaults per USDA food category — Tier 2 lookup. */
const CATEGORY_DEFAULTS: Record<string, { gi: number; range: [number, number] }> = {
  'Cereal Grains and Pasta': { gi: 60, range: [45, 75] },
  'Breakfast Cereals': { gi: 70, range: [55, 85] },
  'Legumes and Legume Products': { gi: 30, range: [20, 40] },
  'Vegetables and Vegetable Products': { gi: 40, range: [15, 75] },
  Fruits: { gi: 45, range: [30, 60] },
  'Fruits and Fruit Juices': { gi: 45, range: [30, 60] },
  'Dairy and Egg Products': { gi: 35, range: [25, 45] },
  'Baked Products': { gi: 70, range: [55, 85] },
  Sweets: { gi: 65, range: [40, 100] },
  'Sweets and Sugars': { gi: 65, range: [40, 100] },
  Snacks: { gi: 65, range: [40, 90] },
  Beverages: { gi: 50, range: [20, 90] },
};

const MIN_CARBS_FOR_GI = 5; // g per 100 g

/**
 * Composition-based heuristic — Tier 3.
 * See docs/GI_Estimation_Model.md §5 for derivation.
 */
export function estimateGiFromComposition(
  input: GiEstimateInput
): GiEstimateResult {
  const { sugar_g, carb_g, fiber_g, fat_g, protein_g } = input;
  const starch_g =
    input.starch_g ?? Math.max(0, carb_g - sugar_g - fiber_g);
  const availableCarb = sugar_g + starch_g;

  if (availableCarb < MIN_CARBS_FOR_GI) {
    return { gi: null, gi_source: 'n/a' };
  }

  // Step 1: base GI from sugar/starch ratio
  const sugarGi = 60;
  const starchGi = 75;
  const baseGi =
    (sugar_g * sugarGi + starch_g * starchGi) / availableCarb;

  // Step 2: penalties for absorption slowers
  const fiberRatio = fiber_g / availableCarb;
  const fatRatio = fat_g / availableCarb;
  const proteinRatio = protein_g / availableCarb;

  const penalty =
    25 * Math.min(fiberRatio, 0.5) +
    15 * Math.min(fatRatio, 1.0) +
    10 * Math.min(proteinRatio, 1.0);

  const estimatedGi = clamp(baseGi - penalty, 15, 105);
  const ciHalf = 15;

  return {
    gi: round(estimatedGi),
    gi_source: 'estimated_composition',
    gi_low_ci: clamp(estimatedGi - ciHalf, 15, 105),
    gi_high_ci: clamp(estimatedGi + ciHalf, 15, 105),
  };
}

/**
 * Main entry — runs the 4-tier fallback.
 *
 * `seedMatch` is an optional measured value. The caller is responsible for
 * looking up the seed table (by USDA fdc_id or fuzzy name match) before calling.
 */
export function estimateGi(
  input: GiEstimateInput,
  seedMatch?: { gi: number; lowCi?: number; highCi?: number } | null
): GiEstimateResult {
  // Tier 1 — measured
  if (seedMatch) {
    return {
      gi: seedMatch.gi,
      gi_source: 'measured',
      gi_low_ci: seedMatch.lowCi,
      gi_high_ci: seedMatch.highCi,
    };
  }

  // Tier 4 — negligible carbs
  const availableCarb =
    input.sugar_g + (input.starch_g ?? Math.max(0, input.carb_g - input.sugar_g - input.fiber_g));
  if (availableCarb < MIN_CARBS_FOR_GI) {
    return { gi: null, gi_source: 'n/a' };
  }

  // Tier 2 — category default
  if (input.category) {
    const cat = CATEGORY_DEFAULTS[input.category];
    if (cat) {
      return {
        gi: cat.gi,
        gi_source: 'estimated_category',
        gi_low_ci: cat.range[0],
        gi_high_ci: cat.range[1],
      };
    }
  }

  // Tier 3 — composition heuristic
  return estimateGiFromComposition(input);
}

/** Glycemic Load: GL = (GI × available_carb_g) / 100 */
export function glycemicLoad(gi: number | null, availableCarbG: number): number {
  if (gi === null || availableCarbG <= 0) return 0;
  return round((gi * availableCarbG) / 100, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
