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
  '/dashboard/vm': 'Virtual Machines',
  '/dashboard/app': 'Applications',
  '/dashboard/db': 'Databases',
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
          <header className="sticky top-0 z-20 border-b border-border bg-background/88 px-5 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Workspace</p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button className="relative rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-foreground dark:bg-foreground" />
                </button>

                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
                  SA
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 pb-8 pt-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
