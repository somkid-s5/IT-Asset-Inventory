'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle, CheckCircle2, Clock3, Monitor, RefreshCw, Search, Server, 
  Columns, Download, ShieldAlert,
  LoaderCircle, Box, Archive, ArchiveRestore
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { VmFormDialog } from '@/components/LazyLoadedDialogs';
import { EmptyState } from '@/components/EmptyState';
import { EnvironmentBadge, InventoryPagination, InventoryQueryStateView } from '@/components/inventory';
import { useInventoryQueryState } from '@/lib/inventory-query-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type VmDiscoveryItem, type VmInventoryEnvironment, type VmInventoryItem, type VmListResponse, type VmViewCounts } from '@/lib/vm-inventory';
import { archiveVmInventory, getVmDiscoveries, getVmDiscovery, getVmInventory, restoreVmInventory } from '@/services/vm';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  flexRender, getCoreRowModel, useReactTable,
  ColumnDef, VisibilityState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fadeInUp } from '@/lib/animations';

type InventoryView = 'PENDING' | 'ACTIVE' | 'ORPHANED' | 'ARCHIVED';

const VIEW_COPY: Record<InventoryView, { title: string; shortLabel: string; description: string; searchPlaceholder: string; }> = {
  PENDING: {
    title: 'Pending Setup',
    shortLabel: 'Pending',
    description: 'Newly discovered virtual machines requiring business information before entering active inventory.',
    searchPlaceholder: 'Search VM name, IP...',
  },
  ACTIVE: {
    title: 'Active Inventory',
    shortLabel: 'Active',
    description: 'Ready-to-use virtual machine records managed within AssetOps.',
    searchPlaceholder: 'Search VM name, IP, host...',
  },
  ORPHANED: {
    title: 'Orphaned / Deleted',
    shortLabel: 'Orphaned',
    description: 'Previously active virtual machines no longer present in recent source syncs, kept as historical records.',
    searchPlaceholder: 'Search VM name...',
  },
  ARCHIVED: {
    title: 'Archived Inventory',
    shortLabel: 'Archived',
    description: 'Virtual machine records archived from the active inventory and retained for reference.',
    searchPlaceholder: 'Search archived VM...',
  },
};

