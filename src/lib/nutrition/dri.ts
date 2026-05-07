/**
 * Dietary Reference Intakes (DRI) — Recommended Daily Allowance (RDA).
 * Source: NIH Office of Dietary Supplements, adult male 19–50 y reference.
 * Used purely informatively (PRD §F4.3) — app does not give recommendations.
 */

import type { Micros } from '@/types/domain';

export const DRI_ADULT_MALE: Required<{ [K in keyof Micros]: number }> = {
  vitamin_a_ug: 900,
  vitamin_b1_mg: 1.2,
  vitamin_b2_mg: 1.3,
  vitamin_b3_mg: 16,
  vitamin_b6_mg: 1.3,
  vitamin_b9_ug: 400,
  vitamin_b12_ug: 2.4,
  vitamin_c_mg: 90,
  vitamin_d_ug: 15,
  vitamin_e_mg: 15,
  vitamin_k_ug: 120,
  calcium_mg: 1000,
  iron_mg: 8,
  magnesium_mg: 400,
  potassium_mg: 3400,
  sodium_mg: 1500,
  zinc_mg: 11,
  selenium_ug: 55,
};

/**
 * Returns micronutrients where intake < 70% of RDA.
 * Skips nutrients with `n/a` (null) intake — caller already handles incomplete data.
 */
export function findDeficits(intake: Micros, rda = DRI_ADULT_MALE): string[] {
  const deficits: string[] = [];
  for (const [key, target] of Object.entries(rda)) {
    const value = intake[key as keyof Micros];
    if (value == null) continue;
    if (value < target * 0.7) deficits.push(key);
  }
  return deficits;
}

export function pctOfRda(value: number | null | undefined, key: keyof Micros): number | null {
  if (value == null) return null;
  const target = DRI_ADULT_MALE[key];
  if (!target) return null;
  return Math.round((value / target) * 100);
}
