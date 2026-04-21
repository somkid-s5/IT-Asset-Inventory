'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, 
  CheckCircle2, Clock3, Monitor, RefreshCw, Search, Server, 
  ChevronLeft, ChevronRight, Columns, Download, ShieldAlert
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

type InventoryView = 'PENDING' | 'ACTIVE' | 'ORPHANED';

const VIEW_COPY: Record<InventoryView, { title: string; shortLabel: string; description: string; searchPlaceholder: string; }> = {
  PENDING: {
    title: 'รอดำเนินการตั้งค่า',
    shortLabel: 'รอดำเนินการ',
    description: 'เครื่องเสมือนที่ค้นพบใหม่ซึ่งยังต้องการข้อมูลทางธุรกิจก่อนเข้าสู่สินค้าคงคลังที่ใช้งานอยู่',
    searchPlaceholder: 'ค้นหาด้วยชื่อ VM, ที่อยู่ IP, หรือแหล่งข้อมูล...',
  },
  ACTIVE: {
    title: 'สินค้าคงคลังที่ใช้งาน',
    shortLabel: 'ใช้งาน',
    description: 'ระเบียนเครื่องเสมือนที่พร้อมใช้งานซึ่งได้รับการยกระดับและจัดการภายใน AssetOps แล้ว',
    searchPlaceholder: 'ค้นหาด้วยชื่อ VM, ชื่อระบบ, เจ้าของ, หรือแหล่งข้อมูล...',
  },
  ORPHANED: {
    title: 'ถูกยกเลิก',
    shortLabel: 'ถูกยกเลิก',
    description: 'เครื่องเสมือนที่เคยใช้งานอยู่ซึ่งไม่ปรากฏในการซิงค์แหล่งข้อมูลล่าสุดและถูกเก็บเป็นบันทึกประวัติศาสตร์',
    searchPlaceholder: 'ค้นหาด้วยชื่อ VM, แหล่งข้อมูล, หรือปัญหา...',
  },
};

