-- Allow authenticated users to write to ingredients (single-user app).
-- INSERT only with source='custom' to prevent fake USDA entries.

create policy "ingredients_insert_custom" on public.ingredients
  for insert to authenticated
  with check (source = 'custom');

create policy "ingredients_update_authenticated" on public.ingredients
  for update to authenticated using (true);

create policy "ingredients_delete_custom" on public.ingredients
  for delete to authenticated using (source = 'custom');
