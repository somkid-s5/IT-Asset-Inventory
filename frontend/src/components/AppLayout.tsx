import { useState, useEffect, type ReactNode } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';
import { BrandMark } from '@/components/BrandMark';
import { UserAvatar } from '@/components/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeaderProvider, usePageHeader } from '@/contexts/PageHeaderContext';
import { cn } from '@/lib/utils';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

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
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { header } = usePageHeader();
  const [isNavigating, setIsNavigating] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('assetops.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Handle fake progress bar on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('assetops.sidebar.collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="app-backdrop min-h-screen">
      {/* Navigation Progress Bar */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div 
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "100%", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 z-[60] h-1 bg-primary"
          />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen w-full">
        <AppSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />

        <div className="content-bridge relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 h-[84px] border-b border-border/60 bg-card/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 shadow-sm">
            <div className="app-shell flex h-full items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="lg:hidden">
                  <BrandMark compact />
                </div>
                
                <AnimatePresence mode="wait">
                  {header ? (
                    <motion.div 
                      key={header.title}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="min-w-0"
                    >
                      <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {header.title}
                      </h1>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background transition-all hover:border-primary/30 hover:bg-muted"
                  title="Toggle theme"
                >
                  <div className="relative h-5 w-5 transition-transform duration-500 group-hover:rotate-45">
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5 text-teal-300" />
                    ) : (
                      <Moon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>

                <div className="h-8 w-px bg-border/60" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="group flex items-center gap-3 rounded-xl border border-transparent p-1 px-2 transition-all hover:bg-muted/50">
                      <div className="relative">
                        <UserAvatar
                          seed={user?.avatarSeed}
                          imageUrl={user?.avatarImage}
                          label={user?.displayName ?? 'Admin'}
                          className="h-9 w-9 border-2 border-border/50 ring-0 transition-all group-hover:border-primary/40 group-hover:shadow-md"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                      </div>
                      <div className="hidden min-w-0 text-left sm:block">
                        <div className="truncate text-sm font-bold leading-none text-foreground">{user?.displayName ?? 'User'}</div>
                        <div className="mt-1 truncate text-[11px] font-medium leading-none text-muted-foreground/70 uppercase tracking-wider">
                          {user?.role ?? 'Role'}
                        </div>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border/80 p-2 shadow-2xl">
                    <DropdownMenuLabel className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-foreground">{user?.displayName}</span>
                        <span className="text-xs text-muted-foreground">@{user?.username}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="opacity-50" />
                    <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="rounded-lg py-2.5 cursor-pointer">
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="opacity-50" />
                    <DropdownMenuItem onClick={logout} className="rounded-lg py-2.5 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main id="main-content" className="relative flex-1 px-4 pb-8 pt-4 sm:px-5 lg:px-7" tabIndex={-1}>
            <div className="app-shell">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
