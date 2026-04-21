'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { 
  ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, 
  Database, FolderTree, HardDrive, LoaderCircle, 
  Pencil, Plus, Search, Server, Shield, Trash2, 
  Box, Columns, ChevronLeft, ChevronRight as ChevronRightIcon,
  CheckCircle2, MoreHorizontal, Download, Filter, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { AssetFormDialog } from '@/components/LazyLoadedDialogs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AssetsTableSkeleton } from '@/components/Skeletons';
import { 
  DropdownMenu, DropdownMenuCheckboxItem, 
  DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';

type AssetType = 'SERVER' | 'STORAGE' | 'SWITCH' | 'SP' | 'NETWORK';

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
}

interface Asset {
  id: string;
  assetId?: string | null;
  name: string;
  type: AssetType;
  ipAllocations?: AssetIpAllocation[];
  rack?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  children?: Asset[];
}

const TABS: { label: string; value: 'ALL' | AssetType; icon: typeof Box; iconClassName: string }[] = [
  { label: 'ทั้งหมด', value: 'ALL', icon: Box, iconClassName: 'text-primary' },
  { label: 'เซิร์ฟเวอร์', value: 'SERVER', icon: Server, iconClassName: 'text-emerald-500' },
  { label: 'พื้นที่เก็บข้อมูล', value: 'STORAGE', icon: Database, iconClassName: 'text-sky-500' },
  { label: 'สวิตช์', value: 'SWITCH', icon: Shield, iconClassName: 'text-amber-500' },
];

function getAssetIcon(type: AssetType) {
  const className = 'h-4 w-4';
  switch (type) {
    case 'STORAGE': return <Database className={className} />;
    case 'SWITCH': return <Shield className={className} />;
    case 'SP': return <HardDrive className={className} />;
    case 'NETWORK': return <FolderTree className={className} />;
    default: return <Server className={className} />;
  }
}

export default function AssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | AssetType>('ALL');

  // Dialog functionality state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null);

  // Tanstack Table States
  const [sorting, setSorting] = useState<SortingState>([{ id: 'assetId', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState({});

  async function loadAssets() {
    try {
      setLoading(true);
      const response = await api.get<Asset[]>('/assets');
      setAssets(response.data);
    } catch {
      toast.error('ไม่สามารถโหลดสินทรัพย์ได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  const filteredData = useMemo(() => {
    if (activeTab === 'ALL') return assets;
    return assets.filter(a => a.type === activeTab);
  }, [assets, activeTab]);

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="เลือกทั้งหมด"
          className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="เลือกแถว"
          className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'assetId',
      header: ({ column }) => <SortableHeader column={column} title="รหัสสินทรัพย์" />,
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2" style={{ paddingLeft: `${row.depth * 1}rem` }}>
          {row.getCanExpand() ? (
            <button
              onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-transform"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", row.getIsExpanded() && "rotate-90")} />
            </button>
          ) : <div className="w-5" />}
          <span className="font-mono text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
            {(getValue() as string) || '--'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="ชื่อสินทรัพย์" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground">
            {getAssetIcon(row.original.type)}
          </div>
          <span className="truncate font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: "ประเภท",
      cell: ({ getValue }) => {
        const type = getValue() as AssetType;
        const labels: Record<AssetType, string> = { SERVER: 'Server', STORAGE: 'Storage', SWITCH: 'Switch', SP: 'SP', NETWORK: 'Network' };
        return <Badge variant="outline" className="font-medium bg-muted/20">{labels[type]}</Badge>;
      }
    },
    {
      accessorKey: 'rack',
      header: "Rack",
      cell: ({ getValue }) => <span className="font-mono text-xs opacity-70">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'sn',
      header: "Serial Number",
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{(getValue() as string) || '--'}</span>
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original;
        return (user?.role === 'ADMIN' || user?.role === 'EDITOR') ? (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => openEditDialog(asset.id)}
            >
              {loadingEditId === asset.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/dashboard/assets/${asset.id}`)}>
                  ดูรายละเอียด
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                   className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
                   onClick={() => setAssetPendingDelete(asset)}
                >
                  ลบสินทรัพย์
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null;
      }
    }
  ], [user, loadingEditId]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
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

  const confirmDeleteAsset = async () => {
    if (!assetPendingDelete) return;
    setDeletingId(assetPendingDelete.id);
    try {
      await api.delete(`/assets/${assetPendingDelete.id}`);
      toast.success('ลบสินทรัพย์สำเร็จ');
      setAssetPendingDelete(null);
      void loadAssets();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && assets.length === 0) return <AssetsTableSkeleton />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="workspace-page p-6 space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">รายการสินทรัพย์</h1>
          <p className="text-muted-foreground mt-1 text-sm">จัดการอุปกรณ์ฮาร์ดแวร์และโครงสร้างพื้นฐานทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card">
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
           {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <Button onClick={() => { setEditingAsset(undefined); setDialogOpen(true); }} className="h-9 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มสินทรัพย์
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                  activeTab === tab.value 
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.value ? tab.iconClassName : "text-muted-foreground/50")} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="ค้นหาตามชื่อ, IP, SN..."
                value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
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
                {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize cursor-pointer"
                    checked={column.getIsVisible()}
                    onCheckedChange={(val) => column.toggleVisibility(!!val)}
                  >
                    {column.id === 'assetId' ? 'รหัสสินทรัพย์' : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow 
                    key={row.id} 
                    className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/assets/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                       <Box className="h-8 w-8 opacity-20" />
                       <p>ไม่พบรายการที่ค้นหา</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
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
              หน้า {table.getState().pagination.pageIndex + 1} จาก {table.getPageCount()}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Asset Form Dialog */}
      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assetToEdit={editingAsset}
        onSuccess={loadAssets}
        availableParents={assets.map(a => ({ id: a.id, name: a.name, type: a.type }))}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!assetPendingDelete} onOpenChange={(open) => !open && setAssetPendingDelete(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
               <AlertTriangle className="h-5 w-5" />
               ยืนยันการลบ
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              คุณกำลังจะลบสินทรัพย์ <span className="font-bold text-foreground">{assetPendingDelete?.name}</span>
              <br />การดำเนินการนี้ไม่สามารถย้อนกลับได้ และข้อมูลที่เกี่ยวข้องจะถูกลบทิ้งถาวร
            </p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setAssetPendingDelete(null)}>ยกเลิก</Button>
             <Button variant="destructive" onClick={confirmDeleteAsset} disabled={!!deletingId}>
               {deletingId ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
               ยืนยันการลบ
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SortableHeader({ column, title }: { column: any, title: string }) {
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
