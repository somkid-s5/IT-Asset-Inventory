'use client';

import { useEffect, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { ChevronDown, Database, LayoutDashboard, Monitor, PanelLeft, Server, Users, Workflow, HelpCircle, MessageSquare, Settings } from 'lucide-react';

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
};

const primaryNavItems: NavItem[] = [
  { title: 'ภาพรวมระบบ', url: '/dashboard', icon: LayoutDashboard },
  { title: 'รายการสินทรัพย์', url: '/dashboard/assets', icon: Server },
  { title: 'ฐานข้อมูล', url: '/dashboard/db', icon: Database },
];

const computeNavItems: NavItem[] = [
  { title: 'เครื่องเสมือน (VM)', url: '/dashboard/vm', icon: Monitor },
  { title: 'แหล่งข้อมูล vCenter', url: '/dashboard/vm/sources', icon: Workflow },
];

const secondaryNavItems: NavItem[] = [
  { title: 'ตั้งค่า', url: '/dashboard/settings', icon: Settings },
  { title: 'ความช่วยเหลือ', url: '/dashboard/help', icon: HelpCircle },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname || '/';
  const adminNavItems = user?.role === 'ADMIN' ? [{ title: 'ผู้ใช้งานระบบ', url: '/dashboard/users', icon: Users }] : [];
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
          'group flex rounded-xl border border-transparent text-sm transition-all duration-200',
          'hover:bg-sidebar-accent/50',
          active ? 'active-nav-item' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
          collapsed ? 'justify-center px-2 py-2' : 'items-center gap-3 px-3 py-2.5',
          child && !collapsed && 'ml-4 px-2',
        )}
      >
        <item.icon className={cn(
          "h-4.5 w-4.5 transition-colors",
          active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
        )} />
        {!collapsed ? (
          <div className="min-w-0">
            <span className={cn("block truncate transition-all", active ? "font-semibold" : "font-medium opacity-80")}>
              {item.title}
            </span>
          </div>
        ) : null}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        'sidebar-gradient hidden min-h-screen shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-in-out lg:flex lg:flex-col',
        collapsed ? 'w-[80px]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex h-18 items-center border-b border-sidebar-border/50 px-4', collapsed && 'justify-center')}>
        <div className="flex w-full items-center justify-between">
          <BrandMark compact={collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto py-6 px-3" role="navigation">
        <div>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              Main Menu
            </p>
          )}
          <div className="space-y-1">
            {primaryNavItems.map((item) => renderNavItem(item))}
          </div>
        </div>

        <div>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              Infrastructure
            </p>
          )}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setComputeOpen((current) => !current)}
              className={cn(
                'group flex w-full rounded-xl border border-transparent text-sm transition-all duration-200',
                'hover:bg-sidebar-accent/50',
                inComputeSection ? 'bg-primary/5 text-primary' : 'text-sidebar-foreground/70',
                collapsed ? 'justify-center px-2 py-2' : 'items-center gap-3 px-3 py-2.5',
              )}
            >
              <Monitor className={cn("h-4.5 w-4.5", inComputeSection ? "text-primary" : "text-sidebar-foreground/50")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-medium opacity-80">ระบบประมวลผล</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', computeOpen && 'rotate-180')} />
                </>
              )}
            </button>

            {computeOpen && (
              <div className="mt-1 space-y-1 animate-slide-in">
                {computeNavItems.map((item) => renderNavItem(item, true))}
              </div>
            )}
          </div>
        </div>

        {(adminNavItems.length > 0 || secondaryNavItems.length > 0) && (
          <div>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                System
              </p>
            )}
            <div className="space-y-1">
              {adminNavItems.map((item) => renderNavItem(item))}
              {secondaryNavItems.map((item) => renderNavItem(item))}
            </div>
          </div>
        )}
      </nav>

      {collapsed && (
        <div className="flex justify-center p-4 border-t border-sidebar-border/50">
           <button
              type="button"
              onClick={onToggleCollapsed}
              className="rounded-lg p-2 text-muted-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <PanelLeft className="h-5 w-5 rotate-180" />
            </button>
        </div>
      )}
    </aside>
  );
}
