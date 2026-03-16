'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { UserAvatar } from '@/components/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/88 px-4 py-2.5 backdrop-blur sm:px-5 lg:px-6">
            <div className="app-shell flex items-center justify-end gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-2.5 py-1.5 text-left shadow-sm transition-colors hover:border-foreground/20 hover:bg-accent/50">
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
                    <DropdownMenuContent align="end" className="w-56 border-border bg-popover">
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
          </header>

          <main className="flex-1 px-4 pb-6 pt-4 sm:px-5 lg:px-6">
            <div className="app-shell">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

