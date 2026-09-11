"use client";

import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getInventoryPageCount,
  getInventoryPaginationSummary,
} from "@/lib/inventory-presentation";

export type InventoryQueryState =
  | "loading"
  | "refreshing"
  | "error"
  | "forbidden"
  | "not-found"
  | "empty"
  | "filtered-empty"
  | "ready";

export interface InventoryTableShellProps {
  title: string;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  toolbar?: ReactNode;
  state?: InventoryQueryState;
  onRetry?: () => void;
  hasStaleData?: boolean;
  emptyState?: ReactNode;
  filteredEmptyState?: ReactNode;
  pagination?: ReactNode;
  children: ReactNode;
  className?: string;
}

const DEFAULT_STATE_COPY: Record<Exclude<InventoryQueryState, "ready" | "refreshing" | "loading">, { title: string; description: string }> = {
  error: {
    title: "Inventory unavailable",
    description: "The inventory request failed. Retry to load the records again.",
  },
  forbidden: {
    title: "Access denied",
    description: "You do not have permission to view this inventory.",
  },
  "not-found": {
    title: "Record not found",
    description: "The requested inventory record is no longer available.",
  },
  empty: {
    title: "No records yet",
    description: "There are no inventory records to display.",
  },
  "filtered-empty": {
    title: "No matching records",
    description: "No inventory records match the current search or filters.",
  },
};

function DefaultState({
  state,
  onRetry,
}: {
  state: Exclude<InventoryQueryState, "ready" | "refreshing" | "loading">;
  onRetry?: () => void;
}) {
  const copy = DEFAULT_STATE_COPY[state];

  return (
    <div
      className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-10 text-center"
      data-slot="inventory-query-state"
      data-query-state={state}
      role={state === "error" ? "alert" : undefined}
    >
      <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{copy.description}</p>
      {state === "error" && onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw />
          Retry
        </Button>
      )}
    </div>
  );
}

function CustomState({
  state,
  children,
}: {
  state: "empty" | "filtered-empty";
  children: ReactNode;
}) {
  return (
    <div data-slot="inventory-query-state" data-query-state={state}>
      {children}
    </div>
  );
}

export interface InventoryQueryStateViewProps {
  state?: InventoryQueryState;
  onRetry?: () => void;
  hasStaleData?: boolean;
  emptyState?: ReactNode;
  filteredEmptyState?: ReactNode;
  loadingLabel?: string;
  children?: ReactNode;
}

export function InventoryQueryStateView({
  state = "ready",
  onRetry,
  hasStaleData = false,
  emptyState,
  filteredEmptyState,
  loadingLabel = "Loading inventory…",
  children,
}: InventoryQueryStateViewProps) {
  if (state === "loading") {
    return (
      <div
        className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/10 px-4 py-10 text-sm text-muted-foreground"
        data-slot="inventory-query-state"
        data-query-state="loading"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle className="animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (state === "error" && hasStaleData) {
    return (
      <div className="space-y-3">
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          data-slot="inventory-query-state"
          data-query-state="error"
          data-stale="true"
          role="alert"
        >
          <div>
            <p className="font-semibold text-foreground">Refresh failed</p>
            <p className="text-muted-foreground">Showing previously loaded data. The latest refresh was not confirmed.</p>
          </div>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw />
              Retry
            </Button>
          )}
        </div>
        {children}
      </div>
    );
  }

  if (state === "refreshing") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          <LoaderCircle className="animate-spin" />
          Refreshing inventory…
        </div>
        {children}
      </div>
    );
  }

  if (state === "error" || state === "forbidden" || state === "not-found") {
    return <DefaultState state={state} onRetry={onRetry} />;
  }

  if (state === "empty") {
    return (
      <CustomState state="empty">
        {emptyState ?? <DefaultState state="empty" />}
      </CustomState>
    );
  }
  if (state === "filtered-empty") {
    return (
      <CustomState state="filtered-empty">
        {filteredEmptyState ?? <DefaultState state="filtered-empty" />}
      </CustomState>
    );
  }
  return <>{children}</>;
}

export function InventoryTableToolbar({
  search,
  filters,
  actions,
  activeFilters,
  onResetFilters,
  className,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilters?: ReactNode;
  onResetFilters?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} data-slot="inventory-toolbar">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {search}
          {filters}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {activeFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs" data-slot="inventory-active-filters">
          <span className="font-medium text-muted-foreground">Filters:</span>
          {activeFilters}
          {onResetFilters && (
            <Button type="button" variant="ghost" size="xs" onClick={onResetFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function InventoryPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}) {
  const pageCount = getInventoryPageCount(total, pageSize);
  const displayPageCount = Math.max(1, pageCount);
  const currentPage = Math.min(Math.max(1, page), displayPageCount);
  const pageSizeId = useId();

  return (
    <nav
      className={cn(
        "flex flex-col gap-3 border-t border-border/60 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      aria-label="Inventory pagination"
      data-slot="inventory-pagination"
    >
      <span className="text-muted-foreground" aria-live="polite">
        {getInventoryPaginationSummary({ page: currentPage, pageSize, total })}
      </span>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor={pageSizeId} className="text-xs text-muted-foreground">
              Rows per page
            </label>
            <select
              id={pageSizeId}
              aria-label="Rows per page"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            >
              {Array.from(new Set([...pageSizeOptions, pageSize])).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          Page {currentPage} of {displayPageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={pageCount === 0 || currentPage >= pageCount}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}

export function InventoryTableShell({
  title,
  description,
  primaryAction,
  secondaryActions,
  toolbar,
  state = "ready",
  onRetry,
  hasStaleData,
  emptyState,
  filteredEmptyState,
  pagination,
  children,
  className,
}: InventoryTableShellProps) {
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-inventory-heading`;

  const content = (
    <InventoryQueryStateView
      state={state}
      onRetry={onRetry}
      hasStaleData={hasStaleData}
      emptyState={emptyState}
      filteredEmptyState={filteredEmptyState}
    >
      {children}
    </InventoryQueryStateView>
  );
  const showPagination =
    state === "ready" ||
    state === "refreshing" ||
    (state === "error" && hasStaleData === true);

  return (
    <section
      className={cn("space-y-4", className)}
      aria-labelledby={titleId}
      data-slot="inventory-table-shell"
      data-query-state={state}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 id={titleId} className="text-lg font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {(primaryAction || secondaryActions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </header>
      {toolbar}
      <div data-slot="inventory-table-content">{content}</div>
      {showPagination ? pagination : null}
    </section>
  );
}
