'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderState {
  title: string;
  breadcrumbs: PageHeaderBreadcrumb[];
}

interface PageHeaderContextValue {
  header: PageHeaderState | null;
  setHeader: (header: PageHeaderState | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [storedHeader, setStoredHeader] = useState<{
    pathname: string;
    header: PageHeaderState;
  } | null>(null);

  const setHeader = useCallback((nextHeader: PageHeaderState | null) => {
    setStoredHeader((current) => {
      if (!nextHeader) {
        return current?.pathname === pathname ? null : current;
      }

      return { pathname, header: nextHeader };
    });
  }, [pathname]);

  const header = storedHeader?.pathname === pathname ? storedHeader.header : null;

  const value = useMemo(() => ({ header, setHeader }), [header, setHeader]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);

  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }

  return context;
}
