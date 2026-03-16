'use client';

import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Database, LayoutDashboard, Monitor, Server, Shield, Users } from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'VM', url: '/dashboard/vm', icon: Monitor },
  { title: 'DB', url: '/dashboard/db', icon: Database },
];

export function AppSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname || '/';
  const visibleNavItems = user?.role === 'ADMIN' ? [...navItems, { title: 'Users', url: '/dashboard/users', icon: Users }] : navItems;

  return (
    <aside className="hidden min-h-screen w-56 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="border-b border-sidebar-border px-3.5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background dark:bg-foreground dark:text-background">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Operations Workspace</p>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">AssetOps</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3">
        <div className="space-y-1">
          {visibleNavItems.map((item) => {
            const active =
              item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

            return (
              <NavLink
                key={item.url}
                href={item.url}
                end={item.url === '/dashboard'}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] text-sidebar-foreground transition-colors',
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
    </aside>
  );
}
