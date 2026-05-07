import type { MealCategory } from '@/types/database';

export const MEAL_CATEGORIES: { value: MealCategory; label: string; defaultHour: number }[] = [
  { value: 'breakfast', label: 'Snídaně', defaultHour: 7 },
  { value: 'snack_morning', label: 'Dopolední svačina', defaultHour: 10 },
  { value: 'lunch', label: 'Oběd', defaultHour: 12 },
  { value: 'snack_afternoon', label: 'Odpolední svačina', defaultHour: 15 },
  { value: 'dinner', label: 'Večeře', defaultHour: 19 },
  { value: 'pre_workout', label: 'Před tréninkem', defaultHour: 17 },
  { value: 'post_workout', label: 'Po tréninku', defaultHour: 20 },
];

export const MEAL_LABELS: Record<MealCategory, string> = Object.fromEntries(
  MEAL_CATEGORIES.map((c) => [c.value, c.label])
) as Record<MealCategory, string>;
