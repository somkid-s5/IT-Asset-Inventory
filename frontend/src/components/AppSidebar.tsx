'use client';

import { useEffect, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { 
  ChevronDown, Database, LayoutDashboard, Monitor, 
  PanelLeft, Server, Users, Workflow, Settings, 
  HelpCircle, ChevronLeft, Activity
} from 'lucide-react';

type NavItem = {
  title: string;
  url: string;
  icon: any;
};

const primaryNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'Databases', url: '/dashboard/databases', icon: Database },
];

const computeNavItems: NavItem[] = [
  { title: 'Virtual Machines', url: '/dashboard/virtual-machines', icon: Monitor },
  { title: 'vCenter Sources', url: '/dashboard/virtual-machines/sources', icon: Workflow },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentPath = pathname || '/';
  const inComputeSection = currentPath === '/dashboard/virtual-machines' || currentPath.startsWith('/dashboard/virtual-machines/');
  const [computeOpen, setComputeOpen] = useState(inComputeSection);

  useEffect(() => {
    if (inComputeSection) setComputeOpen(true);
  }, [inComputeSection]);

  const renderNavItem = (item: NavItem, isChild = false) => {
    const active = item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

    return (
      <NavLink
        key={item.url}
        href={item.url}
        end={item.url === '/dashboard'}
        active={active}
        title={item.title}
        className={cn(
          'group flex items-center rounded-xl transition-all duration-200 py-2.5',
          collapsed ? 'justify-center px-2' : 'gap-3 px-3.5',
          active ? 'active-nav-item' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
          isChild && !collapsed && 'ml-4',
        )}
      >
        <item.icon className={cn("shrink-0 h-5 w-5", active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70")} />
        {!collapsed && <span className="truncate text-sm font-medium">{item.title}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        'sidebar-gradient relative hidden min-h-screen shrink-0 border-r border-sidebar-border transition-all duration-300 ease-in-out lg:flex lg:flex-col',
        collapsed ? 'w-20' : 'w-72',
      )}
    >
      <div className={cn('flex h-20 items-center px-6 border-b border-sidebar-border/30', collapsed && 'justify-center px-0')}>
        <BrandMark compact={collapsed} />
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto py-8 px-3.5 custom-scrollbar">
        {/* Main Section */}
        <div className="space-y-1.5">
          {!collapsed && <p className="mb-3 px-3.5 text-[11px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/30">Main</p>}
          {primaryNavItems.map(item => renderNavItem(item))}
        </div>

        {/* Infrastructure Section */}
        <div className="space-y-1.5">
          {!collapsed && (
            <>
              <p className="mb-3 px-3.5 text-[11px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/30">Infrastructure</p>
              <button
                onClick={() => setComputeOpen(!computeOpen)}
                className={cn(
                  'group flex w-full items-center rounded-xl py-2.5 transition-all gap-3 px-3.5',
                  inComputeSection ? 'text-primary bg-primary/5' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50',
                )}
              >
                <Monitor className={cn("h-5 w-5 shrink-0", inComputeSection ? "text-primary" : "text-sidebar-foreground/40")} />
                <span className="flex-1 text-left text-sm font-medium text-foreground/80">Compute</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', computeOpen && 'rotate-180')} />
              </button>
            </>
          )}
          
          {/* เมื่อย่อ Sidebar ให้แสดงเมนูย่อยออกมาเลย ไม่ต้องมีปุ่ม Toggle */}
          {(computeOpen || collapsed) && (
            <div className={cn("space-y-1 mt-1", !collapsed && "animate-slide-in")}>
              {computeNavItems.map(item => renderNavItem(item, true))}
            </div>
          )}
        </div>

        {user?.role === 'ADMIN' && (
          <div className="space-y-1.5 pt-4">
             {!collapsed && <p className="mb-3 px-3.5 text-[11px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/30">Admin</p>}
             {renderNavItem({ title: 'Users', url: '/dashboard/users', icon: Users })}
             {renderNavItem({ title: 'Audit Logs', url: '/dashboard/audit-logs', icon: Activity })}
          </div>
        )}
      </nav>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapsed}
        className="absolute -right-3 top-24 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-card shadow-md transition-transform hover:scale-110 active:scale-95"
      >
        <ChevronLeft className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-500", collapsed && "rotate-180")} />
      </button>

      <div className="p-4 border-t border-sidebar-border/30 bg-sidebar-background/50 backdrop-blur-md">
         {renderNavItem({ title: 'Settings', url: '/dashboard/settings', icon: Settings })}
      </div>
    </aside>
  );
}
