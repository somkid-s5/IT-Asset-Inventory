"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  PlugZap,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Server,
  Archive,
  Search,
  ArrowLeft,
  Workflow,
  CircleAlert,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { VmVCenterSource } from "@/lib/vm-inventory";
import {
  archiveVmSource,
  createVmSource,
  getVmSources,
  restoreVmSource,
  syncAllVmSources,
  syncVmSource,
  testVmSourceConnection,
  updateVmSource,
} from "@/services/vm";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fadeInUp } from "@/lib/animations";
import { EmptyState } from "@/components/EmptyState";
import {
  InventoryPagination,
  InventoryRowActions,
  InventoryTableShell,
  InventoryTableToolbar,
  MissingValue,
  SourceHealthBadge,
  formatDateTime,
} from "@/components/inventory";
import { useInventoryQueryState } from "@/lib/inventory-query-state";
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
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";

const DEFAULT_SOURCE_FORM = {
  name: "",
  endpoint: "",
  username: "",
  password: "",
  syncInterval: "15 min",
  notes: "",
};
const SYNC_INTERVAL_OPTIONS = [
  "5 min",
  "15 min",
  "30 min",
  "1 hour",
  "6 hours",
];

const getIntervalString = (
  minutes: number | string | null | undefined,
): string => {
  if (!minutes) return "15 min";
  const mins = typeof minutes === "string" ? parseInt(minutes, 10) : minutes;
  if (isNaN(mins)) return String(minutes);
  if (mins === 60) return "1 hour";
  if (mins === 360) return "6 hours";
  return `${mins} min`;
};

function isMockSource(source: VmVCenterSource) {
  const fingerprint =
    `${source.name} ${source.endpoint} ${source.version}`.toLowerCase();
  return (
    fingerprint.includes("mock") ||
    fingerprint.includes("demo") ||
    fingerprint.includes("infrapilot.local")
  );
}

