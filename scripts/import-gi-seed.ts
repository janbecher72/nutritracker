/**
 * Import GI seed values from CSV into the gi_seed table.
 * Run: pnpm tsx scripts/import-gi-seed.ts
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface SeedRow {
  name_en: string;
  name_cs: string | null;
  gi_value: number;
  gi_low_ci: number | null;
  gi_high_ci: number | null;
  source: string;
  notes: string | null;
}

function parseCSV(content: string): SeedRow[] {
  const lines = content.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  const rows: SeedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Simple CSV parser (no quoted fields with commas in our seed)
    const cells = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (cells[idx] ?? '').trim();
    });

    rows.push({
      name_en: row.name_en,
      name_cs: row.name_cs || null,
      gi_value: Number(row.gi_value),
      gi_low_ci: row.gi_low_ci ? Number(row.gi_low_ci) : null,
      gi_high_ci: row.gi_high_ci ? Number(row.gi_high_ci) : null,
      source: row.source,
      notes: row.notes || null,
    });
  }
  return rows;
}

async function main() {
  const csvPath = resolve(process.cwd(), 'supabase/seed/gi_seed.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);

  console.log(`Loaded ${rows.length} GI seed rows from CSV.`);

  // Idempotent: clear existing seed rows from same source then insert
  const sources = [...new Set(rows.map((r) => r.source))];
  for (const src of sources) {
    const { error } = await supabase.from('gi_seed').delete().eq('source', src);
    if (error) console.warn(`Could not clear source ${src}:`, error.message);
  }

  // Insert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('gi_seed').insert(chunk);
    if (error) {
      console.error(`Insert error at chunk ${i / chunkSize}:`, error);
      process.exit(1);
    }
    console.log(`Inserted ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }

  console.log('GI seed import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