export default function VmPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [activeView, setActiveView] = useState<InventoryView>('ACTIVE');
  const [discoveries, setDiscoveries] = useState<VmDiscoveryItem[]>([]);
  const [inventory, setInventory] = useState<VmInventoryItem[]>([]);
  const [selectedDiscovery, setSelectedDiscovery] = useState<VmDiscoveryItem | null>(null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [openingPendingId, setOpeningPendingId] = useState<string | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [lastSyncLabel, setLastSyncLabel] = useState('--');
  const [loading, setLoading] = useState(true);

  const loadVmData = async () => {
    try {
      setLoading(true);
      const [sources, discoveryRecords, inventoryRecords] = await Promise.all([
        getVmSources(),
        getVmDiscoveries(),
        getVmInventory(),
      ]);
      setDiscoveries(discoveryRecords);
      setInventory(inventoryRecords);
      setSourceCount(sources.length);
      setLastSyncLabel(`${sources[0]?.lastSyncAt ?? '--'} from ${sources.length} sources`);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูล VM ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadVmData(); }, []);

  useEffect(() => {
    setHeader({
      title: 'เครื่องเสมือน (VM)',
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'คอมพิวต์' },
        { label: 'เครื่องเสมือน' },
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
      toast.error('ไม่สามารถเปิดการตั้งค่า VM ได้');
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
      className="workspace-page p-6 space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">เครื่องเสมือน (VM)</h1>
          <p className="text-muted-foreground mt-1 text-sm">จัดการ Lifecycle และสถานะของ Virtual Machines ทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={() => router.push('/dashboard/vm/sources')}>
             <Server className="h-4 w-4 mr-2" />
             จัดการ vCenters
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {(
              [
                { key: 'ACTIVE', label: VIEW_COPY.ACTIVE.shortLabel, icon: CheckCircle2, iconClassName: 'text-emerald-500' },
                { key: 'PENDING', label: VIEW_COPY.PENDING.shortLabel, icon: Clock3, iconClassName: 'text-amber-500' },
                { key: 'ORPHANED', label: VIEW_COPY.ORPHANED.shortLabel, icon: AlertTriangle, iconClassName: 'text-rose-500' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                  activeView === tab.key 
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeView === tab.key ? tab.iconClassName : "text-muted-foreground/50")} />
                {tab.label}
                <Badge variant="neutral" className="ml-1 h-4 px-1 font-mono text-[9px] bg-muted/50">
                  {stats[tab.key]}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
           <div className="p-10 flex flex-col items-center justify-center text-muted-foreground">
             <RefreshCw className="h-6 w-6 animate-spin mb-4" />
             <p>กำลังโหลดข้อมูล...</p>
           </div>
        ) : activeView === 'PENDING' ? (
          <PendingTable data={pendingQueue} onOpen={openPendingSetup} openingId={openingPendingId} />
        ) : activeView === 'ACTIVE' ? (
          <ActiveTable data={activeQueue} onOpen={(id) => router.push(`/dashboard/vm/${id}`)} />
        ) : (
          <OrphanedTable data={orphanedQueue} onOpen={(id) => router.push(`/dashboard/vm/${id}`)} />
        )}
      </Card>

      <VmFormDialog
        open={pendingDialogOpen}
        onOpenChange={setPendingDialogOpen}
        discoveryVm={selectedDiscovery}
        submitMode="promote"
        onPromoted={(inventoryDetail) => router.push(`/dashboard/vm/${inventoryDetail.id}`)}
        onSuccess={() => void loadVmData()}
      />
    </motion.div>
  );
}

// -------------------------------------------------------------
// Reusable Shared Table Components & Hooks
// -------------------------------------------------------------

function getPowerStateBadge(state: string) {
  if (state === 'RUNNING') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase">Running</Badge>;
  if (state === 'SUSPENDED') return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase">Suspended</Badge>;
  return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50 uppercase">{state || 'Unknown'}</Badge>;
}

function GlobalTableToolbar({ table, searchPlaceholder }: { table: any, searchPlaceholder: string }) {
  return (
    <div className="p-4 border-b border-border/50 bg-background/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder={searchPlaceholder}
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="h-9 pl-9 w-64 bg-card border-border/50 focus-visible:ring-primary/20"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-card">
              <Columns className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuLabel>แสดงคอลัมน์</DropdownMenuLabel>
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

function GlobalTablePagination({ table }: { table: any }) {
  return (
    <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
      <div className="flex-1 text-xs text-muted-foreground">
        เลือกแล้ว {table.getFilteredSelectedRowModel().rows.length} จาก {table.getFilteredRowModel().rows.length} รายการ
      </div>
      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">แถวต่อหน้า</p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="h-8 w-16 rounded-md border border-border bg-card text-xs focus:ring-1 focus:ring-primary outline-none"
          >
            {[10, 20, 30, 40, 50].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-xs font-medium">
          หน้า {table.getState().pagination.pageIndex + 1} จาก {table.getPageCount() || 1}
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
function PendingTable({ data, onOpen, openingId }: { data: VmDiscoveryItem[], onOpen: (id: string) => void, openingId: string | null }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  const columns = useMemo<ColumnDef<VmDiscoveryItem>[]>(() => [
    {
      accessorKey: 'name',
      header: "ชื่อ VM ที่ค้นพบ",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-emerald-500">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'primaryIp', header: "ที่อยู่ IP", cell: ({ getValue }) => <span className="font-mono text-xs opacity-70">{getValue() as string}</span> },
    { accessorKey: 'sourceName', header: "แหล่งข้อมูล", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'host', header: "โฮสต์", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'powerState', header: "สถานะการทำงาน", cell: ({ getValue }) => getPowerStateBadge(getValue() as string) },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="secondary" className="h-8 shadow-none" onClick={() => onOpen(row.original.id)} disabled={openingId === row.original.id}>
            {openingId === row.original.id ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            ตั้งค่า
          </Button>
        </div>
      )
    }
  ], [openingId, onOpen]);

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <GlobalTableToolbar table={table} searchPlaceholder="ค้นหา VM ที่รอตั้งค่า..." />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30"><TableRow className="border-border/50 hover:bg-transparent">{table.getHeaderGroups()[0].headers.map(h => <TableHead key={h.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className="border-border/40 hover:bg-muted/30 transition-colors"><TableCell colSpan={6} className="p-0"><div className="flex w-full items-center"><div className="flex-1 flex">{row.getVisibleCells().map(cell => <div key={cell.id} className={cn("py-3 px-4 flex items-center", cell.column.id === 'actions' ? 'ml-auto justify-end' : 'flex-1')}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}</div></div></TableCell></TableRow>
            )) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">ไม่มีระเบียนรอดำเนินการ</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <GlobalTablePagination table={table} />
    </>
  );
}

// -------------------------------------------------------------
// ACTIVE TABLE
// -------------------------------------------------------------
function ActiveTable({ data, onOpen }: { data: VmInventoryItem[], onOpen: (id: string) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  const columns = useMemo<ColumnDef<VmInventoryItem>[]>(() => [
    {
      accessorKey: 'systemName',
      header: "ชื่อระบบ",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpen(row.original.id)}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <Monitor className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground hover:text-primary transition-colors">{row.original.systemName}</span>
        </div>
      )
    },
    { accessorKey: 'name', header: "ชื่อ VM", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'primaryIp', header: "ที่อยู่ IP", cell: ({ getValue }) => <span className="font-mono text-xs opacity-70">{getValue() as string}</span> },
    { accessorKey: 'vcenterName', header: "แหล่งข้อมูล", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'powerState', header: "สถานะพลังงาน", cell: ({ getValue }) => getPowerStateBadge(getValue() as string) },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => onOpen(row.original.id)}>รายละเอียด</Button>
        </div>
      )
    }
  ], [onOpen]);

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <GlobalTableToolbar table={table} searchPlaceholder="ค้นหา VM ที่ใช้งาน..." />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30"><TableRow className="border-border/50 hover:bg-transparent">{table.getHeaderGroups()[0].headers.map(h => <TableHead key={h.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className="border-border/40 hover:bg-muted/30 transition-colors"><TableCell colSpan={6} className="p-0"><div className="flex w-full items-center"><div className="flex-1 flex">{row.getVisibleCells().map(cell => <div key={cell.id} className={cn("py-3 px-4 flex items-center", cell.column.id === 'actions' ? 'ml-auto justify-end' : 'flex-1')}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}</div></div></TableCell></TableRow>
            )) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">ไม่พบสินค้าคงคลังที่ใช้งาน</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <GlobalTablePagination table={table} />
    </>
  );
}

