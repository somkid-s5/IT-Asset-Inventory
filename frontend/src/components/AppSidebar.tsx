'use client';

import { useEffect, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ChevronDown, Database, LayoutDashboard, Monitor, PanelLeft, Server, Shield, Users, Workflow } from 'lucide-react';

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
};

const primaryNavItems: NavItem[] = [
  { title: 'Overview', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'Databases', url: '/dashboard/db', icon: Database },
];

const computeNavItems: NavItem[] = [
  { title: 'Virtual Machines', url: '/dashboard/vm', icon: Monitor },
  { title: 'vCenter Sources', url: '/dashboard/vm/sources', icon: Workflow },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname || '/';
  const accountNavItems = user?.role === 'ADMIN' ? [{ title: 'User Accounts', url: '/dashboard/users', icon: Users }] : [];
  const inComputeSection = currentPath === '/dashboard/vm' || currentPath.startsWith('/dashboard/vm/');
  const [computeOpen, setComputeOpen] = useState(inComputeSection);

  useEffect(() => {
    if (inComputeSection) {
      setComputeOpen(true);
    }
  }, [inComputeSection]);

  const renderNavItem = (item: NavItem, child = false) => {
    const active =
      item.url === '/dashboard'
        ? currentPath === '/dashboard'
        : item.url === '/dashboard/vm'
          ? currentPath === '/dashboard/vm' || (currentPath.startsWith('/dashboard/vm/') && !currentPath.startsWith('/dashboard/vm/sources'))
          : currentPath.startsWith(item.url);

    return (
      <NavLink
        key={item.url}
        href={item.url}
        end={item.url === '/dashboard'}
        active={active}
        title={item.title}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex rounded-xl border border-transparent text-sm text-sidebar-foreground transition-all duration-200',
          'hover:border-primary/15 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed ? 'justify-center px-2 py-2' : 'items-center gap-2.5 px-2.5 py-2',
          child && !collapsed && 'ml-3 px-2',
        )}
        activeClassName="border-primary/15 bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,hsl(var(--primary))_15%,transparent)]"
      >
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-all',
            active && 'border-primary/10 bg-primary text-primary-foreground shadow-[0_16px_30px_-26px_color-mix(in_oklab,hsl(var(--primary))_85%,transparent)]',
          )}
          aria-hidden="true"
        >
          <item.icon className="h-3.5 w-3.5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <span className="block truncate text-[13px] font-medium">{item.title}</span>
          </div>
        ) : null}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        'sidebar-blend hidden min-h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[118px]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex h-[76px] items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'px-4')}>
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand sidebar"
            className="rounded-xl border border-border/80 bg-card p-2 text-muted-foreground shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] transition-all hover:border-primary/25 hover:bg-accent hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </button>
        ) : (
          <div className="flex w-full items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_35px_-24px_color-mix(in_oklab,hsl(var(--primary))_85%,transparent)]"
                aria-label="AssetOps logo">
                <div className="absolute inset-[1px] rounded-md bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_55%)]" />
                <Shield className="relative h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-[15px] font-semibold tracking-[-0.03em] text-foreground">AssetOps</p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Inventory Control</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              className="rounded-xl border border-border/80 bg-card p-2 text-muted-foreground shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] transition-all hover:border-primary/25 hover:bg-accent hover:text-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <nav className={cn('flex-1 py-5', collapsed ? 'px-2' : 'px-3.5')} role="navigation" aria-label="Main navigation menu">
        <div className={cn('mb-3 px-2')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
        </div>
        <div className="space-y-1.5" role="menubar">
          {primaryNavItems.map((item) => renderNavItem(item))}
        </div>

        <div className={cn(collapsed ? 'mt-2' : 'mt-4')} role="group" aria-label="Compute navigation">
          <button
            type="button"
            onClick={() => setComputeOpen((current) => !current)}
            className={cn(
              'group flex w-full rounded-xl border border-transparent text-sm text-sidebar-foreground transition-all duration-200',
              'hover:border-primary/15 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'justify-center px-2 py-2' : 'items-center gap-2.5 px-2.5 py-2',
              inComputeSection && 'border-primary/15 bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,hsl(var(--primary))_15%,transparent)]',
            )}
            aria-expanded={computeOpen}
            aria-controls="compute-nav-items"
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground transition-all',
                inComputeSection && 'border-primary/10 bg-primary text-primary-foreground shadow-[0_16px_30px_-26px_color-mix(in_oklab,hsl(var(--primary))_85%,transparent)]',
              )}
              aria-hidden="true"
            >
              <Monitor className="h-3.5 w-3.5" />
            </div>
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">Compute</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', computeOpen && 'rotate-180')} />
              </>
            ) : null}
          </button>

          <div
            id="compute-nav-items"
            className={cn('space-y-1.5 overflow-hidden transition-all duration-200', computeOpen ? 'mt-1.5 max-h-40 opacity-100' : 'mt-0 max-h-0 opacity-0')}
            role="menubar"
          >
            {computeNavItems.map((item) => renderNavItem(item, true))}
          </div>
        </div>

        {accountNavItems.length > 0 ? (
          <div className={cn('space-y-1.5', collapsed ? 'mt-2' : 'mt-4')} role="menubar">
            {accountNavItems.map((item) => renderNavItem(item))}
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
