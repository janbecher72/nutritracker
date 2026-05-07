/**
 * Domain types — derived/calculated values not stored as-is in DB.
 */

export interface MacroBreakdown {
  kcal: number;
  protein_g: number;
  carb_g: number;
  sugar_g: number;
  fat_g: number;
  sat_fat_g: number;
  fiber_g: number;
}

export interface Micros {
  vitamin_a_ug?: number | null;
  vitamin_b1_mg?: number | null;
  vitamin_b2_mg?: number | null;
  vitamin_b3_mg?: number | null;
  vitamin_b6_mg?: number | null;
  vitamin_b9_ug?: number | null;
  vitamin_b12_ug?: number | null;
  vitamin_c_mg?: number | null;
  vitamin_d_ug?: number | null;
  vitamin_e_mg?: number | null;
  vitamin_k_ug?: number | null;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  magnesium_mg?: number | null;
  potassium_mg?: number | null;
  sodium_mg?: number | null;
  zinc_mg?: number | null;
  selenium_ug?: number | null;
}

export interface DayTotals extends MacroBreakdown {
  date: string;
  gi_weighted: number | null;
  gl_total: number;
  micros: Micros;
  /** Names of micronutrients with > 20% missing data — flagged as incomplete. */
  incomplete: string[];
}

export interface PCFSplit {
  protein_pct: number;
  carb_pct: number;
  fat_pct: number;
}

/**
 * One row contributing to a calculation — flattened representation
 * of a diary entry already resolved to its nutritional values.
 */
export interface NutritionRow {
  amount_g: number;
  kcal: number;
  protein_g: number;
  carb_g: number;
  sugar_g: number;
  fat_g: number;
  sat_fat_g: number;
  fiber_g: number;
  gi: number | null;
  micros: Micros;
}
