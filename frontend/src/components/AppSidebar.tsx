'use client';

import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { AppWindow, Database, HelpCircle, LayoutDashboard, MessageSquare, Monitor, Search, Server, Shield, Settings } from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'VM', url: '/dashboard/vm', icon: Monitor },
  { title: 'APP', url: '/dashboard/app', icon: AppWindow },
  { title: 'DB', url: '/dashboard/db', icon: Database },
];

const bottomItems = [
  { title: 'Settings', url: '/dashboard/settings', icon: Settings },
  { title: 'Feedback', url: '/dashboard/feedback', icon: MessageSquare },
  { title: 'Help Center', url: '/dashboard/help', icon: HelpCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const currentPath = pathname || '/';

  return (
    <aside className="hidden min-h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Asset Platform</p>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">InfraPilot</h1>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Search</span>
            <span className="rounded-md border border-sidebar-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Ctrl K
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active =
              item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

            return (
              <NavLink
                key={item.url}
                href={item.url}
                end={item.url === '/dashboard'}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg bg-background text-muted-foreground dark:bg-card',
                    active && 'bg-foreground text-background dark:bg-foreground dark:text-background',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.url}
              href={item.url}
              end
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
