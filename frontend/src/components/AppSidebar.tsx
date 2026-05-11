'use client';

import { NavLink } from '@/components/NavLink';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { 
  Database, LayoutDashboard, Monitor, 
  Server, Users, Workflow, ChevronLeft, Activity,
  Ticket, BookOpen, ChevronDown
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

const operationsNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Tickets', url: '/dashboard/tickets', icon: Ticket },
  { title: 'Knowledge Base', url: '/dashboard/docs', icon: BookOpen },
];

const inventoryNavItems: NavItem[] = [
  { title: 'Assets', url: '/dashboard/assets', icon: Server },
  { title: 'Virtual Machines', url: '/dashboard/virtual-machines', icon: Monitor },
  { title: 'Databases', url: '/dashboard/databases', icon: Database },
];

const systemNavItems: NavItem[] = [
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Operations: true,
    Inventory: true,
    System: true,
  });

  const toggleSection = (section: string) => {
    if (collapsed) {
      onToggleCollapsed();
      setExpandedSections(prev => ({ ...prev, [section]: true }));
      return;
    }
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const active = item.url === '/dashboard' ? currentPath === '/dashboard' : currentPath.startsWith(item.url);

    return (
      <NavLink
        key={item.url}
        href={item.url}
        end={item.url === '/dashboard'}
        active={active}
        title={item.title}
        onClick={(e) => {
          if (collapsed) {
            // If collapsed, clicking any item expands the sidebar
            onToggleCollapsed();
          } else if (active) {
            // If already active and expanded, clicking it again collapses the sidebar
            e.preventDefault();
            onToggleCollapsed();
          }
        }}
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

  const renderSection = (title: string, items: NavItem[], extraItems?: React.ReactNode) => {
    const isExpanded = expandedSections[title];

    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleSection(title)}
          className={cn(
            "flex w-full items-center justify-between px-3.5 py-2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {!collapsed ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]">{title}</p>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-300", !isExpanded && "-rotate-90")} />
            </>
          ) : (
            <div className="h-px w-8 bg-sidebar-border/30" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {(isExpanded || collapsed) && (
            <motion.div
              initial={collapsed ? { opacity: 1 } : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-1.5 overflow-hidden"
            >
              {items.map(item => renderNavItem(item))}
              {extraItems}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'sidebar-gradient fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col border-r border-sidebar-border transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:flex',
        collapsed ? '-translate-x-full lg:w-20 lg:translate-x-0' : 'w-72 translate-x-0',
      )}
    >
      <div 
        onClick={onToggleCollapsed}
        className={cn(
          'flex h-[84px] cursor-pointer items-center px-6 border-b border-sidebar-border/30 transition-colors hover:bg-sidebar-accent/30', 
          collapsed && 'justify-center px-0'
        )}
      >
        <BrandMark compact={collapsed} />
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto py-8 px-3.5 custom-scrollbar">
        {renderSection('Operations', operationsNavItems)}
        {renderSection('Inventory', inventoryNavItems)}
        {renderSection('System', systemNavItems, user?.role === 'ADMIN' && (
          <>
            {renderNavItem({ title: 'Users', url: '/dashboard/users', icon: Users })}
            {renderNavItem({ title: 'Audit Logs', url: '/dashboard/audit-logs', icon: Activity })}
          </>
        ))}
      </nav>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapsed}
        className={cn(
          "absolute -right-[18px] top-24 z-50 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-primary/20 bg-card shadow-xl transition-all duration-300 hover:border-primary/50 hover:bg-accent hover:scale-110 active:scale-95",
          collapsed && "rounded-full"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft className={cn("h-5 w-5 text-primary transition-transform duration-500", collapsed && "rotate-180")} />
      </button>

      <div className="p-4 border-t border-sidebar-border/30 bg-sidebar-background/50 backdrop-blur-md">
      </div>
    </aside>
  );
}
