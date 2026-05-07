'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (open) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl'
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-6 pt-6 pb-2">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight pr-8">{children}</h2>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 mt-1">{children}</p>;
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 flex justify-end gap-2 border-t border-zinc-800">{children}</div>;
}
