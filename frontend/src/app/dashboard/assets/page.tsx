"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import api from "@/services/api";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronsUpDown,
  Database,
  FolderTree,
  HardDrive,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Server,
  Shield,
  Box,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  MoreHorizontal,
  Columns,
  AlertTriangle,
  Download,
  ArrowUp,
  ArrowDown,
  Archive,
  ArchiveRestore,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AssetFormDialog } from "@/components/LazyLoadedDialogs";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { DataTableSkeleton } from "@/components/Skeletons";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { fadeInUp } from "@/lib/animations";

type AssetType = "SERVER" | "STORAGE" | "SWITCH" | "SP" | "NETWORK";

interface Asset {
  id: string;
  assetId?: string | null;
  name: string;
  type: AssetType;
  rack?: string | null;
  location?: string | null;
  status?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  children?: Asset[];
}

interface AssetsResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_ASSETS_RESPONSE: AssetsResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const TABS: {
  label: string;
  value: "ALL" | AssetType;
  icon: typeof Box;
  iconClassName: string;
}[] = [
  { label: "All", value: "ALL", icon: Box, iconClassName: "text-primary" },
  {
    label: "Servers",
    value: "SERVER",
    icon: Server,
    iconClassName: "text-success",
  },
  {
    label: "Storage",
    value: "STORAGE",
    icon: Database,
    iconClassName: "text-info",
  },
  {
    label: "Switches",
    value: "SWITCH",
    icon: Shield,
    iconClassName: "text-warning",
  },
  {
    label: "Service Processors",
    value: "SP",
    icon: HardDrive,
    iconClassName: "text-info",
  },
  {
    label: "Network",
    value: "NETWORK",
    icon: FolderTree,
    iconClassName: "text-primary",
  },
];

function getAssetIcon(type: AssetType) {
  const className = "h-4 w-4";
  switch (type) {
    case "STORAGE":
      return <Database className={className} />;
    case "SWITCH":
      return <Shield className={className} />;
    case "SP":
      return <HardDrive className={className} />;
    case "NETWORK":
      return <FolderTree className={className} />;
    default:
      return <Server className={className} />;
  }
}

