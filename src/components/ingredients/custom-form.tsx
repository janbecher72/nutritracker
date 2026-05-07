'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCustomIngredient } from '@/app/actions/ingredients';

export function CustomIngredientForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name_en: '',
    name_cs: '',
    category: '',
    kcal: '',
    protein_g: '',
    carb_g: '',
    sugar_g: '',
    fat_g: '',
    fiber_g: '',
    portion_g: '',
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function num(s: string): number | null {
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name_en.trim() && !form.name_cs.trim()) {
      alert('Zadej alespoň jeden název.');
      return;
    }
    startTransition(async () => {
      const result = await createCustomIngredient({
        name_en: form.name_en.trim() || form.name_cs.trim(),
        name_cs: form.name_cs.trim() || null,
        category: form.category.trim() || null,
        kcal: num(form.kcal),
        protein_g: num(form.protein_g),
        carb_g: num(form.carb_g),
        sugar_g: num(form.sugar_g),
        fat_g: num(form.fat_g),
        fiber_g: num(form.fiber_g),
        portion_g: num(form.portion_g),
      });
      if (result?.error) alert(`Chyba: ${result.error}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Název EN</Label>
          <Input value={form.name_en} onChange={(e) => set('name_en', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Název CZ</Label>
          <Input value={form.name_cs} onChange={(e) => set('name_cs', e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Kategorie (volitelné)</Label>
          <Input value={form.category} onChange={(e) => set('category', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4 space-y-3">
        <div className="text-sm font-semibold text-zinc-300">Nutriční hodnoty / 100 g</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Kcal" value={form.kcal} onChange={(v) => set('kcal', v)} />
          <NumberField
            label="Bílkoviny (g)"
            value={form.protein_g}
            onChange={(v) => set('protein_g', v)}
          />
          <NumberField
            label="Sacharidy (g)"
            value={form.carb_g}
            onChange={(v) => set('carb_g', v)}
          />
          <NumberField
            label="Cukry (g)"
            value={form.sugar_g}
            onChange={(v) => set('sugar_g', v)}
          />
          <NumberField label="Tuky (g)" value={form.fat_g} onChange={(v) => set('fat_g', v)} />
          <NumberField
            label="Vláknina (g)"
            value={form.fiber_g}
            onChange={(v) => set('fiber_g', v)}
          />
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4 space-y-2">
        <Label>Referenční porce (g, volitelné)</Label>
        <Input
          type="number"
          value={form.portion_g}
          onChange={(e) => set('portion_g', e.target.value)}
          placeholder="např. 50"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Zrušit
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Ukládám…' : 'Vytvořit'}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
