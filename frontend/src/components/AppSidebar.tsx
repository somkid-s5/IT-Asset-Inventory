'use client';

import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { HelpCircle, LayoutDashboard, Lock, MessageSquare, Search, Server, Shield, Settings } from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'Credentials', url: '/dashboard/vault', icon: Lock },
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
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-sidebar-border/80 bg-sidebar/75 px-4 py-5 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-2 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Asset Ops</p>
          <h1 className="text-base font-semibold tracking-tight text-foreground">InfraPilot</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-sidebar-border/70 bg-card/70 px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Search</span>
          <span className="rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Ctrl K
          </span>
        </div>
      </div>

      <nav className="mt-5 flex-1 space-y-1.5">
        {navItems.map((item) => {
          const active =
            item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

          return (
            <NavLink
              key={item.url}
              href={item.url}
              end={item.url === '/dashboard'}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors',
                'hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground',
              )}
              activeClassName="bg-card text-foreground shadow-sm"
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl bg-background/70 text-sidebar-foreground',
                  active && 'bg-primary/10 text-primary',
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span className="font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/70 pt-4">
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <NavLink
              key={item.url}
              href={item.url}
              end
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
              activeClassName="bg-card text-foreground shadow-sm"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
