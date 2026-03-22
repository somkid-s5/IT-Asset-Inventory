'use client';

import type { CSSProperties } from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      richColors
      expand={false}
      visibleToasts={3}
      gap={10}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            'rounded-[24px] border border-border/70 bg-popover/92 text-popover-foreground shadow-[0_24px_80px_-36px_rgba(0,0,0,0.7)] backdrop-blur-2xl',
          title: 'text-sm font-semibold',
          description: 'text-xs text-muted-foreground',
          success: '!border-emerald-500/30 !bg-emerald-500/12 !text-emerald-950 dark:!text-emerald-100',
          error: '!border-rose-500/30 !bg-rose-500/12 !text-rose-950 dark:!text-rose-100',
          warning: '!border-amber-500/30 !bg-amber-500/12 !text-amber-950 dark:!text-amber-100',
          info: '!border-sky-500/30 !bg-sky-500/12 !text-sky-950 dark:!text-sky-100',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '1.25rem',
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
