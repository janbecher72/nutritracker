import { describe, expect, it } from 'vitest';
import {
  pcfSplit,
  scaleRow,
  sumDay,
  sumRows,
  totalGL,
  weightedGI,
} from './calculate';
import type { NutritionRow } from '@/types/domain';

function row(overrides: Partial<NutritionRow> = {}): NutritionRow {
  return {
    amount_g: 100,
    kcal: 100,
    protein_g: 5,
    carb_g: 20,
    sugar_g: 5,
    fat_g: 1,
    sat_fat_g: 0,
    fiber_g: 2,
    gi: 50,
    micros: {
      vitamin_c_mg: 10,
      iron_mg: 1,
      magnesium_mg: 25,
    },
    ...overrides,
  };
}

describe('sumRows', () => {
  it('sums macros across rows', () => {
    const result = sumRows([row(), row()]);
    expect(result.macros.kcal).toBe(200);
    expect(result.macros.protein_g).toBe(10);
    expect(result.macros.fiber_g).toBe(4);
  });

  it('sums micros and skips nulls', () => {
    const result = sumRows([
      row({ micros: { vitamin_c_mg: 10 } }),
      row({ micros: { vitamin_c_mg: 5 } }),
    ]);
    expect(result.micros.vitamin_c_mg).toBe(15);
  });

  it('flags incomplete micros when > 20% rows missing data', () => {
    const result = sumRows([
      row({ micros: { vitamin_d_ug: null, vitamin_c_mg: 10 } }),
      row({ micros: { vitamin_d_ug: null, vitamin_c_mg: 5 } }),
      row({ micros: { vitamin_d_ug: 2, vitamin_c_mg: 5 } }),
    ]);
    expect(result.incomplete).toContain('vitamin_d_ug');
    expect(result.incomplete).not.toContain('vitamin_c_mg');
  });
});

describe('weightedGI', () => {
  it('returns null when all rows have null GI', () => {
    expect(weightedGI([row({ gi: null })])).toBeNull();
  });

  it('weights GI by available carbs (carb - fiber)', () => {
    // Row A: GI 50, carb 20, fiber 0 → weight 20
    // Row B: GI 100, carb 30, fiber 0 → weight 30
    // weighted = (50*20 + 100*30) / 50 = 80
    const result = weightedGI([
      row({ gi: 50, carb_g: 20, fiber_g: 0 }),
      row({ gi: 100, carb_g: 30, fiber_g: 0 }),
    ]);
    expect(result).toBe(80);
  });

  it('ignores rows where GI is null even if others are valid', () => {
    const result = weightedGI([
      row({ gi: 50, carb_g: 20, fiber_g: 0 }),
      row({ gi: null, carb_g: 100, fiber_g: 0 }),
    ]);
    expect(result).toBe(50);
  });
});

describe('totalGL', () => {
  it('sums GL across rows using available carbs', () => {
    // Row: GI 50, carb 30, fiber 5 → available 25 → GL = 12.5
    const result = totalGL([row({ gi: 50, carb_g: 30, fiber_g: 5 })]);
    expect(result).toBe(12.5);
  });

  it('treats null GI as 0 contribution', () => {
    const result = totalGL([
      row({ gi: 50, carb_g: 20, fiber_g: 0 }),
      row({ gi: null, carb_g: 50, fiber_g: 0 }),
    ]);
    expect(result).toBe(10);
  });
});

describe('pcfSplit', () => {
  it('computes percentage split using Atwater factors with net carbs', () => {
    // 25g protein × 4 = 100, net 50g carb (60-10) × 4 = 200, 22g fat × 9 ≈ 200
    const result = pcfSplit({
      kcal: 500,
      protein_g: 25,
      carb_g: 60,
      sugar_g: 0,
      fat_g: 22,
      sat_fat_g: 0,
      fiber_g: 10,
    });
    expect(result.protein_pct + result.carb_pct + result.fat_pct).toBeGreaterThanOrEqual(99);
    expect(result.protein_pct + result.carb_pct + result.fat_pct).toBeLessThanOrEqual(101);
  });

  it('returns zeros for empty intake', () => {
    const result = pcfSplit({
      kcal: 0,
      protein_g: 0,
      carb_g: 0,
      sugar_g: 0,
      fat_g: 0,
      sat_fat_g: 0,
      fiber_g: 0,
    });
    expect(result).toEqual({ protein_pct: 0, carb_pct: 0, fat_pct: 0 });
  });
});

describe('sumDay', () => {
  it('aggregates totals + GI + GL for a date', () => {
    const result = sumDay('2026-05-07', [row(), row({ gi: 70 })]);
    expect(result.date).toBe('2026-05-07');
    expect(result.kcal).toBe(200);
    expect(result.gi_weighted).not.toBeNull();
    expect(result.gl_total).toBeGreaterThan(0);
  });
});

describe('scaleRow', () => {
  it('multiplies macros and amount but keeps GI unchanged', () => {
    const scaled = scaleRow(row(), 2);
    expect(scaled.amount_g).toBe(200);
    expect(scaled.kcal).toBe(200);
    expect(scaled.protein_g).toBe(10);
    expect(scaled.gi).toBe(50); // GI is intensive — does not scale
  });

  it('preserves null micros after scaling', () => {
    const scaled = scaleRow(row({ micros: { vitamin_d_ug: null } }), 3);
    expect(scaled.micros.vitamin_d_ug).toBeNull();
  });
});
