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
        'sidebar-blend hidden min-h-screen shrink-0 border-r border-sidebar-border/60 bg-sidebar/72 backdrop-blur-xl transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[88px]' : 'w-64',
      )}
    >
      <div className={cn('flex min-h-[73px] items-center border-b border-sidebar-border/60', collapsed ? 'justify-center px-2' : 'px-4')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[1rem] border border-primary/25 bg-[linear-gradient(180deg,hsl(var(--primary))_0%,color-mix(in_oklab,hsl(var(--primary))_55%,black_45%)_100%)] text-primary-foreground shadow-[0_16px_40px_-18px_color-mix(in_oklab,hsl(var(--primary))_60%,transparent)]">
            <div className="absolute inset-[1px] rounded-[0.95rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_55%)]" />
            <Shield className="relative h-[16px] w-[16px]" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-display text-base font-semibold uppercase tracking-[0.18em] text-foreground">AssetOps</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className={cn('flex-1 py-4', collapsed ? 'px-2' : 'px-3')}>
        <div className={cn('mb-3', collapsed ? 'px-0 text-center' : 'px-2')}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {collapsed ? 'Nav' : 'Workspace'}
          </p>
        </div>
        <div className="space-y-1.5">
          {visibleNavItems.map((item) => {
            const active =
              item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

            return (
              <NavLink
                key={item.url}
                href={item.url}
                end={item.url === '/dashboard'}
                title={item.title}
                className={cn(
                  'group flex rounded-[14px] border border-transparent text-[12px] text-sidebar-foreground transition-all duration-200',
                  'hover:border-primary/10 hover:bg-sidebar-accent/78 hover:text-sidebar-accent-foreground',
                  collapsed ? 'justify-center px-2 py-2.5' : 'items-center gap-3 px-3 py-2.5',
                )}
                activeClassName="border-primary/15 bg-sidebar-accent/86 text-sidebar-accent-foreground shadow-[0_14px_36px_-24px_color-mix(in_oklab,hsl(var(--primary))_38%,transparent)]"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground transition-all',
                    active && 'border-primary/20 bg-primary text-primary-foreground shadow-[0_16px_34px_-22px_color-mix(in_oklab,hsl(var(--primary))_80%,transparent)]',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
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
