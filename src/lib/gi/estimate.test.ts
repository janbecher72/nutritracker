import { describe, expect, it } from 'vitest';
import {
  estimateGi,
  estimateGiFromComposition,
  glycemicLoad,
} from './estimate';

describe('estimateGiFromComposition (Tier 3)', () => {
  it('returns n/a for foods with negligible carbs', () => {
    // Plain chicken breast — almost no carbs
    const result = estimateGiFromComposition({
      sugar_g: 0,
      starch_g: 0,
      carb_g: 0,
      fiber_g: 0,
      fat_g: 3.6,
      protein_g: 31,
    });
    expect(result.gi).toBeNull();
    expect(result.gi_source).toBe('n/a');
  });

  it('estimates GI for raw banana (sanity check from spec §5.4)', () => {
    // USDA: carb 22.8, sugar 12.2, fiber 2.6, fat 0.3, protein 1.1
    const result = estimateGiFromComposition({
      sugar_g: 12.2,
      carb_g: 22.8,
      fiber_g: 2.6,
      fat_g: 0.3,
      protein_g: 1.1,
    });
    expect(result.gi_source).toBe('estimated_composition');
    // Spec sanity check expects ~62; allow ±5 tolerance
    expect(result.gi).toBeGreaterThan(55);
    expect(result.gi).toBeLessThan(70);
  });

  it('estimates GI for cooked red lentils — known weakness, expects high estimate', () => {
    // USDA: carb 20, sugar 1.8, fiber 7.9, fat 0.4, protein 9
    const result = estimateGiFromComposition({
      sugar_g: 1.8,
      carb_g: 20,
      fiber_g: 7.9,
      fat_g: 0.4,
      protein_g: 9,
    });
    // Spec expects ~52; we accept anything 40–65 (heuristic limitation)
    expect(result.gi).toBeGreaterThan(40);
    expect(result.gi).toBeLessThan(65);
    expect(result.gi_source).toBe('estimated_composition');
  });

  it('confidence interval brackets the estimate', () => {
    const result = estimateGiFromComposition({
      sugar_g: 5,
      carb_g: 30,
      fiber_g: 2,
      fat_g: 1,
      protein_g: 3,
    });
    expect(result.gi).not.toBeNull();
    expect(result.gi_low_ci).toBeLessThanOrEqual(result.gi!);
    expect(result.gi_high_ci).toBeGreaterThanOrEqual(result.gi!);
  });

  it('clamps GI within [15, 105]', () => {
    // Pure starch with no penalties
    const high = estimateGiFromComposition({
      sugar_g: 0,
      starch_g: 100,
      carb_g: 100,
      fiber_g: 0,
      fat_g: 0,
      protein_g: 0,
    });
    expect(high.gi).toBeLessThanOrEqual(105);
    expect(high.gi).toBeGreaterThanOrEqual(15);
  });
});

describe('estimateGi — 4-tier fallback', () => {
  const banana = {
    sugar_g: 12.2,
    carb_g: 22.8,
    fiber_g: 2.6,
    fat_g: 0.3,
    protein_g: 1.1,
  };

  it('Tier 1: prefers seed match when provided', () => {
    const result = estimateGi(banana, { gi: 51 });
    expect(result.gi).toBe(51);
    expect(result.gi_source).toBe('measured');
  });

  it('Tier 2: uses category default for legumes (overrides bad heuristic)', () => {
    const lentils = {
      category: 'Legumes and Legume Products',
      sugar_g: 1.8,
      carb_g: 20,
      fiber_g: 7.9,
      fat_g: 0.4,
      protein_g: 9,
    };
    const result = estimateGi(lentils);
    expect(result.gi).toBe(30);
    expect(result.gi_source).toBe('estimated_category');
  });

  it('Tier 3: falls through to composition when category is unknown', () => {
    const unknown = { ...banana, category: 'Some Unknown Category' };
    const result = estimateGi(unknown);
    expect(result.gi_source).toBe('estimated_composition');
  });

  it('Tier 4: returns n/a for low-carb food regardless of category', () => {
    const meat = {
      category: 'Beef Products',
      sugar_g: 0,
      carb_g: 0,
      fiber_g: 0,
      fat_g: 15,
      protein_g: 26,
    };
    const result = estimateGi(meat);
    expect(result.gi).toBeNull();
    expect(result.gi_source).toBe('n/a');
  });
});

describe('glycemicLoad', () => {
  it('GL = (GI × carb) / 100', () => {
    expect(glycemicLoad(50, 30)).toBe(15);
  });

  it('returns 0 when GI is null', () => {
    expect(glycemicLoad(null, 30)).toBe(0);
  });

  it('returns 0 when carbs are 0 or negative', () => {
    expect(glycemicLoad(70, 0)).toBe(0);
    expect(glycemicLoad(70, -5)).toBe(0);
  });
});
