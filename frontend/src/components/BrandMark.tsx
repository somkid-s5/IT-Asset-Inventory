'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  compact?: boolean;
  tone?: 'default' | 'inverse';
  className?: string;
}

export function BrandMark({ compact = false, tone = 'default', className }: BrandMarkProps) {
  const titleClass = tone === 'inverse' ? 'text-white' : 'text-foreground';
  const subtitleClass = tone === 'inverse' ? 'text-white/60' : 'text-muted-foreground';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[1.1rem] border border-primary/25 bg-[linear-gradient(180deg,hsl(var(--primary))_0%,color-mix(in_oklab,hsl(var(--primary))_55%,black_45%)_100%)] text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklab,hsl(var(--primary))_60%,transparent)]">
        <div className="absolute inset-[1px] rounded-[1rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_55%)]" />
        <Shield className="relative h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0">
        <p className={cn('font-display text-lg font-semibold uppercase tracking-[0.24em]', titleClass)}>
          AssetOps
        </p>
        {!compact && (
          <p className={cn('text-[11px] uppercase tracking-[0.22em]', subtitleClass)}>
            IT Asset Inventory
          </p>
        )}
      </div>
    </div>
  );
}