export default function VmPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const initialView = searchParams.get('view') as InventoryView | null;
  const [activeView, setActiveView] = useState<InventoryView>(initialView && ['PENDING', 'ACTIVE', 'ORPHANED', 'ARCHIVED'].includes(initialView) ? initialView : 'ACTIVE');
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [environment, setEnvironment] = useState<VmInventoryEnvironment | ''>(() => {
    const value = searchParams.get('environment');
    return value === 'PROD' || value === 'UAT' || value === 'TEST' ? value : '';
  });
  const [sourceId, setSourceId] = useState(() => searchParams.get('sourceId') ?? '');
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get('page') ?? '1'), 1));
  const [pageSize, setPageSize] = useState(() => Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 10), 200));
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') ?? 'updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc');
  
  // Dialog functionality state
  const [selectedDiscovery, setSelectedDiscovery] = useState<VmDiscoveryItem | null>(null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [openingPendingId, setOpeningPendingId] = useState<string | null>(null);

  const updateUrl = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const vmQuery = useQuery({
    queryKey: ['vm-data', activeView, page, pageSize, searchTerm, environment, sourceId, sortBy, sortDir],
    queryFn: async () => {
      const commonQuery = {
        page,
        limit: pageSize,
        q: searchTerm.trim() || undefined,
        environment: environment || undefined,
        sourceId: sourceId || undefined,
        sortBy,
        sortDir,
      } as const;
      const [discoveryRecords, inventoryRecords] = await Promise.all([
        getVmDiscoveries({ ...commonQuery, view: 'PENDING' }),
        getVmInventory({
          ...commonQuery,
          view: activeView === 'PENDING' ? 'ACTIVE' : activeView,
          includeArchived: activeView === 'ARCHIVED',
        }),
      ]);
      return { discoveries: discoveryRecords, inventory: inventoryRecords };
    },
  });
  const vmData = vmQuery.data;
  const isLoading = vmQuery.isLoading;
  const refetch = vmQuery.refetch;

  const discoveries = vmData?.discoveries.data ?? [];
  const inventory = vmData?.inventory.data ?? [];

  useEffect(() => {
    setHeader({
      title: 'Virtual Machines',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Compute' },
        { label: 'Virtual Machines' },
      ],
    });
  }, [setHeader]);

  const openPendingSetup = useCallback(async (id: string) => {
    try {
      setOpeningPendingId(id);
      const discovery = await getVmDiscovery(id);
      setSelectedDiscovery(discovery);
      setPendingDialogOpen(true);
    } catch {
      toast.error('Failed to open VM setup');
    } finally {
      setOpeningPendingId(null);
    }
  }, []);

  const openInventoryDetail = useCallback((id: string) => {
    router.push(`/dashboard/virtual-machines/${id}`);
  }, [router]);

  const pendingQueue = useMemo(() => discoveries, [discoveries]);
  const activeQueue = useMemo(() => inventory, [inventory]);
  const orphanedQueue = useMemo(() => inventory, [inventory]);
  const archivedQueue = useMemo(() => inventory, [inventory]);
  const selectedQueue = activeView === 'PENDING'
    ? pendingQueue
    : activeView === 'ACTIVE'
      ? activeQueue
      : activeView === 'ORPHANED'
        ? orphanedQueue
        : archivedQueue;
  const queryState = useInventoryQueryState(vmQuery, {
    hasData: vmData !== undefined,
    hasRecords: selectedQueue.length > 0,
    isFiltered: Boolean(searchTerm.trim()) || Boolean(environment) || Boolean(sourceId) || activeView !== 'ACTIVE',
  });

  const handleViewChange = useCallback((view: InventoryView) => {
    setActiveView(view);
    setPage(1);
    updateUrl({ view, page: '1' });
  }, [updateUrl]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
    updateUrl({ q: value.trim() || undefined, page: '1' });
  }, [updateUrl]);

  const handleEnvironmentChange = useCallback((value: string) => {
    const nextEnvironment: VmInventoryEnvironment | '' = value === 'PROD' || value === 'UAT' || value === 'TEST' ? value : '';
    setEnvironment(nextEnvironment);
    setPage(1);
    updateUrl({ environment: nextEnvironment || undefined, page: '1' });
  }, [updateUrl]);

  const handlePageChange = useCallback((nextPage: number) => {
    const normalizedPage = Math.max(nextPage, 1);
    setPage(normalizedPage);
    updateUrl({ page: String(normalizedPage) });
  }, [updateUrl]);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    updateUrl({ limit: String(nextPageSize), page: '1' });
  }, [updateUrl]);

  const handleSortChange = useCallback((nextSortBy: string, nextSortDir: 'asc' | 'desc') => {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setPage(1);
    updateUrl({ sortBy: nextSortBy, sortDir: nextSortDir, page: '1' });
  }, [updateUrl]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveVmInventory(id);
      toast.success('VM archived successfully');
      void refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to archive VM');
    }
  }, [refetch]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      await restoreVmInventory(id);
      toast.success('VM restored successfully');
      void refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to restore VM');
    }
  }, [refetch]);

  useEffect(() => {
    for (const vm of inventory) {
      void router.prefetch(`/dashboard/virtual-machines/${vm.id}`);
    }
  }, [inventory, router]);

  const stats = useMemo(() => {
    const counts: VmViewCounts | undefined = vmData?.inventory.viewCounts;
    return {
      ACTIVE: counts?.active ?? 0,
      PENDING: counts?.pending ?? 0,
      ORPHANED: counts?.orphaned ?? 0,
      ARCHIVED: counts?.archived ?? 0,
    };
  }, [vmData?.inventory.viewCounts]);
  const selectedPage: VmListResponse<VmInventoryItem | VmDiscoveryItem> | undefined = activeView === 'PENDING'
    ? vmData?.discoveries
    : vmData?.inventory;

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
            <Monitor className="h-3.5 w-3.5" />
            Compute & Virtualization Inventory
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">Manage virtual instances across vCenter sources</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={() => router.push('/dashboard/virtual-machines/sources')}>
             <Server className="h-4 w-4 mr-2" />
             Manage vCenter Sources
           </Button>
        </div>
      </div>

      <InventoryQueryStateView
        state={queryState.state}
        hasStaleData={queryState.hasStaleData}
        onRetry={() => void refetch()}
        loadingLabel="Loading virtual machine data…"
        emptyState={
          <EmptyState
            icon={Monitor}
            title={`No ${VIEW_COPY[activeView].shortLabel.toLowerCase()} VMs yet`}
            description="No virtual machines are available in this inventory view yet."
          />
        }
        filteredEmptyState={
          <EmptyState
            icon={Monitor}
            title="No virtual machines found"
            description="No virtual machines match your current search or view."
          />
        }
      >
      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-md">
        {isLoading ? (
           <div className="p-20 flex flex-col items-center justify-center text-muted-foreground">
             <LoaderCircle className="h-8 w-8 animate-spin mb-4 text-primary" />
             <p>Loading virtual machine data...</p>
           </div>
        ) : (
          <>
            {activeView === 'PENDING' ? (
              <PendingTable data={pendingQueue} onOpen={openPendingSetup} openingId={openingPendingId} searchTerm={searchTerm} onSearchChange={handleSearchChange} view={activeView} setView={handleViewChange} stats={stats} page={selectedPage?.page ?? page} pageSize={selectedPage?.limit ?? pageSize} total={selectedPage?.total ?? 0} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} sortBy={sortBy} sortDir={sortDir} onSortChange={handleSortChange} environment={environment} onEnvironmentChange={handleEnvironmentChange} />
            ) : activeView === 'ACTIVE' ? (
              <ActiveTable data={activeQueue} onOpen={openInventoryDetail} onArchive={user?.role === 'ADMIN' ? handleArchive : undefined} searchTerm={searchTerm} onSearchChange={handleSearchChange} view={activeView} setView={handleViewChange} stats={stats} page={selectedPage?.page ?? page} pageSize={selectedPage?.limit ?? pageSize} total={selectedPage?.total ?? 0} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} sortBy={sortBy} sortDir={sortDir} onSortChange={handleSortChange} environment={environment} onEnvironmentChange={handleEnvironmentChange} />
            ) : activeView === 'ORPHANED' ? (
              <OrphanedTable data={orphanedQueue} onOpen={openInventoryDetail} searchTerm={searchTerm} onSearchChange={handleSearchChange} view={activeView} setView={handleViewChange} stats={stats} page={selectedPage?.page ?? page} pageSize={selectedPage?.limit ?? pageSize} total={selectedPage?.total ?? 0} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} sortBy={sortBy} sortDir={sortDir} onSortChange={handleSortChange} environment={environment} onEnvironmentChange={handleEnvironmentChange} />
            ) : (
              <OrphanedTable data={archivedQueue} archived onRestore={user?.role === 'ADMIN' ? handleRestore : undefined} onOpen={openInventoryDetail} searchTerm={searchTerm} onSearchChange={handleSearchChange} view={activeView} setView={handleViewChange} stats={stats} page={selectedPage?.page ?? page} pageSize={selectedPage?.limit ?? pageSize} total={selectedPage?.total ?? 0} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} sortBy={sortBy} sortDir={sortDir} onSortChange={handleSortChange} environment={environment} onEnvironmentChange={handleEnvironmentChange} />
            )}
          </>
        )}
      </Card>
      </InventoryQueryStateView>

      {pendingDialogOpen && (
        <VmFormDialog
          open={pendingDialogOpen}
          onOpenChange={setPendingDialogOpen}
          discoveryVm={selectedDiscovery}
          submitMode="promote"
          onPromoted={(inventoryDetail) => router.push(`/dashboard/virtual-machines/${inventoryDetail.id}`)}
          onSuccess={() => void refetch()}
        />
      )}
    </motion.div>
  );
}

