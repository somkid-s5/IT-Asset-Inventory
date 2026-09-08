import type { UseQueryResult } from "@tanstack/react-query";

import type { InventoryQueryState } from "@/components/inventory/InventoryTableShell";

export type InventoryQueryErrorKind = "forbidden" | "not-found" | "error";

export interface InventoryQueryStateOptions {
  /** Whether the query has a usable response, even when that response is empty. */
  hasData: boolean;
  /** Whether the current request includes a search/filter/page constraint. */
  isFiltered?: boolean;
  /** Whether the rendered result contains at least one record. */
  hasRecords?: boolean;
}

export interface InventoryQueryStateResult {
  state: InventoryQueryState;
  errorKind?: InventoryQueryErrorKind;
  hasStaleData: boolean;
}

export function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }

  const response = (error as { response?: unknown }).response;
  if (typeof response !== "object" || response === null || !("status" in response)) {
    return undefined;
  }

  const status = (response as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export function getInventoryQueryErrorKind(error: unknown): InventoryQueryErrorKind {
  const status = getHttpStatus(error);
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  return "error";
}

export function getInventoryQueryState(
  query: Pick<UseQueryResult<unknown>, "data" | "error" | "isError" | "isFetching" | "isPending">,
  { hasData, isFiltered = false, hasRecords = hasData }: InventoryQueryStateOptions,
): InventoryQueryStateResult {
  if (query.isError) {
    const errorKind = getInventoryQueryErrorKind(query.error);
    return {
      state:
        errorKind === "forbidden"
          ? "forbidden"
          : errorKind === "not-found"
            ? "not-found"
            : "error",
      errorKind,
      hasStaleData: hasData,
    };
  }

  if (query.isPending && !hasData) {
    return { state: "loading", hasStaleData: false };
  }

  if (query.isFetching && hasData) {
    return { state: "refreshing", hasStaleData: false };
  }

  if (!hasRecords) {
    return {
      state: isFiltered ? "filtered-empty" : "empty",
      hasStaleData: false,
    };
  }

  return { state: "ready", hasStaleData: false };
}

export function useInventoryQueryState<TData>(
  query: Pick<UseQueryResult<TData>, "data" | "error" | "isError" | "isFetching" | "isPending">,
  options: InventoryQueryStateOptions,
): InventoryQueryStateResult {
  return getInventoryQueryState(
    query as Pick<UseQueryResult<unknown>, "data" | "error" | "isError" | "isFetching" | "isPending">,
    options,
  );
}