export default function AssetsPage() {
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const navigationInProgressRef = useRef(false);
  const initialType = searchParams.get("type") as AssetType | null;
  const [showArchived, setShowArchived] = useState(
    () => searchParams.get("archived") === "true",
  );
  const [activeTab, setActiveTab] = useState<"ALL" | AssetType>(
    initialType &&
      ["SERVER", "STORAGE", "SWITCH", "SP", "NETWORK"].includes(initialType)
      ? initialType
      : "ALL",
  );
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [ownerFilter, setOwnerFilter] = useState(
    () => searchParams.get("owner") ?? "",
  );
  const [locationFilter, setLocationFilter] = useState(
    () => searchParams.get("location") ?? "",
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    searchTerm.trim(),
  );
  const [debouncedOwnerFilter, setDebouncedOwnerFilter] = useState(
    ownerFilter.trim(),
  );
  const [debouncedLocationFilter, setDebouncedLocationFilter] = useState(
    locationFilter.trim(),
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearchTerm(searchTerm.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedOwnerFilter(ownerFilter.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [ownerFilter]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedLocationFilter(locationFilter.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [locationFilter]);

  // Dialog functionality state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(
    null,
  );

  // Tanstack Table States
  const [sorting, setSorting] = useState<SortingState>([
    { id: "assetId", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [expanded, setExpanded] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  useEffect(() => {
    if (navigationInProgressRef.current || dialogOpen) return;

    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };

    setOrDelete("q", debouncedSearchTerm);
    setOrDelete("owner", debouncedOwnerFilter);
    setOrDelete("location", debouncedLocationFilter);
    setOrDelete("type", activeTab === "ALL" ? "" : activeTab);
    setOrDelete("archived", showArchived ? "true" : "");

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace(
        nextQuery ? `/dashboard/assets?${nextQuery}` : "/dashboard/assets",
        { scroll: false },
      );
    }
  }, [
    activeTab,
    debouncedLocationFilter,
    debouncedOwnerFilter,
    debouncedSearchTerm,
    dialogOpen,
    router,
    searchParams,
    showArchived,
  ]);

  const {
    data: assetsResponse = EMPTY_ASSETS_RESPONSE,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "assets",
      activeTab,
      debouncedSearchTerm,
      debouncedOwnerFilter,
      debouncedLocationFilter,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      showArchived,
    ],
    queryFn: async () => {
      const response = await api.get<AssetsResponse>("/assets", {
        params: {
          q: debouncedSearchTerm || undefined,
          owner: debouncedOwnerFilter || undefined,
          location: debouncedLocationFilter || undefined,
          type: activeTab === "ALL" ? undefined : activeTab,
          page: pagination.pageIndex + 1,
          limit: pagination.pageSize,
          sortBy: sorting[0]?.id || "assetId",
          sortDir: sorting[0]?.desc ? "desc" : "asc",
          status: showArchived ? "ARCHIVED" : undefined,
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const assets = assetsResponse.data;
  const totalPages = Math.max(1, assetsResponse.totalPages);
  const hasActiveAssetFilter =
    Boolean(
      debouncedSearchTerm || debouncedOwnerFilter || debouncedLocationFilter,
    ) ||
    activeTab !== "ALL" ||
    showArchived;
  const hasOperationalFilters = Boolean(
    ownerFilter.trim() || locationFilter.trim(),
  );

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [
    activeTab,
    debouncedLocationFilter,
    debouncedOwnerFilter,
    debouncedSearchTerm,
    sorting,
    showArchived,
  ]);

  useEffect(() => {
    setHeader({
      title: "Assets",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Assets" },
      ],
    });
  }, [setHeader]);

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        accessorKey: "assetId",
        header: ({ column }) => (
          <SortableHeader column={column} title="Asset ID" />
        ),
        cell: ({ row, getValue }) => (
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${row.depth * 1}rem` }}
          >
            {row.getCanExpand() ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  row.toggleExpanded();
                }}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-transform"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    row.getIsExpanded() && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <div className="w-5" />
            )}
            <span className="font-mono text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tabular-nums">
              {(getValue() as string) || "--"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader column={column} title="Asset Name" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground">
              {getAssetIcon(row.original.type)}
            </div>
            <span
              data-testid="asset-name"
              className="truncate font-semibold text-foreground"
            >
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => {
          const type = getValue() as AssetType;
          const labels: Record<AssetType, string> = {
            SERVER: "Server",
            STORAGE: "Storage",
            SWITCH: "Switch",
            SP: "SP",
            NETWORK: "Network",
          };
          return (
            <Badge
              variant="outline"
              className="font-medium bg-muted/20 text-[11px] px-1.5 py-0"
            >
              {labels[type]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "rack",
        header: "Rack",
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] opacity-70 tabular-nums">
            {(getValue() as string) || "--"}
          </span>
        ),
      },
      {
        accessorKey: "sn",
        header: "Serial Number",
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] opacity-70 tabular-nums">
            {(getValue() as string) || "--"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as string;
          if (!status)
            return (
              <span className="text-xs text-muted-foreground opacity-50">
                --
              </span>
            );

          const config: Record<string, { label: string; className: string }> = {
            ACTIVE: {
              label: "Active",
              className: "bg-success/10 text-success border-success/20",
            },
            INACTIVE: {
              label: "Inactive",
              className: "bg-critical/10 text-critical border-critical/20",
            },
            MAINTENANCE: {
              label: "Maintenance",
              className: "bg-warning/10 text-warning border-warning/20",
            },
            DECOMMISSIONED: {
              label: "Decommissioned",
              className: "bg-low/10 text-low border-low/20",
            },
          };

          const item = config[status] || {
            label: status,
            className: "bg-low/10 text-low border-low/20",
          };

          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0",
                item.className,
              )}
            >
              {item.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const asset = row.original;
          return user?.role === "ADMIN" || user?.role === "EDITOR" ? (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                onClick={() => openEditDialog(asset.id)}
                aria-label="Edit Asset"
              >
                {loadingEditId === asset.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="Asset Actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      navigationInProgressRef.current = true;
                      router.push(`/dashboard/assets/${asset.id}`);
                    }}
                  >
                    View Details
                  </DropdownMenuItem>
                  {user?.role === "ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          showArchived
                            ? "text-primary focus:text-primary focus:bg-primary/5"
                            : "text-destructive focus:text-destructive focus:bg-destructive/5",
                        )}
                        onClick={() => setAssetPendingDelete(asset)}
                      >
                        {showArchived ? "Restore Asset" : "Archive Asset"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null;
        },
      },
    ],
    [user, loadingEditId, router, showArchived],
  );

  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting, columnVisibility, expanded, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  const openEditDialog = async (id: string) => {
    setLoadingEditId(id);
    try {
      const res = await api.get(`/assets/${id}`);
      setEditingAsset(res.data);
      setDialogOpen(true);
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleAssetSaved = () => {
    // Newly created records may not have an Asset ID yet and therefore sort
    // after identified records. Show the just-created record immediately
    // without changing the server-side pagination model.
    if (!editingAsset) {
      setSorting([{ id: "createdAt", desc: true }]);
    }
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    void queryClient.invalidateQueries({ queryKey: ["assets"] });
    void refetch();
  };

  const confirmDeleteAsset = async () => {
    if (!assetPendingDelete) return;
    setDeletingId(assetPendingDelete.id);
    try {
      if (showArchived) {
        await api.patch(`/assets/${assetPendingDelete.id}/restore`);
        toast.success("Asset restored successfully");
      } else {
        await api.patch(`/assets/${assetPendingDelete.id}/archive`);
        toast.success("Asset archived successfully");
      }
      setAssetPendingDelete(null);
      void refetch();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Failed to ${showArchived ? "restore" : "archive"} asset`,
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && assets.length === 0) return <DataTableSkeleton />;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="space-y-4 pt-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 text-balance">
            <HardDrive className="h-3.5 w-3.5" />
            Hardware & Infrastructure Inventory
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">
            Manage your physical and network assets
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "ADMIN" && (
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              className="h-9 shadow-sm bg-card"
              onClick={() => setShowArchived((value) => !value)}
              aria-pressed={showArchived}
            >
              {showArchived ? (
                <ArchiveRestore className="h-4 w-4 mr-2" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {showArchived ? "Active Assets" : "Archived Assets"}
            </Button>
          )}
          {(user?.role === "ADMIN" || user?.role === "EDITOR") && (
            <>
              <Button
                onClick={() => {
                  setEditingAsset(undefined);
                  setDialogOpen(true);
                }}
                className="h-9 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
        <Card className="border border-border/80 gap-0 shadow-md bg-card overflow-hidden p-0 rounded-2xl">
          <div className="p-3 sm:p-4 border-b border-border bg-muted/80 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Tabs */}
            <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto bg-muted/50 p-1 rounded-xl w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  aria-pressed={activeTab === tab.value}
                  className={cn(
                    "shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                    activeTab === tab.value
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                  )}
                >
                  <tab.icon
                    className={cn(
                      "h-3.5 w-3.5",
                      activeTab === tab.value
                        ? tab.iconClassName
                        : "text-muted-foreground",
                    )}
                  />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative min-w-0 flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full pl-9 bg-card border-border/50 focus-visible:ring-primary/20 md:w-64"
                />
              </div>

              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-card"
                    aria-label="Toggle Columns"
                  >
                    <Columns className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((c) => c.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize cursor-pointer"
                        checked={column.getIsVisible()}
                        onCheckedChange={(val) =>
                          column.toggleVisibility(!!val)
                        }
                        onSelect={(e) => e.preventDefault()}
                      >
                        {column.id === "assetId" ? "Asset ID" : column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-border/70 bg-card px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </div>
              <div className="relative min-w-0 sm:w-52">
                <Input
                  aria-label="Filter by owner"
                  placeholder="Owner (exact match)"
                  value={ownerFilter}
                  onChange={(event) => setOwnerFilter(event.target.value)}
                  className="h-8 pr-8 text-xs"
                />
                {ownerFilter && (
                  <button
                    type="button"
                    aria-label="Clear owner filter"
                    onClick={() => setOwnerFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="relative min-w-0 sm:w-52">
                <Input
                  aria-label="Filter by location"
                  placeholder="Location (exact match)"
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="h-8 pr-8 text-xs"
                />
                {locationFilter && (
                  <button
                    type="button"
                    aria-label="Clear location filter"
                    onClick={() => setLocationFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {hasOperationalFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 justify-start text-xs lg:justify-center"
                onClick={() => {
                  setOwnerFilter("");
                  setLocationFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader className="bg-transparent">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-border hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2 px-3 border-b-2 border-border"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        navigationInProgressRef.current = true;
                        router.push(`/dashboard/assets/${row.original.id}`);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-1.5 px-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-96 p-0 border-none bg-transparent"
                    >
                      <div className="flex items-center justify-center h-full">
                        <EmptyState
                          icon={HardDrive}
                          title="No assets found"
                          description={
                            !hasActiveAssetFilter && assetsResponse.total === 0
                              ? "You haven't added any infrastructure assets yet. Start by adding your first server or switch."
                              : showArchived
                                ? "No archived assets match your current search or type filter."
                                : "No assets match your current search or filter criteria."
                          }
                          action={
                            !hasActiveAssetFilter && assets.length === 0
                              ? {
                                  label: "Add Your First Asset",
                                  onClick: () => {
                                    setEditingAsset(undefined);
                                    setDialogOpen(true);
                                  },
                                }
                              : undefined
                          }
                          className="w-full max-w-md border-none bg-transparent"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-border/50 bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="text-xs text-muted-foreground">
              Total {assetsResponse.total} items
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-6 lg:gap-8">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium">Rows per page</p>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="h-8 w-16 rounded-md border border-border bg-card text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  {[5, 10, 20, 30, 40, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-xs font-medium">
                Page {pagination.pageIndex + 1} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  aria-label="Previous page"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  aria-label="Next page"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Asset Form Dialog */}
      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assetToEdit={editingAsset}
        onSuccess={handleAssetSaved}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!assetPendingDelete}
        onOpenChange={(open) => !open && setAssetPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px] rounded-[24px] border-none p-0 overflow-hidden">
          <Alert
            variant={showArchived ? "default" : "destructive"}
            className="rounded-none border-none py-6"
          >
            <AlertTitle className="text-xl">
              Confirm {showArchived ? "Restore" : "Archive"}
            </AlertTitle>
            <AlertDescription className="text-sm opacity-90">
              You are about to {showArchived ? "restore" : "archive"} asset{" "}
              <span className="font-bold underline">
                {assetPendingDelete?.name}
              </span>
            </AlertDescription>
          </Alert>

          <div className="p-6 pt-2 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {showArchived
                ? "The asset will return to the active inventory and its related data will remain available."
                : "The asset will be removed from the active inventory. You can restore it later from Archived Assets."}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setAssetPendingDelete(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant={showArchived ? "default" : "destructive"}
                onClick={confirmDeleteAsset}
                disabled={!!deletingId}
                className="rounded-xl shadow-lg shadow-destructive/20"
              >
                {deletingId ? (
                  <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                ) : showArchived ? (
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                ) : (
                  <Archive className="h-4 w-4 mr-2" />
                )}
                Confirm {showArchived ? "Restore" : "Archive"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SortableHeader<TData, TValue>({
  column,
  title,
}: {
  column: import("@tanstack/react-table").Column<TData, TValue>;
  title: string;
}) {
  return (
    <button
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="flex items-center gap-1 hover:text-foreground transition-colors group"
    >
      {title}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ChevronsUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
