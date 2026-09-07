"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Search } from "lucide-react";
import api from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type LinkKind = "applications" | "assets" | "vms" | "databases";

type Option = {
  id: string;
  label: string;
  meta?: string;
};

export type KnowledgeDocumentLinkValues = Record<LinkKind, string[]>;

type Props = {
  value: KnowledgeDocumentLinkValues;
  onChange: (value: KnowledgeDocumentLinkValues) => void;
};

const SECTIONS: Array<{ key: LinkKind; title: string; description: string }> = [
  {
    key: "applications",
    title: "Applications",
    description: "Business services and systems",
  },
  {
    key: "assets",
    title: "Assets",
    description: "Servers, storage, and network equipment",
  },
  {
    key: "vms",
    title: "Virtual machines",
    description: "VM inventory records",
  },
  {
    key: "databases",
    title: "Databases",
    description: "Database inventory records",
  },
];

function useDocumentLinkOptions() {
  const applications = useQuery({
    queryKey: ["document-link-applications"],
    queryFn: async () =>
      (
        await api.get<Array<{ id: string; name: string; status?: string }>>(
          "/applications",
        )
      ).data,
  });
  const assets = useQuery({
    queryKey: ["document-link-assets"],
    queryFn: async () => {
      const response = await api.get<{
        data: Array<{
          id: string;
          name: string;
          assetId?: string | null;
          type?: string;
        }>;
      }>("/assets", {
        params: { page: 1, limit: 200, sortBy: "name", sortDir: "asc" },
      });
      return response.data.data ?? [];
    },
  });
  const vms = useQuery({
    queryKey: ["document-link-vms"],
    queryFn: async () =>
      (
        await api.get<
          Array<{
            id: string;
            name?: string;
            systemName?: string;
            primaryIp?: string;
          }>
        >("/vm/inventory")
      ).data,
  });
  const databases = useQuery({
    queryKey: ["document-link-databases"],
    queryFn: async () => {
      const response = await api.get<{
        data: Array<{
          id: string;
          name: string;
          engine?: string;
          environment?: string;
        }>;
      }>("/databases", {
        params: { page: 1, limit: 200, sortBy: "name", sortDir: "asc" },
      });
      return response.data.data ?? [];
    },
  });

  return {
    applications: (applications.data ?? []).map((item) => ({
      id: item.id,
      label: item.name,
      meta: item.status,
    })),
    assets: (assets.data ?? []).map((item) => ({
      id: item.id,
      label: item.name,
      meta: [item.assetId, item.type].filter(Boolean).join(" · "),
    })),
    vms: (vms.data ?? []).map((item) => ({
      id: item.id,
      label: item.systemName || item.name || item.id,
      meta: item.primaryIp,
    })),
    databases: (databases.data ?? []).map((item) => ({
      id: item.id,
      label: item.name,
      meta: [item.engine, item.environment].filter(Boolean).join(" · "),
    })),
    isLoading:
      applications.isLoading ||
      assets.isLoading ||
      vms.isLoading ||
      databases.isLoading,
  } satisfies Record<LinkKind, Option[]> & { isLoading: boolean };
}

export function KnowledgeDocumentLinks({ value, onChange }: Props) {
  const [search, setSearch] = useState("");
  const options = useDocumentLinkOptions();
  const normalizedSearch = search.trim().toLowerCase();
  const selectedCount = Object.values(value).reduce(
    (count, ids) => count + ids.length,
    0,
  );

  const visibleOptions = useMemo(() => {
    const result = {} as Record<LinkKind, Option[]>;
    for (const section of SECTIONS) {
      result[section.key] = options[section.key].filter((item) => {
        if (!normalizedSearch) return true;
        return `${item.label} ${item.meta ?? ""} ${item.id}`
          .toLowerCase()
          .includes(normalizedSearch);
      });
    }
    return result;
  }, [normalizedSearch, options]);

  const toggle = (kind: LinkKind, id: string) => {
    const current = value[kind];
    onChange({
      ...value,
      [kind]: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  };

  return (
    <Card className="space-y-4 rounded-2xl border bg-muted/20 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Link inventory records</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Link this document to the records it describes. Links make the
            document easier to find from inventory details.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {selectedCount} selected
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search inventory records to link"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, IP, type, or ID..."
          className="h-10 rounded-xl bg-card pl-9 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const selected = value[section.key];
          const items = visibleOptions[section.key];
          return (
            <div key={section.key} className="rounded-xl border bg-card p-3">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold">{section.title}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {selected.length}
                </span>
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <p className="py-3 text-center text-[11px] text-muted-foreground">
                    {options[section.key].length === 0 && options.isLoading
                      ? "Loading records..."
                      : "No matching records"}
                  </p>
                ) : (
                  items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/70"
                    >
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={() => toggle(section.key, item.id)}
                        aria-label={`Link ${item.label}`}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">
                          {item.label}
                        </span>
                        {item.meta && (
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {item.meta}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
