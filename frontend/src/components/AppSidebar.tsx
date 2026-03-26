'use client';

import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Database, LayoutDashboard, Monitor, Server, Shield, Users } from 'lucide-react';

const navItems = [
  { title: 'Overview', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'Virtual Machines', url: '/dashboard/vm', icon: Monitor },
  { title: 'Databases', url: '/dashboard/db', icon: Database },
];

interface AppSidebarProps {
  collapsed: boolean;
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname || '/';
  const visibleNavItems = user?.role === 'ADMIN' ? [...navItems, { title: 'User Accounts', url: '/dashboard/users', icon: Users }] : navItems;

  return (
    <aside
      className={cn(
        'sidebar-blend hidden min-h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[84px]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex min-h-[88px] items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'px-5')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_35px_-24px_color-mix(in_oklab,hsl(var(--primary))_85%,transparent)]"
            aria-label="AssetOps logo">
            <div className="absolute inset-[1px] rounded-md bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_55%)]" />
          <Shield className="relative h-4 w-4" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-sans text-base font-semibold tracking-[-0.03em] text-foreground">AssetOps</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Inventory Control</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className={cn('flex-1 py-5', collapsed ? 'px-2' : 'px-3.5')} role="navigation" aria-label="Main navigation menu">
        <div className={cn('mb-3 px-2')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {collapsed ? 'Nav' : 'Workspace'}
          </p>
        </div>
        <div className="space-y-1.5" role="menubar">
          {visibleNavItems.map((item) => {
            const active =
              item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

            return (
              <NavLink
                key={item.url}
                href={item.url}
                end={item.url === '/dashboard'}
                title={item.title}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex rounded-2xl border border-transparent text-sm text-sidebar-foreground transition-all duration-200',
                  'hover:border-primary/15 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed ? 'justify-center px-2 py-2.5' : 'items-center gap-3 px-3 py-2.5',
                )}
                activeClassName="border-primary/15 bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,hsl(var(--primary))_15%,transparent)]"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground transition-all',
                    active && 'border-primary/10 bg-primary text-primary-foreground shadow-[0_16px_30px_-26px_color-mix(in_oklab,hsl(var(--primary))_85%,transparent)]',
                  )}
                  aria-hidden="true"
                >
                  <item.icon className="h-4 w-4" />
                </div>
                {!collapsed ? (
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{item.title}</span>
                  </div>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
