-- NutriTracker — initial schema
-- See PRD_NutriTracker_FINAL.md §5 for the data model

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists "pg_trgm" with schema public;

-- ============================================================================
-- Enums
-- ============================================================================
create type public.gi_source as enum (
  'measured',
  'estimated_category',
  'estimated_composition',
  'user_override',
  'n/a'
);

create type public.ingredient_source as enum (
  'usda',
  'custom'
);

create type public.meal_category as enum (
  'breakfast',
  'snack_morning',
  'lunch',
  'snack_afternoon',
  'dinner',
  'pre_workout',
  'post_workout'
);

create type public.diary_source_type as enum (
  'ingredient',
  'recipe',
  'adhoc'
);

-- ============================================================================
-- profiles — extends auth.users with app-specific preferences
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ingredients — master food database (USDA + user custom)
-- ============================================================================
create table public.ingredients (
  id uuid primary key default uuid_generate_v4(),
  usda_fdc_id integer unique,
  name_en text not null,
  name_cs text,
  source public.ingredient_source not null,
  category text,

  -- Macros (per 100 g)
  kcal numeric(7,2),
  protein_g numeric(7,2),
  carb_g numeric(7,2),
  sugar_g numeric(7,2),
  fat_g numeric(7,2),
  sat_fat_g numeric(7,2),
  fiber_g numeric(7,2),
  starch_g numeric(7,2),

  -- Micros stored as JSONB for flexibility
  vitamins jsonb,
  minerals jsonb,

  -- Glycemic data
  gi numeric(5,1),
  gi_source public.gi_source not null default 'n/a',

  -- Reference portion + density
  portion_g numeric(7,2),
  density_g_per_ml numeric(6,3),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingredients_name_en_trgm on public.ingredients using gin (name_en gin_trgm_ops);
create index ingredients_name_cs_trgm on public.ingredients using gin (name_cs gin_trgm_ops) where name_cs is not null;
create index ingredients_category_idx on public.ingredients (category) where category is not null;
create index ingredients_source_idx on public.ingredients (source);

-- ============================================================================
-- gi_seed — measured glycemic index values (Tier 1 lookup)
-- ============================================================================
create table public.gi_seed (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_cs text,
  usda_fdc_id integer,
  gi_value numeric(5,1) not null,
  gi_low_ci numeric(5,1),
  gi_high_ci numeric(5,1),
  source text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index gi_seed_name_en_trgm on public.gi_seed using gin (name_en gin_trgm_ops);
create index gi_seed_fdc_id_idx on public.gi_seed (usda_fdc_id) where usda_fdc_id is not null;

-- ============================================================================
-- recipes — user-owned recipes (templates for diary)
-- ============================================================================
create table public.recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings numeric(5,1) not null check (servings > 0),
  tags text[] not null default array[]::text[],
  notes text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);
create index recipes_tags_idx on public.recipes using gin (tags);

create table public.recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  amount_g numeric(8,2) not null check (amount_g > 0),
  position smallint not null default 0
);

create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);

-- ============================================================================
-- diary_entries — what the user actually ate
-- ============================================================================
create table public.diary_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null,
  meal_category public.meal_category not null,
  source_type public.diary_source_type not null,

  -- exactly one of these is set, depending on source_type
  ingredient_id uuid references public.ingredients(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  amount_g numeric(8,2),
  servings numeric(5,1),

  -- ad-hoc entry fields (manual nutrition input)
  adhoc_name text,
  adhoc_kcal numeric(7,2),
  adhoc_protein_g numeric(7,2),
  adhoc_carb_g numeric(7,2),
  adhoc_fat_g numeric(7,2),
  adhoc_fiber_g numeric(7,2),
  adhoc_sugar_g numeric(7,2),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint diary_entry_source_consistency check (
    (source_type = 'ingredient' and ingredient_id is not null and amount_g is not null)
    or (source_type = 'recipe' and recipe_id is not null and servings is not null)
    or (source_type = 'adhoc' and adhoc_name is not null)
  )
);

create index diary_entries_user_date_idx on public.diary_entries (user_id, eaten_at desc);
create index diary_entries_user_id_idx on public.diary_entries (user_id);

-- ============================================================================
-- nutrient_snapshots — denormalized daily totals for fast dashboard queries
-- ============================================================================
create table public.nutrient_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  kcal numeric(8,2) not null default 0,
  protein_g numeric(7,2) not null default 0,
  carb_g numeric(7,2) not null default 0,
  sugar_g numeric(7,2) not null default 0,
  fat_g numeric(7,2) not null default 0,
  sat_fat_g numeric(7,2) not null default 0,
  fiber_g numeric(7,2) not null default 0,
  gi_weighted numeric(5,1),
  gl_total numeric(7,1) not null default 0,
  vitamins jsonb not null default '{}'::jsonb,
  minerals jsonb not null default '{}'::jsonb,
  incomplete_nutrients text[] not null default array[]::text[],
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index nutrient_snapshots_user_date_idx on public.nutrient_snapshots (user_id, date desc);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_ingredients before update on public.ingredients
  for each row execute function public.touch_updated_at();
create trigger touch_recipes before update on public.recipes
  for each row execute function public.touch_updated_at();
create trigger touch_diary_entries before update on public.diary_entries
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.gi_seed enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.diary_entries enable row level security;
alter table public.nutrient_snapshots enable row level security;

-- profiles: users see/update only their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ingredients & gi_seed: read-only shared (any authenticated user can read)
create policy "ingredients_select_authenticated" on public.ingredients
  for select to authenticated using (true);
create policy "gi_seed_select_authenticated" on public.gi_seed
  for select to authenticated using (true);

-- recipes: full CRUD on own rows
create policy "recipes_select_own" on public.recipes
  for select using (auth.uid() = user_id);
create policy "recipes_insert_own" on public.recipes
  for insert with check (auth.uid() = user_id);
create policy "recipes_update_own" on public.recipes
  for update using (auth.uid() = user_id);
create policy "recipes_delete_own" on public.recipes
  for delete using (auth.uid() = user_id);

-- recipe_ingredients: access via parent recipe ownership
create policy "recipe_ingredients_select" on public.recipe_ingredients
  for select using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );
create policy "recipe_ingredients_insert" on public.recipe_ingredients
  for insert with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );
create policy "recipe_ingredients_update" on public.recipe_ingredients
  for update using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );
create policy "recipe_ingredients_delete" on public.recipe_ingredients
  for delete using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid())
  );

-- diary_entries: full CRUD on own rows
create policy "diary_entries_select_own" on public.diary_entries
  for select using (auth.uid() = user_id);
create policy "diary_entries_insert_own" on public.diary_entries
  for insert with check (auth.uid() = user_id);
create policy "diary_entries_update_own" on public.diary_entries
  for update using (auth.uid() = user_id);
create policy "diary_entries_delete_own" on public.diary_entries
  for delete using (auth.uid() = user_id);

-- nutrient_snapshots: read-only for users (server writes via service_role)
create policy "nutrient_snapshots_select_own" on public.nutrient_snapshots
  for select using (auth.uid() = user_id);
