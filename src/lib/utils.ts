import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}

export function todayLocalISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
}

export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null) return 'n/a';
  return n.toFixed(decimals);
}
