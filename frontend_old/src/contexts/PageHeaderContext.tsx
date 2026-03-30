'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
  const [header, setHeader] = useState<PageHeaderState | null>(null);

  const value = useMemo(() => ({ header, setHeader }), [header]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);

  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }

  return context;
}
