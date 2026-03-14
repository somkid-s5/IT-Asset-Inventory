'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { Bell, Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

interface AppLayoutProps {
  children: ReactNode;
}

const pageTitles: Record<string, string> = {
  '/dashboard/assets': 'Asset Inventory',
  '/dashboard/vault': 'Credential Vault',
  '/dashboard/settings': 'Settings',
  '/dashboard/feedback': 'Feedback',
  '/dashboard/help': 'Help Center',
  '/dashboard': 'Operations Overview',
};

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const currentPath = pathname || '/';
  const title =
    Object.entries(pageTitles)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => currentPath.startsWith(path))?.[1] ?? 'InfraPilot';

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/88 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Workspace
                </p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-xl border border-border/70 bg-card/80 p-2.5 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button className="relative rounded-xl border border-border/70 bg-card/80 p-2.5 text-muted-foreground shadow-sm transition-colors hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
                </button>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                  SA
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
