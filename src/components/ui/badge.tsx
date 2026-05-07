import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white',
        measured: 'bg-emerald-600 text-white',
        estimated_category: 'bg-amber-600 text-white',
        estimated_composition: 'bg-orange-600 text-white',
        user_override: 'bg-purple-600 text-white',
        na: 'bg-zinc-700 text-zinc-300',
        secondary: 'bg-zinc-800 text-zinc-200',
        outline: 'border border-zinc-700 text-zinc-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
