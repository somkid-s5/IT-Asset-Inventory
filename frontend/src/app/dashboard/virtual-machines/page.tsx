'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, 
  CheckCircle2, Clock3, Monitor, RefreshCw, Search, Server, 
  ChevronLeft, ChevronRight, Columns, Download, ShieldAlert,
  LoaderCircle, Plus, Box
} from 'lucide-react';
import { toast } from 'sonner';
import { VmFormDialog } from '@/components/LazyLoadedDialogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type VmDiscoveryItem, type VmInventoryItem } from '@/lib/vm-inventory';
import { getVmDiscoveries, getVmDiscovery, getVmInventory, getVmSources } from '@/services/vm';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, getFilteredRowModel, useReactTable,
  ColumnDef, SortingState, ColumnFiltersState, VisibilityState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

type InventoryView = 'PENDING' | 'ACTIVE' | 'ORPHANED';

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
};

export default function VmPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [activeView, setActiveView] = useState<InventoryView>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog functionality state
  const [selectedDiscovery, setSelectedDiscovery] = useState<VmDiscoveryItem | null>(null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [openingPendingId, setOpeningPendingId] = useState<string | null>(null);

  const { data: vmData, isLoading, refetch } = useQuery({
    queryKey: ['vm-data'],
    queryFn: async () => {
      const [discoveryRecords, inventoryRecords] = await Promise.all([
        getVmDiscoveries(),
        getVmInventory(),
      ]);
      return { discoveries: discoveryRecords, inventory: inventoryRecords };
    },
  });

  const discoveries = vmData?.discoveries ?? [];
  const inventory = vmData?.inventory ?? [];

  useEffect(() => {
    setHeader({
      title: 'Virtual Machines',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Compute' },
        { label: 'Virtual Machines' },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const openPendingSetup = async (id: string) => {
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
  };

  const pendingQueue = useMemo(() => discoveries.filter(vm => vm.state !== 'DRIFTED'), [discoveries]);
  const activeQueue = useMemo(() => inventory.filter(vm => vm.lifecycleState === 'ACTIVE' && vm.syncState !== 'Missing from source'), [inventory]);
  const orphanedQueue = useMemo(() => inventory.filter(vm => vm.syncState === 'Missing from source' || vm.lifecycleState === 'DELETED_IN_VCENTER'), [inventory]);

  const stats = useMemo(() => ({
    ACTIVE: activeQueue.length,
    PENDING: pendingQueue.length,
    ORPHANED: orphanedQueue.length,
  }), [activeQueue.length, pendingQueue.length, orphanedQueue.length]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5" />
            Compute & Virtualization Inventory
          </h2>
          <p className="text-xs text-muted-foreground/60">Manage virtual instances across vCenter sources</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={() => router.push('/dashboard/virtual-machines/sources')}>
             <Server className="h-4 w-4 mr-2" />
             Manage vCenter Sources
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        {isLoading ? (
           <div className="p-20 flex flex-col items-center justify-center text-muted-foreground">
             <LoaderCircle className="h-8 w-8 animate-spin mb-4 text-primary" />
             <p>Loading virtual machine data...</p>
           </div>
        ) : (
          <>
            {activeView === 'PENDING' ? (
              <PendingTable data={pendingQueue} onOpen={openPendingSetup} openingId={openingPendingId} searchTerm={searchTerm} onSearchChange={setSearchTerm} view={activeView} setView={setActiveView} stats={stats} />
            ) : activeView === 'ACTIVE' ? (
              <ActiveTable data={activeQueue} onOpen={(id) => router.push(`/dashboard/virtual-machines/${id}`)} searchTerm={searchTerm} onSearchChange={setSearchTerm} view={activeView} setView={setActiveView} stats={stats} />
            ) : (
              <OrphanedTable data={orphanedQueue} onOpen={(id) => router.push(`/dashboard/virtual-machines/${id}`)} searchTerm={searchTerm} onSearchChange={setSearchTerm} view={activeView} setView={setActiveView} stats={stats} />
            )}
          </>
        )}
      </Card>

      <VmFormDialog
        open={pendingDialogOpen}
        onOpenChange={setPendingDialogOpen}
        discoveryVm={selectedDiscovery}
        submitMode="promote"
        onPromoted={(inventoryDetail) => router.push(`/dashboard/virtual-machines/${inventoryDetail.id}`)}
        onSuccess={() => void refetch()}
      />
    </motion.div>
  );
}

// -------------------------------------------------------------
// Shared Sub-Components
// -------------------------------------------------------------

function getPowerStateBadge(state: string) {
  if (state === 'RUNNING') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase text-[10px] font-bold">Running</Badge>;
  if (state === 'SUSPENDED') return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[10px] font-bold">Suspended</Badge>;
  return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 uppercase text-[10px] font-bold">{state || 'Unknown'}</Badge>;
}

function TableHeaderToolbar({ table, view, setView, stats, searchTerm, onSearchChange }: { table: any, view: InventoryView, setView: (v: InventoryView) => void, stats: any, searchTerm: string, onSearchChange: (v: string) => void }) {
  const handleExport = () => {
    const dataToExport = table.getFilteredRowModel().rows.map((row: any) => row.original);

    let exportData: any[] = [];
    
    if (view === 'PENDING') {
      exportData = dataToExport.map(vm => ({
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
      exportData = dataToExport.map(vm => ({
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
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 200);

    toast.success(`Exported all ${view.toLowerCase()} items`);
  };

  return (
    <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: View Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit shrink-0">
        {(
          [
            { key: 'ACTIVE', label: VIEW_COPY.ACTIVE.shortLabel, icon: CheckCircle2, iconClassName: 'text-emerald-500' },
            { key: 'PENDING', label: VIEW_COPY.PENDING.shortLabel, icon: Clock3, iconClassName: 'text-amber-500' },
            { key: 'ORPHANED', label: VIEW_COPY.ORPHANED.shortLabel, icon: AlertTriangle, iconClassName: 'text-rose-500' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
              view === tab.key 
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <tab.icon className={cn("h-3.5 w-3.5", view === tab.key ? tab.iconClassName : "text-muted-foreground/50")} />
            {tab.label}
            <Badge variant="neutral" className="ml-1 h-4 px-1 font-mono text-[9px] bg-muted/50">
              {stats[tab.key]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Right: Search & Actions */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder={VIEW_COPY[view].searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 w-64 bg-card border-border/50 focus-visible:ring-primary/20"
          />
        </div>

        <Button variant="outline" size="sm" className="h-9 bg-card px-3" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-card">
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

function TablePaginationFooter({ table }: { table: any }) {
  return (
    <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
      <div className="flex-1 text-xs text-muted-foreground">
        Total {table.getFilteredRowModel().rows.length} items
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">Rows per page</p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="h-8 w-16 rounded-md border border-border bg-card text-[11px] focus:ring-1 focus:ring-primary outline-none"
          >
            {[10, 20, 30, 40, 50].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-xs font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// PENDING TABLE
// -------------------------------------------------------------
function PendingTable({ data, onOpen, openingId, searchTerm, onSearchChange, view, setView, stats }: any) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  const columns = useMemo<ColumnDef<VmDiscoveryItem>[]>(() => [
    {
      accessorKey: 'name',
      header: "Discovered VM Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-emerald-500">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'primaryIp', header: "IP Address", cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{getValue() as string}</span> },
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
    data, columns, state: { sorting, globalFilter: searchTerm, columnVisibility },
    onSortingChange: setSorting, onGlobalFilterChange: onSearchChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <TableHeaderToolbar table={table} view={view} setView={setView} stats={stats} searchTerm={searchTerm} onSearchChange={onSearchChange} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-border/50 hover:bg-transparent">
                {hg.headers.map(h => <TableHead key={h.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="py-3 px-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Box className="h-8 w-8 opacity-20 mx-auto" />
                    <p>No pending virtual machines</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePaginationFooter table={table} />
    </>
  );
}

// -------------------------------------------------------------
// ACTIVE TABLE
// -------------------------------------------------------------
function ActiveTable({ data, onOpen, searchTerm, onSearchChange, view, setView, stats }: any) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  const columns = useMemo<ColumnDef<VmInventoryItem>[]>(() => [
    {
      accessorKey: 'systemName',
      header: "System Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{row.original.systemName}</span>
        </div>
      )
    },
    { accessorKey: 'name', header: "VM Name", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'primaryIp', header: "IP Address", cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{getValue() as string}</span> },
    { accessorKey: 'vcenterName', header: "Source", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'powerState', header: "Power Status", cell: ({ getValue }) => getPowerStateBadge(getValue() as string) },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); onOpen(row.original.id); }}>Details</Button>
        </div>
      )
    }
  ], [onOpen]);

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter: searchTerm, columnVisibility },
    onSortingChange: setSorting, onGlobalFilterChange: onSearchChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <TableHeaderToolbar table={table} view={view} setView={setView} stats={stats} searchTerm={searchTerm} onSearchChange={onSearchChange} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-border/50 hover:bg-transparent">
                {hg.headers.map(h => <TableHead key={h.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
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
                {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="py-3 px-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Box className="h-8 w-8 opacity-20 mx-auto" />
                    <p>No active virtual machines</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePaginationFooter table={table} />
    </>
  );
}

// -------------------------------------------------------------
// ORPHANED TABLE
// -------------------------------------------------------------
function OrphanedTable({ data, onOpen, searchTerm, onSearchChange, view, setView, stats }: any) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'displayName',
      header: "System Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground line-through opacity-60 group-hover:opacity-100 transition-opacity">{row.original.displayName || row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'name', header: "VM Name", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'primaryIp', header: "IP Address", cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{getValue() as string}</span> },
    { accessorKey: 'sourceName', header: "Source", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'lastSeen', header: "Last Seen", cell: ({ getValue }) => <span className="text-xs text-muted-foreground whitespace-nowrap">{getValue() as string}</span> },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="ghost" className="h-8 text-rose-500" onClick={(e) => { e.stopPropagation(); onOpen(row.original.id); }}>Review</Button>
        </div>
      )
    }
  ], [onOpen]);

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter: searchTerm, columnVisibility },
    onSortingChange: setSorting, onGlobalFilterChange: onSearchChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <TableHeaderToolbar table={table} view={view} setView={setView} stats={stats} searchTerm={searchTerm} onSearchChange={onSearchChange} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="border-border/50 hover:bg-transparent">
                {hg.headers.map(h => <TableHead key={h.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
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
                {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="py-3 px-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Box className="h-8 w-8 opacity-20 mx-auto" />
                    <p>No orphaned records found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePaginationFooter table={table} />
    </>
  );
}
