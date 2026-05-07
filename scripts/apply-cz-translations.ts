/**
 * Apply Czech name translations to ingredients by ILIKE pattern matching.
 * Run: pnpm tsx scripts/apply-cz-translations.ts
 *
 * CSV format: priority,pattern,name_cs
 *   - priority: higher number wins when multiple patterns match (more specific first)
 *   - pattern: case-insensitive substring of ingredients.name_en
 *   - name_cs: Czech translation
 *
 * Lines starting with `#` are comments. Only updates rows where name_cs is null
 * (won't overwrite manual translations).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface Rule {
  priority: number;
  pattern: string;
  name_cs: string;
}

function parseCSV(content: string): Rule[] {
  const lines = content.split(/\r?\n/);
  const rules: Rule[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) continue;
    if (i === 0 && raw.startsWith('priority,')) continue; // header

    // Simple CSV — pattern may be quoted to allow commas
    const m = raw.match(/^(\d+),(?:"([^"]*)"|([^,]*)),(.+)$/);
    if (!m) {
      console.warn(`Skipping malformed line ${i + 1}: ${raw}`);
      continue;
    }
    const priority = Number(m[1]);
    const pattern = (m[2] ?? m[3] ?? '').trim();
    const name_cs = m[4].trim();
    if (!pattern || !name_cs) continue;
    rules.push({ priority, pattern, name_cs });
  }
  return rules;
}

async function main() {
  const csvPath = resolve(process.cwd(), 'supabase/seed/cz_translations.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const rules = parseCSV(content);

  console.log(`Loaded ${rules.length} translation rules.`);

  // Sort: higher priority first, then longer pattern (more specific) first
  rules.sort((a, b) => b.priority - a.priority || b.pattern.length - a.pattern.length);

  // Fetch all ingredients with name_cs IS NULL
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('id, name_en, name_cs')
    .is('name_cs', null);

  if (error) {
    console.error('Could not fetch ingredients:', error);
    process.exit(1);
  }

  console.log(`${ingredients?.length ?? 0} ingredients without Czech name.`);

  const updates: { id: string; name_cs: string; reason: string }[] = [];
  for (const ing of ingredients ?? []) {
    const lowerName = ing.name_en.toLowerCase();
    for (const rule of rules) {
      if (lowerName.includes(rule.pattern.toLowerCase())) {
        updates.push({ id: ing.id, name_cs: rule.name_cs, reason: rule.pattern });
        break; // first matching rule wins (rules are pre-sorted)
      }
    }
  }

  console.log(`Matched ${updates.length} ingredients.`);

  if (updates.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  // Apply updates in chunks
  const chunkSize = 50;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((u) =>
        supabase.from('ingredients').update({ name_cs: u.name_cs }).eq('id', u.id)
      )
    );
    console.log(`Updated ${Math.min(i + chunkSize, updates.length)}/${updates.length}`);
  }

  // Coverage stats
  const { count: total } = await supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true });
  const { count: withCs } = await supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true })
    .not('name_cs', 'is', null);
  console.log(`\nCoverage: ${withCs}/${total} ingredients now have a Czech name.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
