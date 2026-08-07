'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
            {item.href && !isLast ? (
              <Link href={item.href} className="truncate transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'truncate font-medium text-foreground' : 'truncate'}>{item.label}</span>
            )}
            {!isLast ? <span aria-hidden="true" className="text-border">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
