'use client';

import { useState, type ReactNode } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { BrandMark } from '@/components/BrandMark';
import { UserAvatar } from '@/components/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, MonitorCog, Moon, PanelLeft, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem('assetops.sidebar.collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('assetops.sidebar.collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen">
      <div className="flex min-h-screen w-full">
        <AppSidebar collapsed={sidebarCollapsed} />

        <div className="content-bridge relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/50 bg-background/38 px-4 py-3 backdrop-blur-2xl sm:px-5 lg:px-6">
            <div className="app-shell flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden rounded-2xl border border-border/70 bg-card/70 p-2.5 text-muted-foreground shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:border-primary/20 hover:text-foreground lg:inline-flex"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
                <div className="lg:hidden">
                  <BrandMark compact />
                </div>
                <div className="hidden rounded-full border border-border/70 bg-card/65 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur xl:inline-flex xl:items-center xl:gap-2">
                  <MonitorCog className="h-3.5 w-3.5 text-primary" />
                  Operational inventory workspace
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-2xl border border-border/70 bg-card/70 p-2.5 text-muted-foreground shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:border-primary/20 hover:text-foreground"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/72 px-2.5 py-1.5 text-left shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:border-primary/20 hover:bg-accent/40">
                      <UserAvatar
                        seed={user?.avatarSeed}
                        imageUrl={user?.avatarImage}
                        label={user?.displayName ?? 'Infra Pilot'}
                        className="h-8 w-8 border-border/70"
                      />
                      <div className="hidden min-w-0 sm:block">
                        <div className="truncate text-[12px] font-semibold leading-4 text-foreground">{user?.displayName ?? 'Account'}</div>
                        <div className="truncate pt-0.5 text-[11px] leading-4 text-muted-foreground">@{user?.username ?? 'user'}</div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-border/70 bg-popover/95 backdrop-blur-2xl">
                      <DropdownMenuLabel className="space-y-1">
                      <div className="text-sm font-medium text-foreground">{user?.displayName ?? 'Account'}</div>
                      <div className="text-[11px] text-muted-foreground">@{user?.username ?? 'user'} - {user?.role ?? 'USER'}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} className="cursor-pointer">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="relative flex-1 px-4 pb-6 pt-4 sm:px-5 lg:px-6">
            <div className="app-shell">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

