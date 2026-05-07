import { redirect } from 'next/navigation';
import { todayLocalISO } from '@/lib/utils';

export default async function DiaryIndex({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  redirect(`/diary/${params.date ?? todayLocalISO()}`);
}
