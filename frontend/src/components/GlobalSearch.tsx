"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
  assetId?: string | null;
  systemName?: string;
  engine?: string;
  host?: string;
  category?: { name: string };
};
type SearchResponse = {
  applications: SearchResult[];
  assets: SearchResult[];
  virtualMachines: SearchResult[];
  databases: SearchResult[];
  documents: SearchResult[];
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
  const { data } = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () =>
      (await api.get<SearchResponse>("/search", { params: { q: query } })).data,
    enabled: open && query.trim().length > 1,
  });
  const groups: Array<
    [string, SearchResult[], (item: SearchResult) => string]
  > = [
    [
      "Applications",
      data?.applications ?? [],
      (item) => `/dashboard/applications/${item.id}`,
    ],
    ["Assets", data?.assets ?? [], (item) => `/dashboard/assets/${item.id}`],
    [
      "Virtual Machines",
      data?.virtualMachines ?? [],
      (item) => `/dashboard/virtual-machines/${item.id}`,
    ],
    [
      "Databases",
      data?.databases ?? [],
      (item) => `/dashboard/databases/${item.id}`,
    ],
    [
      "Documents",
      data?.documents ?? [],
      (item) => `/dashboard/docs/${item.id}`,
    ],
  ];
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
        onOpenChange={setOpen}
        title="Global search"
        description="Search safe inventory identifiers"
        className="w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-border/80 bg-popover/95 shadow-2xl sm:max-w-2xl"
      >
        <CommandInput
          placeholder="Search applications, assets, VMs, databases, documents…"
          aria-label="Search inventory"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[min(60vh,28rem)] p-2">
          <CommandEmpty>
            {query.trim().length > 1
              ? "No matching inventory records."
              : "Type at least two characters to search."}
          </CommandEmpty>
          {groups.map(([label, items, href]) =>
            items.length ? (
              <CommandGroup key={label} heading={label}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.name ?? item.title ?? ""} ${item.host ?? ""}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(href(item));
                    }}
                  >
                    <span className="truncate">{item.name ?? item.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.assetId ??
                        item.systemName ??
                        item.engine ??
                        item.category?.name ??
                        item.host ??
                        ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null,
          )}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground">
          <span>{query.trim().length > 1 ? "Select a result to open its record" : "Search across your inventory"}</span>
          <kbd className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
        </div>
      </CommandDialog>
    </>
  );
}
