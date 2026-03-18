'use client';

import { BrandMark } from '@/components/BrandMark';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Database, LayoutDashboard, Monitor, Server, Users } from 'lucide-react';

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
    <aside className="sidebar-blend hidden min-h-screen w-64 shrink-0 border-r border-sidebar-border/60 bg-sidebar/72 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="border-b border-sidebar-border/60 px-4 py-4">
        <BrandMark compact />
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="mb-3 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
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
                className={cn(
                  'group flex items-center gap-3 rounded-[14px] border border-transparent px-3 py-2.5 text-[12px] text-sidebar-foreground transition-all duration-200',
                  'hover:border-primary/10 hover:bg-sidebar-accent/78 hover:text-sidebar-accent-foreground',
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
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