// -------------------------------------------------------------
// Shared Sub-Components
// -------------------------------------------------------------

function getPowerStateBadge(state: string) {
  if (state === 'RUNNING') return <Badge variant="outline" className="bg-success/10 text-success border-success/20 uppercase text-[10px] font-bold">Running</Badge>;
  if (state === 'SUSPENDED') return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 uppercase text-[10px] font-bold">Suspended</Badge>;
  return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 uppercase text-[10px] font-bold">{state || 'Unknown'}</Badge>;
}

type VmTableControls = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortDir: 'asc' | 'desc') => void;
  environment: string;
  onEnvironmentChange: (environment: string) => void;
};

function TableHeaderToolbar({ table, view, setView, stats, searchTerm, onSearchChange, sortBy, sortDir, onSortChange, environment, onEnvironmentChange }: { table: any, view: InventoryView, setView: (v: InventoryView) => void, stats: any, searchTerm: string, onSearchChange: (v: string) => void } & Pick<VmTableControls, 'sortBy' | 'sortDir' | 'onSortChange' | 'environment' | 'onEnvironmentChange'>) {
  const handleExport = () => {
    const dataToExport = table.getRowModel().rows.map((row: any) => row.original);

    let exportData: any[] = [];
    
    if (view === 'PENDING') {
      exportData = dataToExport.map((vm: any) => ({
        VMName: vm.name,
        SystemName: vm.systemName || '',
        IPAddress: vm.primaryIp || '',
        Source: vm.sourceName,
        Cluster: vm.cluster || '',
        Host: vm.host,
        GuestOS: vm.guestOs || '',
        CPUCores: vm.cpuCores || '',
        MemoryGB: vm.memoryGb || '',
        StorageGB: vm.storageGb || '',
        NetworkLabel: vm.networkLabel || '',
        PowerState: vm.powerState,
        vCenterId: vm.externalId || vm.moid || '',
        Tags: (vm.tags || []).join('; '),
        SuggestedOwner: vm.suggestedOwner || vm.owner || '',
        SuggestedEnvironment: vm.suggestedEnvironment || vm.environment || '',
        Notes: vm.notes || vm.note || vm.description || '',
      }));
    } else {
      exportData = dataToExport.map((vm: any) => ({
        SystemName: vm.systemName || vm.displayName || '',
        VMName: vm.name,
        IPAddress: vm.primaryIp || '',
        vCenter: vm.vcenterName || vm.sourceName || '',
        Environment: vm.environment || '',
        Cluster: vm.cluster || '',
        Host: vm.host || '',
        GuestOS: vm.guestOs || '',
        CPUCores: vm.cpuCores || '',
        MemoryGB: vm.memoryGb || '',
        StorageGB: vm.storageGb || '',
        NetworkLabel: vm.networkLabel || '',
        PowerState: vm.powerState,
        Lifecycle: vm.lifecycleState || '',
        SyncStatus: vm.syncState || '',
        Owner: vm.owner || '',
        BusinessUnit: vm.businessUnit || '',
        SLATier: vm.slaTier || '',
        ServiceRole: vm.serviceRole || '',
        Criticality: vm.criticality || '',
        Tags: (vm.tags || []).join('; '),
        Description: vm.description || vm.notes || '',
      }));
    }

    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(exportData[0]).join(',');
    const csvRows = exportData.map(row => 
      Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    );
    
    const BOM = "\uFEFF";
    const csvString = BOM + [headers, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const fileName = `VMs_${view}_Export_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`;
    
    link.href = url;
    link.setAttribute('download', fileName);
    link.download = fileName;
    
    document.body.appendChild(link);
    
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    link.dispatchEvent(event);

    void api.post('/audit-logs/export', {
      resource: `virtual-machines:${view.toLowerCase()}`,
      count: exportData.length,
      query: searchTerm.trim() || undefined,
    }).catch(() => undefined);

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 200);

    toast.success(`Exported ${exportData.length} ${view.toLowerCase()} items from this page`);
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-muted/80 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: View Tabs */}
      <div className="no-scrollbar flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1">
        {(
          [
            { key: 'ACTIVE', label: VIEW_COPY.ACTIVE.shortLabel, icon: CheckCircle2, iconClassName: 'text-success' },
            { key: 'PENDING', label: VIEW_COPY.PENDING.shortLabel, icon: Clock3, iconClassName: 'text-warning' },
            { key: 'ORPHANED', label: VIEW_COPY.ORPHANED.shortLabel, icon: AlertTriangle, iconClassName: 'text-critical' },
            { key: 'ARCHIVED', label: VIEW_COPY.ARCHIVED.shortLabel, icon: Archive, iconClassName: 'text-muted-foreground' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            aria-pressed={view === tab.key}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              view === tab.key 
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <tab.icon className={cn("h-3.5 w-3.5", view === tab.key ? tab.iconClassName : "text-muted-foreground")} />
            {tab.label}
            <Badge variant="neutral" className="ml-1 h-4 px-1 font-mono text-[9px] bg-muted/50">
              {stats[tab.key]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Right: Search & Actions */}
      <div className="flex w-full items-center gap-2 lg:w-auto">
        <div className="relative min-w-0 flex-1 lg:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={VIEW_COPY[view].searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full pl-9 bg-card border-border/50 focus-visible:ring-primary/20 lg:w-64"
          />
        </div>

        <select
          aria-label="Filter by environment"
          value={environment}
          onChange={(event) => onEnvironmentChange(event.target.value)}
          className="h-9 rounded-md border border-border/50 bg-card px-2 text-xs text-foreground"
        >
          <option value="">All environments</option>
          <option value="PROD">PROD</option>
          <option value="UAT">UAT</option>
          <option value="TEST">TEST</option>
        </select>
        <select
          aria-label="Sort VM inventory"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value, sortDir)}
          className="h-9 rounded-md border border-border/50 bg-card px-2 text-xs text-foreground"
        >
          <option value="updatedAt">Recently updated</option>
          <option value="systemName">System name</option>
          <option value="name">VM name</option>
          <option value="primaryIp">IP address</option>
          <option value="environment">Environment</option>
          <option value="sourceName">Source</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 bg-card px-3"
          onClick={() => onSortChange(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${sortDir === 'asc' ? 'descending' : 'ascending'}`}
        >
          {sortDir === 'asc' ? 'A–Z' : 'Z–A'}
        </Button>
        <Button variant="outline" size="sm" className="h-9 shrink-0 bg-card px-3" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card" aria-label="Toggle Columns">
              <Columns className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllColumns().filter((c: any) => c.getCanHide()).map((column: any) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize cursor-pointer"
                checked={column.getIsVisible()}
                onCheckedChange={(val) => column.toggleVisibility(!!val)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function TablePaginationFooter({ page, pageSize, total, onPageChange, onPageSizeChange }: Pick<VmTableControls, 'page' | 'pageSize' | 'total' | 'onPageChange' | 'onPageSizeChange'>) {
  return (
    <InventoryPagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={[10, 20, 50, 100, 200]}
      className="bg-muted/10 p-3 sm:p-4"
    />
  );
}

// -------------------------------------------------------------
// PENDING TABLE
// -------------------------------------------------------------
function PendingTable({ data, onOpen, openingId, searchTerm, onSearchChange, view, setView, stats, page, pageSize, total, onPageChange, onPageSizeChange, sortBy, sortDir, onSortChange, environment, onEnvironmentChange }: any) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  const columns = useMemo<ColumnDef<VmDiscoveryItem>[]>(() => [
    {
      accessorKey: 'name',
      header: "Discovered VM Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-success">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'primaryIp', header: "IP Address", cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70 tabular-nums">{getValue() as string}</span> },
    { accessorKey: 'sourceName', header: "Source", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'host', header: "Host", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'powerState', header: "Power Status", cell: ({ getValue }) => getPowerStateBadge(getValue() as string) },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="secondary" className="h-8 shadow-none" onClick={() => onOpen(row.original.id)} disabled={openingId === row.original.id}>
            {openingId === row.original.id ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Setup
          </Button>
        </div>
      )
    }
  ], [openingId, onOpen]);

  const table = useReactTable({
    data, columns, state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <TableHeaderToolbar table={table} view={view} setView={setView} stats={stats} searchTerm={searchTerm} onSearchChange={onSearchChange} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} environment={environment} onEnvironmentChange={onEnvironmentChange} />
      <div className="overflow-x-auto">
        <Table className="min-w-[780px]">
          <TableHeader className="bg-transparent">
            {table.getHeaderGroups().map((hg: any) => (
              <TableRow key={hg.id} className="border-border hover:bg-transparent">
                {hg.headers.map((h: any) => <TableHead key={h.id} className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row: any) => (
              <TableRow key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                {row.getVisibleCells().map((cell: any) => <TableCell key={cell.id} className="py-1.5 px-3 text-[12px] text-foreground align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>)}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-96 p-0 border-none bg-transparent">
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={Server}
                      title="No pending VMs"
                      description={data.length === 0
                        ? "There are no pending virtual machines discovered on your vCenter sources."
                        : "No pending virtual machines match your current search criteria."
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
      <TablePaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </>
  );
}

// -------------------------------------------------------------
// ACTIVE TABLE
// -------------------------------------------------------------
function ActiveTable({ data, onOpen, onArchive, searchTerm, onSearchChange, view, setView, stats, page, pageSize, total, onPageChange, onPageSizeChange, sortBy, sortDir, onSortChange, environment, onEnvironmentChange }: any) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  const columns = useMemo<ColumnDef<VmInventoryItem>[]>(() => [
    {
      accessorKey: 'systemName',
      header: "System Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-success/20 bg-success/10 text-success">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{row.original.systemName}</span>
        </div>
      )
    },
    { accessorKey: 'name', header: "VM Name", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'primaryIp', header: "IP Address", cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70 tabular-nums">{getValue() as string}</span> },
    {
      id: 'specs',
      header: "Specs (CPU/RAM/Storage)",
      cell: ({ row }) => (
        <span className="font-mono text-xs opacity-75 tabular-nums">
          {row.original.cpuCores} vCPU / {row.original.memoryGb} GB / {row.original.storageGb} GB
        </span>
      )
    },
    {
      accessorKey: 'environment',
      header: "Env",
      cell: ({ getValue }) => <EnvironmentBadge value={getValue()} className="text-[10px] font-bold px-1.5 py-0" />
    },
    {
      accessorKey: 'guestOs',
      header: "Guest OS",
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground truncate max-w-[120px] block" title={getValue() as string}>{getValue() as string}</span>
    },
    { accessorKey: 'vcenterName', header: "Source", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'powerState', header: "Power Status", cell: ({ getValue }) => getPowerStateBadge(getValue() as string) },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-right">
          <Button size="sm" variant="ghost" className="h-8 shadow-none" onClick={(e) => { e.stopPropagation(); onOpen(row.original.id); }}>Details</Button>
          {onArchive && (
            <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={(e) => { e.stopPropagation(); void onArchive(row.original.id); }}>
              <Archive className="mr-1 h-3.5 w-3.5" /> Archive
            </Button>
          )}
        </div>
      )
    }
  ], [onOpen, onArchive]);

  const table = useReactTable({
    data, columns, state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <TableHeaderToolbar table={table} view={view} setView={setView} stats={stats} searchTerm={searchTerm} onSearchChange={onSearchChange} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} environment={environment} onEnvironmentChange={onEnvironmentChange} />
      <div className="overflow-x-auto">
        <Table className="min-w-[1120px]">
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-border/50 hover:bg-transparent">
                {hg.headers.map(h => <TableHead key={h.id} className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow 
                key={row.id} 
                className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onOpen(row.original.id)}
              >
                {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="py-1.5 px-3 text-[12px]">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-96 p-0 border-none bg-transparent">
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={Server}
                      title="No active VMs found"
                      description={data.length === 0
                        ? "You haven't promoted any virtual machines to active inventory yet."
                        : "No active virtual machines match your current search criteria."
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
      <TablePaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </>
  );
}

// -------------------------------------------------------------
// ORPHANED TABLE
// -------------------------------------------------------------
function OrphanedTable({ data, archived = false, onRestore, onOpen, searchTerm, onSearchChange, view, setView, stats, page, pageSize, total, onPageChange, onPageSizeChange, sortBy, sortDir, onSortChange, environment, onEnvironmentChange }: any) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'displayName',
      header: "System Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-critical/20 bg-critical/10 text-critical">
            {archived ? <Archive className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          </div>
          <span className="font-semibold text-foreground line-through opacity-60 group-hover:opacity-100 transition-opacity">{row.original.displayName || row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'name', header: "VM Name", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'primaryIp', header: "IP Address", cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70 tabular-nums">{getValue() as string}</span> },
    { accessorKey: 'sourceName', header: "Source", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'lastSeen', header: "Last Seen", cell: ({ getValue }) => <span className="text-xs text-muted-foreground whitespace-nowrap">{getValue() as string}</span> },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 text-right">
          <Button size="sm" variant="ghost" className="h-8 text-critical" onClick={(e) => { e.stopPropagation(); onOpen(row.original.id); }}>{archived ? 'Details' : 'Review'}</Button>
          {archived && onRestore && (
            <Button size="sm" variant="ghost" className="h-8 text-primary" onClick={(e) => { e.stopPropagation(); void onRestore(row.original.id); }}>
              <ArchiveRestore className="mr-1 h-3.5 w-3.5" /> Restore
            </Button>
          )}
        </div>
      )
    }
  ], [onOpen, onRestore, archived]);

  const table = useReactTable({
    data, columns, state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <TableHeaderToolbar table={table} view={view} setView={setView} stats={stats} searchTerm={searchTerm} onSearchChange={onSearchChange} sortBy={sortBy} sortDir={sortDir} onSortChange={onSortChange} environment={environment} onEnvironmentChange={onEnvironmentChange} />
      <div className="overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-border/50 hover:bg-transparent">
                {hg.headers.map(h => <TableHead key={h.id} className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow 
                key={row.id} 
                className="group border-border/40 hover:bg-rose-500/5 transition-colors cursor-pointer"
                onClick={() => onOpen(row.original.id)}
              >
                {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="py-1.5 px-3 text-[12px]">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-96 p-0 border-none bg-transparent">
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={Server}
                      title={archived ? 'No archived VMs found' : 'No orphaned VMs found'}
                      description={data.length === 0
                        ? archived ? "No virtual machines have been archived from active inventory." : "No orphaned or missing virtual machines detected in your sources."
                        : archived ? "No archived virtual machines match your current search criteria." : "No orphaned virtual machines match your current search criteria."
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
      <TablePaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </>
  );
}
