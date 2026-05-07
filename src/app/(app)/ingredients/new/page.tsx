import { CustomIngredientForm } from '@/components/ingredients/custom-form';

export default function NewIngredientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Vlastní potravina</h1>
      <p className="text-sm text-zinc-400">
        Pojmenuj potravinu česky. Hodnoty zadávej <strong>na 100 g</strong>. Glykemický
        index bude odhadnut automaticky podle kompozice (více v dokumentu GI Estimation
        Model).
      </p>
      <CustomIngredientForm />
    </div>
  );
}
