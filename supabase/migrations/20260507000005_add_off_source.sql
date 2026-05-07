-- Add Open Food Facts as a third ingredient source.
alter type public.ingredient_source add value if not exists 'off';

alter table public.ingredients
  add column if not exists off_code text,
  add column if not exists image_url text,
  add column if not exists external_url text;

create unique index if not exists ingredients_off_code_uniq
  on public.ingredients (off_code) where off_code is not null;

-- Allow inserts with source = 'custom' OR 'off' (replacing 004's custom-only policy)
drop policy if exists "ingredients_insert_custom" on public.ingredients;
create policy "ingredients_insert_custom_or_off" on public.ingredients
  for insert to authenticated
  with check (source in ('custom', 'off'));
