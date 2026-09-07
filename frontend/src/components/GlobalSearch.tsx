"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import api from "@/services/api";

type SearchResult = {
  id: string;
  name?: string;
  title?: string;
  technicalOwner?: string | null;
  businessUnit?: string | null;
  assetId?: string | null;
  sn?: string | null;
  type?: string;
  location?: string | null;
  ipAllocations?: Array<{ address: string }>;
  systemName?: string | null;
  primaryIp?: string | null;
  engine?: string;
  host?: string | null;
  ipAddress?: string | null;
  serviceName?: string | null;
  category?: { name: string };
  hostAsset?: { name: string; assetId?: string | null } | null;
  hostVm?: {
    name: string;
    systemName?: string | null;
    primaryIp?: string | null;
  } | null;
  databaseInventory?: { id: string; name: string; engine: string };
};

type SearchResponse = {
  applications: SearchResult[];
  assets: SearchResult[];
  virtualMachines: SearchResult[];
  databases: SearchResult[];
  logicalDatabases: SearchResult[];
  documents: SearchResult[];
};

type SearchGroup = {
  label: string;
  items: SearchResult[];
  href: (item: SearchResult) => string;
  primary: (item: SearchResult) => string;
  secondary: (item: SearchResult) => string;
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalizedQuery = query.trim();
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["global-search", normalizedQuery],
    queryFn: async () =>
      (
        await api.get<SearchResponse>("/search", {
          params: { q: normalizedQuery },
        })
      ).data,
    enabled: open && normalizedQuery.length > 1,
    retry: false,
  });

  const groups: SearchGroup[] = [
    {
      label: "Applications",
      items: data?.applications ?? [],
      href: (item) => `/dashboard/applications/${item.id}`,
      primary: (item) => item.name ?? "Application",
      secondary: (item) =>
        [item.technicalOwner, item.businessUnit].filter(Boolean).join(" · "),
    },
    {
      label: "Assets",
      items: data?.assets ?? [],
      href: (item) => `/dashboard/assets/${item.id}`,
      primary: (item) => item.name ?? "Asset",
      secondary: (item) =>
        [
          item.assetId,
          item.sn,
          item.ipAllocations
            ?.map((allocation) => allocation.address)
            .join(", "),
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      label: "Virtual Machines",
      items: data?.virtualMachines ?? [],
      href: (item) => `/dashboard/virtual-machines/${item.id}`,
      primary: (item) => item.name ?? item.systemName ?? "Virtual Machine",
      secondary: (item) =>
        [item.systemName, item.primaryIp, item.host]
          .filter(Boolean)
          .join(" · "),
    },
    {
      label: "Database Instances",
      items: data?.databases ?? [],
      href: (item) => `/dashboard/databases/${item.id}`,
      primary: (item) => item.name ?? "Database",
      secondary: (item) =>
        [
          item.engine,
          item.host ??
            item.hostAsset?.name ??
            item.hostVm?.systemName ??
            item.hostVm?.name,
          item.ipAddress,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      label: "Logical Databases",
      items: data?.logicalDatabases ?? [],
      href: (item) =>
        `/dashboard/databases/${item.databaseInventory?.id ?? item.id}`,
      primary: (item) => item.name ?? "Logical Database",
      secondary: (item) =>
        item.databaseInventory
          ? `${item.databaseInventory.name} · ${item.databaseInventory.engine}`
          : "",
    },
    {
      label: "Documents",
      items: data?.documents ?? [],
      href: (item) => `/dashboard/docs/${item.id}`,
      primary: (item) => item.title ?? "Document",
      secondary: (item) => item.category?.name ?? "",
    },
  ];

  const hasResults = groups.some((group) => group.items.length > 0);
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-between text-muted-foreground md:flex"
        onClick={() => setOpen(true)}
        aria-label="Open global search"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search inventory
        </span>
        <kbd className="rounded border px-1.5 text-[10px]">Ctrl K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        shouldFilter={false}
        title="Global search"
        description="Search safe inventory identifiers"
        className="w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-border/80 bg-popover/95 shadow-2xl sm:max-w-2xl"
      >
        <CommandInput
          autoFocus
          placeholder="Search applications, assets, VMs, databases, documents…"
          aria-label="Search inventory"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList
          className="max-h-[min(60vh,28rem)] p-2"
          aria-label="Global search results"
        >
          {isFetching ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
            >
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Searching inventory…
            </div>
          ) : isError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 px-4 py-8 text-center"
            >
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Search unavailable</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The inventory search request failed. Try again without losing
                  your query.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                Retry search
              </Button>
            </div>
          ) : (
            <>
              {!hasResults && (
                <CommandEmpty>
                  {normalizedQuery.length > 1
                    ? "No matching inventory records."
                    : "Type at least two characters to search."}
                </CommandEmpty>
              )}
              {groups.map((group) =>
                group.items.length ? (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.items.map((item) => (
                      <CommandItem
                        key={`${group.label}-${item.id}`}
                        value={`${group.label}-${item.id}`}
                        onSelect={() => {
                          handleOpenChange(false);
                          router.push(group.href(item));
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {group.primary(item)}
                        </span>
                        <span className="ml-3 max-w-[55%] truncate text-xs text-muted-foreground">
                          {group.secondary(item)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null,
              )}
            </>
          )}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            {normalizedQuery.length > 1
              ? "Select a result to open its record"
              : "Search across your inventory"}
          </span>
          <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>
        </div>
      </CommandDialog>
    </>
  );
}
