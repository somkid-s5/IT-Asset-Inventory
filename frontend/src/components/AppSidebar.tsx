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
        'sidebar-blend hidden min-h-screen shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[84px]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex min-h-[72px] items-center border-b border-border', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-primary/30 bg-primary text-primary-foreground shadow-sm"
            aria-label="AssetOps logo">
            <div className="absolute inset-[1px] rounded-md bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_55%)]" />
            <Shield className="relative h-4 w-4" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-sans text-base font-semibold text-foreground">AssetOps</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className={cn('flex-1 py-4', collapsed ? 'px-2' : 'px-3')} role="navigation" aria-label="Main navigation menu">
        <div className={cn('mb-3 px-2')}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                  'group flex rounded-lg border border-transparent text-sm text-sidebar-foreground transition-all duration-200',
                  'hover:border-primary/20 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed ? 'justify-center px-2 py-2' : 'items-center gap-3 px-3 py-2',
                )}
                activeClassName="border-primary/30 bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-all',
                    active && 'border-primary/30 bg-primary text-primary-foreground shadow-sm',
                  )}
                  aria-hidden="true"
                >
                  <item.icon className="h-4 w-4" />
                </div>
                {!collapsed ? <span>{item.title}</span> : null}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
