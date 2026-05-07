# Jak aplikovat migrace na Supabase

Máš dvě možnosti — vyber si jednu.

## Varianta A: Supabase SQL Editor (nejjednodušší, doporučuji)

1. Otevři https://supabase.com/dashboard/project/kklqedqqnurqmejbvbmg
2. V levém menu klikni **SQL Editor** (ikona kódu)
3. Klikni **+ New query**
4. Otevři soubor `supabase/migrations/20260507000001_init.sql`, **zkopíruj celý obsah**, vlož do editoru, klikni **Run** (zkratka Ctrl+Enter)
5. Měl bys vidět "Success. No rows returned"
6. Otevři druhou migraci `supabase/migrations/20260507000002_search_function.sql`, zkopíruj a Run
7. Hotovo — DB má kompletní schema.

## Varianta B: Supabase CLI (vyžaduje DB heslo)

Pokud máš DB heslo (zadané při vytváření projektu):

```powershell
cd C:\Users\jdostal\OneDrive\Documents\Claude\Code\nutritracker
node_modules\.bin\supabase login
node_modules\.bin\supabase link --project-ref kklqedqqnurqmejbvbmg
node_modules\.bin\supabase db push
```

## Po aplikaci migrací — naplň data

V terminálu v root projektu:

```powershell
# 1. GI seed (~80 měřených hodnot)
pnpm tsx scripts/import-gi-seed.ts

# 2. USDA potraviny (~400 položek, trvá 2-3 minuty)
pnpm tsx scripts/import-usda.ts
```

## Ověření

V Supabase Dashboard → **Table Editor** bys měl vidět tabulky:
`profiles`, `ingredients`, `gi_seed`, `recipes`, `recipe_ingredients`, `diary_entries`, `nutrient_snapshots`

`ingredients` by měl mít ~400 řádků, `gi_seed` ~80.