// -------------------------------------------------------------
// ORPHANED TABLE
// -------------------------------------------------------------
function OrphanedTable({ data, onOpen }: { data: any[], onOpen: (id: string) => void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'displayName',
      header: "ชื่อระบบ",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onOpen(row.original.id)}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground line-through opacity-60 hover:opacity-100 transition-opacity">{row.original.displayName || row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'name', header: "ชื่อ VM", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'primaryIp', header: "ที่อยู่ IP", cell: ({ getValue }) => <span className="font-mono text-xs opacity-70">{getValue() as string}</span> },
    { accessorKey: 'sourceName', header: "แหล่งข้อมูล", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'lastSeen', header: "พบเห็นล่าสุด", cell: ({ getValue }) => <span className="text-xs text-muted-foreground whitespace-nowrap">{getValue() as string}</span> },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="ghost" className="h-8 text-rose-500" onClick={() => onOpen(row.original.id)}>ตรวจสอบ</Button>
        </div>
      )
    }
  ], [onOpen]);

  const table = useReactTable({
    data, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <>
      <GlobalTableToolbar table={table} searchPlaceholder="ค้นหา VM ที่ถูกยกเลิก..." />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30"><TableRow className="border-border/50 hover:bg-transparent">{table.getHeaderGroups()[0].headers.map(h => <TableHead key={h.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className="border-border/40 hover:bg-rose-500/5 transition-colors"><TableCell colSpan={6} className="p-0"><div className="flex w-full items-center"><div className="flex-1 flex">{row.getVisibleCells().map(cell => <div key={cell.id} className={cn("py-3 px-4 flex items-center", cell.column.id === 'actions' ? 'ml-auto justify-end' : 'flex-1')}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}</div></div></TableCell></TableRow>
            )) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">ไม่มี VM ที่ถูกยกเลิก</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <GlobalTablePagination table={table} />
    </>
  );
}