export default function VmSourcesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const canManageSources = user?.role === "ADMIN" || user?.role === "EDITOR";
  const canRestoreSources = user?.role === "ADMIN";

  const sourcesQuery = useQuery({
    queryKey: ["vm-sources"],
    queryFn: async () => {
      return await getVmSources();
    },
  });
  const sources = sourcesQuery.data ?? [];
  const isLoading = sourcesQuery.isLoading;
  const refetch = sourcesQuery.refetch;

  const [addOpen, setAddOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingSourceHasCredential, setEditingSourceHasCredential] =
    useState(false);
  const [originalEndpoint, setOriginalEndpoint] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VmVCenterSource | null>(
    null,
  );
  const [formData, setFormData] = useState(DEFAULT_SOURCE_FORM);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingSourceIds, setSyncingSourceIds] = useState<string[]>([]);
  const [lastSuccessfulTestKey, setLastSuccessfulTestKey] = useState<
    string | null
  >(null);

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const sourceStats = useMemo(
    () => ({
      healthy: sources.filter(
        (source) => source.status.toUpperCase() === "HEALTHY",
      ).length,
      attention: sources.filter(
        (source) => source.status.toUpperCase() === "CONNECTION_FAILED",
      ).length,
      vmCount: sources.reduce(
        (total, source) => total + (source.vmCount || 0),
        0,
      ),
      mock: sources.filter(isMockSource).length,
    }),
    [sources],
  );
  const latestSync = sources.find(
    (source) => source.lastSyncAt && source.lastSyncAt !== "--",
  )?.lastSyncAt;
  const syncMeta = sources.length
    ? `${sources.length} source${sources.length === 1 ? "" : "s"} configured · last sync ${latestSync ?? "not run"}`
    : "No vCenter sources configured";
  const getConnectionTestKey = useCallback(
    (data: typeof DEFAULT_SOURCE_FORM) =>
      JSON.stringify({
        endpoint: data.endpoint.trim(),
        username: data.username.trim(),
        password: data.password,
      }),
    [],
  );
  const currentConnectionTestKey = getConnectionTestKey(formData);
  const connectionFieldsChanged =
    !editingSourceId ||
    formData.endpoint.trim() !== originalEndpoint.trim() ||
    Boolean(formData.username.trim()) ||
    Boolean(formData.password);
  const isConnectionVerified =
    !connectionFieldsChanged || lastSuccessfulTestKey === currentConnectionTestKey;

  useEffect(() => {
    setHeader({
      title: "vCenter Sources",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Compute" },
        { label: "vCenter Sources" },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_SOURCE_FORM);
    setEditingSourceId(null);
    setEditingSourceHasCredential(false);
    setOriginalEndpoint("");
    setLastSuccessfulTestKey(null);
  }, []);
  const openAddDialog = useCallback(() => {
    resetForm();
    setAddOpen(true);
  }, [resetForm]);
  const openEditDialog = useCallback((source: VmVCenterSource) => {
    setEditingSourceId(source.id);
    setEditingSourceHasCredential(source.hasCredential);
    setOriginalEndpoint(source.endpoint);
    setFormData({
      name: source.name,
      endpoint: source.endpoint,
      username: "",
      password: "",
      syncInterval: getIntervalString(source.syncInterval),
      notes: source.notes ?? "",
    });
    setLastSuccessfulTestKey(null);
    setAddOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (
      connectionFieldsChanged &&
      lastSuccessfulTestKey !== getConnectionTestKey(formData)
    )
      return toast.error("Please test connection before saving");
    setSaving(true);
    try {
      if (editingSourceId) {
        await updateVmSource(editingSourceId, formData);
        toast.success("vCenter source updated");
      } else {
        await createVmSource(formData);
        toast.success("vCenter source created");
      }
      setAddOpen(false);
      resetForm();
      void refetch();
    } catch {
      toast.error("Failed to save source");
    } finally {
      setSaving(false);
    }
  }, [
    formData,
    editingSourceId,
    lastSuccessfulTestKey,
    connectionFieldsChanged,
    getConnectionTestKey,
    resetForm,
    refetch,
  ]);

  const handleTestConnection = useCallback(async () => {
    if (!formData.endpoint.trim())
      return toast.error("Endpoint is required for testing");
    setTestingConnection(true);
    try {
      const result = await testVmSourceConnection({
        endpoint: formData.endpoint,
        username: formData.username,
        password: formData.password,
      });
      if (result.success) {
        setLastSuccessfulTestKey(getConnectionTestKey(formData));
        toast.success(result.message);
      } else {
        setLastSuccessfulTestKey(null);
        toast.error(result.message);
      }
    } catch {
      setLastSuccessfulTestKey(null);
      toast.error("Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  }, [formData, getConnectionTestKey]);

  const handleSyncAll = useCallback(async () => {
    setSyncingAll(true);
    try {
      const result = await syncAllVmSources();
      result.success
        ? toast.success(result.message)
        : toast.error(result.message);
      void refetch();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncingAll(false);
    }
  }, [refetch]);

  const handleSyncSource = useCallback(
    async (source: VmVCenterSource) => {
      setSyncingSourceIds((c) => [...c, source.id]);
      try {
        const result = await syncVmSource(source.id);
        result.success
          ? toast.success(result.message)
          : toast.error(result.message);
        void refetch();
      } catch {
        toast.error(`Sync failed for ${source.name}`);
      } finally {
        setSyncingSourceIds((c) => c.filter((id) => id !== source.id));
      }
    },
    [refetch],
  );

  const handleArchiveSource = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await archiveVmSource(deleteTarget.id);
      toast.success(`${deleteTarget.name} archived`);
      setDeleteTarget(null);
      void refetch();
    } catch {
      toast.error("Failed to archive source");
    }
  }, [deleteTarget, refetch]);

  const handleRestoreSource = useCallback(
    async (source: VmVCenterSource) => {
      try {
        await restoreVmSource(source.id);
        toast.success(`${source.name} restored`);
        void refetch();
      } catch {
        toast.error("Failed to restore source");
      }
    },
    [refetch],
  );

  const columns = useMemo<ColumnDef<VmVCenterSource>[]>(
    () => [
      {
        accessorKey: "name",
        header: "vCenter Source Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground">
              <Server className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {row.original.name}
                </span>
                {isMockSource(row.original) ? (
                  <Badge
                    variant="outline"
                    className="border-info/25 bg-info/10 px-1.5 py-0 text-[9px] font-bold uppercase text-info"
                  >
                    Mock
                  </Badge>
                ) : null}
              </div>
              <span className="text-[11px] text-muted-foreground">
                vCenter {row.original.version || "--"}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "endpoint",
        header: "Endpoint",
        cell: ({ getValue }) => (
          <span
            className="block max-w-[260px] truncate font-mono text-[11px] text-muted-foreground"
            title={getValue() as string}
          >
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "vmCount",
        header: "VM Count",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs tabular-nums">
            {getValue() as number}
          </span>
        ),
      },
      {
        accessorKey: "syncInterval",
        header: "Sync Interval",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            Every {getIntervalString(getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original;
          const isSyncing = syncingAll || syncingSourceIds.includes(s.id);
          return (
            <div className="flex items-center gap-1.5">
              {isSyncing && <RefreshCw className="h-3 w-3 animate-spin text-info" />}
              <SourceHealthBadge value={isSyncing ? "SYNCING" : s.status} />
            </div>
          );
        },
      },
      {
        accessorKey: "lastSyncAt",
        header: "Last Sync",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {getValue() && getValue() !== "--"
              ? formatDateTime(getValue() as string)
              : <MissingValue compact />}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const source = row.original;
          const isSyncing = syncingAll || syncingSourceIds.includes(source.id);
          const isArchived = source.status.toUpperCase() === "ARCHIVED";
          return (
            <InventoryRowActions
              recordLabel={source.name}
              detailHref={`/dashboard/virtual-machines/sources/${source.id}`}
              edit={{
                allowed: canManageSources && !isArchived,
                onSelect: () => openEditDialog(source),
              }}
              secondaryActions={
                canManageSources && !isArchived
                  ? [
                      {
                        label: "Sync",
                        disabled: isSyncing,
                        icon: (
                          <RefreshCw
                            className={cn(isSyncing && "animate-spin")}
                          />
                        ),
                        onSelect: () => void handleSyncSource(source),
                      },
                    ]
                  : []
              }
              lifecycle={{
                status: isArchived ? "ARCHIVED" : "ACTIVE",
                archive: {
                  allowed: canManageSources && !isArchived && !isSyncing,
                  onSelect: () => setDeleteTarget(source),
                },
                restore: {
                  allowed: canRestoreSources && isArchived && !isSyncing,
                  onSelect: () => void handleRestoreSource(source),
                },
              }}
            />
          );
        },
      },
    ],
    [
      syncingAll,
      syncingSourceIds,
      handleSyncSource,
      openEditDialog,
      handleRestoreSource,
      canManageSources,
      canRestoreSources,
    ],
  );

  const table = useReactTable({
    data: sources,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const queryState = useInventoryQueryState(sourcesQuery, {
    hasData: sourcesQuery.data !== undefined,
    hasRecords: table.getFilteredRowModel().rows.length > 0,
    isFiltered: Boolean(globalFilter.trim()),
  });

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="space-y-4 pt-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Workflow className="h-3.5 w-3.5" />
            Infrastructure Integration Sources
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure and monitor vCenter API connections
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 shadow-sm bg-card"
            onClick={() => router.push("/dashboard/virtual-machines")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to VMs
          </Button>
          {canManageSources && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 shadow-sm bg-card"
                onClick={openAddDialog}
                disabled={syncingAll || isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add vCenter
              </Button>
              <Button
                size="sm"
                className="h-9 shadow-lg shadow-primary/20"
                onClick={handleSyncAll}
                disabled={syncingAll || isLoading}
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", syncingAll && "animate-spin")}
                />
                {syncingAll ? "Syncing..." : "Sync All Sources"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SourceSummaryTile
          label="Sources"
          value={sources.length}
          hint="Configured connections"
          icon={Workflow}
        />
        <SourceSummaryTile
          label="Healthy"
          value={sourceStats.healthy}
          hint="Ready for sync"
          icon={CheckCircle2}
          iconClassName="text-success"
        />
        <SourceSummaryTile
          label="Needs attention"
          value={sourceStats.attention}
          hint="Connection failures"
          icon={CircleAlert}
          iconClassName="text-critical"
        />
        <SourceSummaryTile
          label="Managed VMs"
          value={sourceStats.vmCount}
          hint={
            sourceStats.mock ? `${sourceStats.mock} mock` : "Across all sources"
          }
          icon={Boxes}
          iconClassName="text-info"
        />
      </div>

      <InventoryTableShell
        title="Infrastructure Integration Sources"
        description="Configure and monitor vCenter API connections"
        secondaryActions={
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/virtual-machines")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to VMs
          </Button>
        }
        toolbar={
          <InventoryTableToolbar
            search={
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search sources..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="h-9 w-full pl-9" />
              </div>
            }
            actions={
              canManageSources ? (
                <Button size="sm" onClick={handleSyncAll} disabled={syncingAll || isLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", syncingAll && "animate-spin")} />
                  {syncingAll ? "Syncing..." : "Sync All Sources"}
                </Button>
              ) : undefined
            }
          />
        }
        state={queryState.state}
        hasStaleData={queryState.hasStaleData}
        onRetry={() => void refetch()}
        emptyState={
          <EmptyState
            icon={Server}
            title="No vCenter sources yet"
            description="Add a vCenter source to start discovering virtual machines."
            action={{ label: "Create first source", onClick: openAddDialog }}
          />
        }
        filteredEmptyState={
          <EmptyState
            icon={Server}
            title="No sources match your search"
            description="Try a different source name or endpoint."
          />
        }
        pagination={
          <InventoryPagination
            page={table.getState().pagination.pageIndex + 1}
            pageSize={table.getState().pagination.pageSize}
            total={table.getFilteredRowModel().rows.length}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            onPageSizeChange={(pageSize) => {
              table.setPageSize(pageSize);
              table.setPageIndex(0);
            }}
            pageSizeOptions={[10, 20, 40]}
          />
        }
      >
      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-md">
        <div className="border-b border-border/70 bg-muted/30 p-3 sm:p-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {syncMeta}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
            <TableHeader className="bg-transparent">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-border hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="border-b border-border px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
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
                    className="group border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-3 py-2 text-[12px] align-middle"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
      </InventoryTableShell>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl bg-card p-0">
          <DialogHeader className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6 sm:py-5">
            <DialogTitle>
              {editingSourceId ? "Edit vCenter Source" : "Add vCenter Source"}
            </DialogTitle>
            <DialogDescription>
              {editingSourceId
                ? "Update source metadata without re-entering the saved credential, or test new connection values before saving."
                : "Configure a new vCenter server connection for automated VM discovery."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>Source Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Endpoint</Label>
                <Input
                  value={formData.endpoint}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, endpoint: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label optional>Sync Interval</Label>
                <Select
                  value={formData.syncInterval}
                  onValueChange={(val) =>
                    setFormData((c) => ({ ...c, syncInterval: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNC_INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label {...(editingSourceId ? { optional: true } : { required: true })}>
                  Username
                </Label>
                <Input
                  placeholder={
                    editingSourceId && editingSourceHasCredential
                      ? "Leave blank to preserve saved username"
                      : undefined
                  }
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, username: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label {...(editingSourceId ? { optional: true } : { required: true })}>
                  Password
                </Label>
                <Input
                  type="password"
                  placeholder={
                    editingSourceId && editingSourceHasCredential
                      ? "Leave blank to preserve saved password"
                      : undefined
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, password: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    isConnectionVerified
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-warning/30 bg-warning/5 text-warning",
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {isConnectionVerified ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {isConnectionVerified
                      ? "Connection Verified"
                      : "Connection Test Required"}
                  </div>
                  <p className="mt-1 text-xs opacity-80">
                    {isConnectionVerified
                      ? connectionFieldsChanged
                        ? "Ready to save"
                        : "Metadata-only change; saved credentials will be preserved"
                      : "Please test the connection with the current endpoint and credentials before saving"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label optional>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((c) => ({ ...c, notes: e.target.value }))
                  }
                  className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="secondary"
                onClick={handleTestConnection}
                disabled={saving || testingConnection}
              >
                {testingConnection ? (
                  <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlugZap className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAddOpen(false);
                    resetForm();
                  }}
                  disabled={saving || testingConnection}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    saving || testingConnection || !isConnectionVerified
                  }
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Archive Source
            </DialogTitle>
            <DialogDescription>
              The source and its VM history will be preserved and hidden from
              active sync operations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to archive{" "}
              <span className="font-bold text-foreground">
                {deleteTarget?.name}
              </span>
              ?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchiveSource}>
              Archive
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SourceSummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {hint}
      </div>
    </div>
  );
}
