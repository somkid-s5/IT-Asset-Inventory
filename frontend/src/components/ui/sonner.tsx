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
      gap={12}
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            'rounded-[24px] border-2 border-border/70 bg-popover/95 text-popover-foreground shadow-[0_24px_80px_-36px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all duration-300 p-4 gap-4',
          title: 'text-[15px] font-bold font-display uppercase tracking-tight ml-1',
          description: 'text-[13px] text-muted-foreground font-medium opacity-90 ml-1',
          actionButton: 'bg-primary text-primary-foreground font-bold rounded-xl px-4',
          cancelButton: 'bg-muted text-muted-foreground font-bold rounded-xl px-4',
          success: '!border-success/30 !bg-success/12 !text-success shadow-[0_0_40px_-12px_rgba(var(--success),0.2)]',
          error: '!border-destructive/30 !bg-destructive/12 !text-destructive shadow-[0_0_40px_-12px_rgba(var(--destructive),0.2)]',
          warning: '!border-warning/30 !bg-warning/12 !text-warning shadow-[0_0_40px_-12px_rgba(var(--warning),0.2)]',
          info: '!border-info/30 !bg-info/12 !text-info shadow-[0_0_40px_-12px_rgba(var(--info),0.2)]',
        },
      }}      icons={{
        success: <div className="rounded-lg p-1 bg-success/20 border border-success/30 animate-toast-bounce"><CircleCheckIcon className="size-4" strokeWidth={3} /></div>,
        info: <div className="rounded-lg p-1 bg-info/20 border border-info/30 animate-toast-float"><InfoIcon className="size-4" strokeWidth={3} /></div>,
        warning: <div className="rounded-lg p-1 bg-warning/20 border border-warning/30 animate-toast-pulse"><TriangleAlertIcon className="size-4" strokeWidth={3} /></div>,
        error: <div className="rounded-lg p-1 bg-destructive/20 border border-destructive/30 animate-toast-shake"><OctagonXIcon className="size-4" strokeWidth={3} /></div>,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />,
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
