'use client';

import { useState, type ReactNode } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';
import { BrandMark } from '@/components/BrandMark';
import { UserAvatar } from '@/components/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeaderProvider, usePageHeader } from '@/contexts/PageHeaderContext';
import { cn } from '@/lib/utils';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <PageHeaderProvider>
      <AppLayoutFrame>{children}</AppLayoutFrame>
    </PageHeaderProvider>
  );
}

function AppLayoutFrame({ children }: AppLayoutProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { header } = usePageHeader();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    // Lazy initialization: อ่าน localStorage แค่ครั้งเดียวตอน component mount
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem('assetops.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('assetops.sidebar.collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="app-backdrop min-h-screen">
      <div className="flex min-h-screen w-full">
        <AppSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />

        <div className="content-bridge relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 h-[76px] border-b border-border bg-card px-4 sm:px-5 lg:px-7 shadow-sm shadow-black/[0.03]">
            <div className="app-shell flex h-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <BrandMark compact />
                </div>
                {header ? (
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">{header.title}</div>
                    <div className="mt-0.5">
                      <AppBreadcrumbs items={header.breadcrumbs} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={cn('flex items-center gap-2')}>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={`เปลี่ยนเป็นโหมด${theme === 'dark' ? 'สว่าง' : 'มืด'}`}
                  className="rounded-xl border border-border/80 bg-card p-2.5 text-muted-foreground shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] transition-all hover:border-primary/25 hover:bg-accent hover:text-foreground"
                  title="เปลี่ยนโหมดสี"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card px-2.5 py-1.5 text-left shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] transition-all hover:border-primary/25 hover:bg-accent/50">
                      <UserAvatar
                        seed={user?.avatarSeed}
                        imageUrl={user?.avatarImage}
                        label={user?.displayName ?? 'ผู้ดูแลระบบ'}
                        className="h-8 w-8 border-border/70"
                      />
                      <div className="hidden min-w-0 sm:block">
                        <div className="truncate text-[12px] font-semibold leading-4 text-foreground">{user?.displayName ?? 'ผู้ใช้งาน'}</div>
                        <div className="truncate pt-0.5 text-[11px] leading-4 text-muted-foreground">@{user?.username ?? 'user'}</div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/80 bg-popover">
                    <DropdownMenuLabel className="space-y-1">
                      <div className="text-sm font-medium text-foreground">{user?.displayName ?? 'ผู้ใช้งาน'}</div>
                      <div className="text-[11px] text-muted-foreground">@{user?.username ?? 'user'} - {user?.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป'}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
                      บัญชีของฉัน
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main id="main-content" className="relative flex-1 px-4 pb-8 pt-4 sm:px-5 lg:px-7" tabIndex={-1}>
            <div className="app-shell">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
