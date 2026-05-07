-- Fulltext / fuzzy search function for ingredients.
-- Used by IngredientSearch component (PRD §F1.3).

create or replace function public.search_ingredients(q text, max_results integer default 20)
returns setof public.ingredients
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.ingredients
  where
    name_en ilike '%' || q || '%'
    or (name_cs is not null and name_cs ilike '%' || q || '%')
    or similarity(name_en, q) > 0.25
    or (name_cs is not null and similarity(name_cs, q) > 0.25)
  order by
    case
      when name_en ilike q || '%' then 0
      when name_cs ilike q || '%' then 0
      when name_en ilike '%' || q || '%' then 1
      when name_cs ilike '%' || q || '%' then 1
      else 2
    end,
    greatest(
      similarity(name_en, q),
      coalesce(similarity(name_cs, q), 0)
    ) desc,
    name_en asc
  limit max_results
$$;

grant execute on function public.search_ingredients(text, integer) to authenticated;
