/**
 * Database types — placeholder until `supabase gen types` can be run.
 * Re-generate with:
 *   supabase gen types typescript --project-id kklqedqqnurqmejbvbmg > src/types/database.gen.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GiSource =
  | 'measured'
  | 'estimated_category'
  | 'estimated_composition'
  | 'user_override'
  | 'n/a';

export type IngredientSource = 'usda' | 'custom';

export type MealCategory =
  | 'breakfast'
  | 'snack_morning'
  | 'lunch'
  | 'snack_afternoon'
  | 'dinner'
  | 'pre_workout'
  | 'post_workout';

export type DiarySourceType = 'ingredient' | 'recipe' | 'adhoc';

interface ProfileRow {
  id: string;
  email: string | null;
  prefs: Json;
  created_at: string;
  updated_at: string;
}

interface IngredientRow {
  id: string;
  usda_fdc_id: number | null;
  name_en: string;
  name_cs: string | null;
  source: IngredientSource;
  category: string | null;
  kcal: number | null;
  protein_g: number | null;
  carb_g: number | null;
  sugar_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  fiber_g: number | null;
  starch_g: number | null;
  vitamins: Json | null;
  minerals: Json | null;
  gi: number | null;
  gi_source: GiSource;
  portion_g: number | null;
  density_g_per_ml: number | null;
  created_at: string;
  updated_at: string;
}

interface GiSeedRow {
  id: string;
  name_en: string;
  name_cs: string | null;
  usda_fdc_id: number | null;
  gi_value: number;
  gi_low_ci: number | null;
  gi_high_ci: number | null;
  source: string;
  notes: string | null;
  created_at: string;
}

interface RecipeRow {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  tags: string[];
  notes: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  amount_g: number;
  position: number;
}

interface DiaryEntryRow {
  id: string;
  user_id: string;
  eaten_at: string;
  meal_category: MealCategory;
  source_type: DiarySourceType;
  ingredient_id: string | null;
  recipe_id: string | null;
  amount_g: number | null;
  servings: number | null;
  adhoc_name: string | null;
  adhoc_kcal: number | null;
  adhoc_protein_g: number | null;
  adhoc_carb_g: number | null;
  adhoc_fat_g: number | null;
  adhoc_fiber_g: number | null;
  adhoc_sugar_g: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface NutrientSnapshotRow {
  user_id: string;
  date: string;
  kcal: number;
  protein_g: number;
  carb_g: number;
  sugar_g: number;
  fat_g: number;
  sat_fat_g: number;
  fiber_g: number;
  gi_weighted: number | null;
  gl_total: number;
  vitamins: Json;
  minerals: Json;
  incomplete_nutrients: string[];
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      ingredients: {
        Row: IngredientRow;
        Insert: Partial<IngredientRow> & { name_en: string; source: IngredientSource };
        Update: Partial<IngredientRow>;
        Relationships: [];
      };
      gi_seed: {
        Row: GiSeedRow;
        Insert: Partial<GiSeedRow> & { name_en: string; gi_value: number; source: string };
        Update: Partial<GiSeedRow>;
        Relationships: [];
      };
      recipes: {
        Row: RecipeRow;
        Insert: Partial<RecipeRow> & { user_id: string; name: string; servings: number };
        Update: Partial<RecipeRow>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: RecipeIngredientRow;
        Insert: Omit<RecipeIngredientRow, 'id'> & { id?: string };
        Update: Partial<RecipeIngredientRow>;
        Relationships: [];
      };
      diary_entries: {
        Row: DiaryEntryRow;
        Insert: Partial<DiaryEntryRow> & {
          user_id: string;
          eaten_at: string;
          meal_category: MealCategory;
          source_type: DiarySourceType;
        };
        Update: Partial<DiaryEntryRow>;
        Relationships: [];
      };
      nutrient_snapshots: {
        Row: NutrientSnapshotRow;
        Insert: Partial<NutrientSnapshotRow> & { user_id: string; date: string };
        Update: Partial<NutrientSnapshotRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_ingredients: {
        Args: { q: string; max_results?: number };
        Returns: IngredientRow[];
      };
    };
    Enums: {
      gi_source: GiSource;
      ingredient_source: IngredientSource;
      meal_category: MealCategory;
      diary_source_type: DiarySourceType;
    };
    CompositeTypes: Record<string, never>;
  };
}
