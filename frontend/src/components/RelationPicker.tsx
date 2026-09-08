"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Link2, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InventoryQueryStateView } from "@/components/inventory";
import { useInventoryQueryState } from "@/lib/inventory-query-state";
import api from "@/services/api";

export type RelationPickerResourceKind =
  | "applications"
  | "assets"
  | "vms"
  | "databases"
  | "logical-databases";

export type RelationPickerEnvironment = "PROD" | "UAT" | "TEST";

export type RelationPickerItem = {
  id: string;
  label: string;
  metadata: string | null;
  lifecycle: string;
  archived: boolean;
};

type RelationPickerResponse = {
  kind: RelationPickerResourceKind;
  items: RelationPickerItem[];
  selectedItems: RelationPickerItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};

type Props = {
  kind: RelationPickerResourceKind;
  label: string;
  description: string;
  value: string[];
  onChange: (value: string[]) => void;
  environment?: RelationPickerEnvironment;
};

const PAGE_SIZE = 25;

export function RelationPicker({
  kind,
  label,
  description,
  value,
  onChange,
  environment,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const selectedIds = useMemo(() => [...new Set(value)].sort(), [value]);
  const query = useQuery({
    queryKey: ["relation-options", kind, search, page, environment, selectedIds],
    queryFn: async () =>
      (
        await api.get<RelationPickerResponse>("/relation-options", {
          params: {
            kind,
            q: search.trim() || undefined,
            page,
            pageSize: PAGE_SIZE,
            environment,
            selectedIds: selectedIds.length ? selectedIds.join(",") : undefined,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const state = useInventoryQueryState(query, {
    hasData: query.data !== undefined,
    isFiltered: Boolean(search.trim()) || page > 1,
    hasRecords:
      (query.data?.items.length ?? 0) > 0 ||
      (query.data?.selectedItems.length ?? 0) > 0,
  });
  const visibleItems = useMemo(() => {
    const result = new Map<string, RelationPickerItem>();
    for (const item of query.data?.selectedItems ?? []) result.set(item.id, item);
    for (const item of query.data?.items ?? []) result.set(item.id, item);
    return [...result.values()];
  }, [query.data]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <fieldset className="space-y-2 rounded-xl border border-border bg-card p-3">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold">{label}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
          {value.length} selected
        </span>
      </div>

      <Input
        aria-label={`Search ${label}`}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="h-9 bg-background text-xs"
      />

      <InventoryQueryStateView
        state={state.state}
        onRetry={() => void query.refetch()}
        hasStaleData={state.hasStaleData}
        loadingLabel={`Loading ${label.toLowerCase()}...`}
      >
        <div className="space-y-2">
          {visibleItems.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-muted-foreground">
              {search.trim() ? `No matching ${label.toLowerCase()}.` : `No ${label.toLowerCase()} are available.`}
            </p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1" aria-label={`${label} results`}>
              {visibleItems.map((item) => {
                const selected = value.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/70"
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggle(item.id)}
                      aria-label={`Select ${item.label}${item.archived ? " (Archived)" : ""}`}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1 text-xs font-medium">
                        <span className="truncate">{item.label}</span>
                        {item.archived && (
                          <Badge variant="outline" className="text-[9px]">
                            Archived
                          </Badge>
                        )}
                      </span>
                      {item.metadata && (
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {item.metadata}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {query.data && (query.data.total > 0 || query.data.selectedItems.length > 0) && (
            <div className="flex items-center justify-between gap-2 border-t pt-2 text-[10px] text-muted-foreground">
              <span>
                {query.data.total} eligible record{query.data.total === 1 ? "" : "s"}
                {query.data.selectedItems.length > 0 ? " · selected history included" : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Previous ${label} page`}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page <= 1 || query.isFetching}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span aria-label={`${label} page ${page}`}>{page}</span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Next ${label} page`}
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!query.data.hasMore || query.isFetching}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
          {query.isFetching && query.data && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground" role="status">
              <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />
              Refreshing results...
            </span>
          )}
        </div>
      </InventoryQueryStateView>
    </fieldset>
  );
}
