import { CustomIngredientForm } from '@/components/ingredients/custom-form';

export default function NewIngredientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Vlastní potravina</h1>
      <p className="text-sm text-zinc-400">
        Hodnoty zadávej <strong>na 100 g</strong>. GI bude odhadnuto automaticky podle
        kompozice.
      </p>
      <CustomIngredientForm />
    </div>
  );
}
