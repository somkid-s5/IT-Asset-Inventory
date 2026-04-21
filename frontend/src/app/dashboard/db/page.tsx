'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { 
  ArrowDown, ArrowUp, Box, ChevronsUpDown, Code2, 
  Database, FlaskConical, LoaderCircle, Pencil, Plus, 
  Search, ShieldCheck, Trash2, Columns, ChevronLeft, 
  ChevronRight, MoreHorizontal, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatabaseFormDialog } from '@/components/LazyLoadedDialogs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DropdownMenu, DropdownMenuCheckboxItem, 
  DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  flexRender,
  getCoreRowModel,
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
import { type DatabaseEnvironment, type DatabaseInventoryDetail, type DatabaseInventoryItem } from '@/lib/database-inventory';
import api from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ENVIRONMENT_TABS: Array<{
  label: string;
  value: 'ALL' | DatabaseEnvironment;
  icon: typeof Box;
  iconClassName: string;
}> = [
    { label: 'ทั้งหมด', value: 'ALL', icon: Box, iconClassName: 'text-primary' },
    { label: 'Production', value: 'PROD', icon: ShieldCheck, iconClassName: 'text-emerald-500' },
    { label: 'ทดสอบ', value: 'TEST', icon: FlaskConical, iconClassName: 'text-amber-500' },
    { label: 'พัฒนา', value: 'DEV', icon: Code2, iconClassName: 'text-sky-500' },
  ];

export default function DbPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [databases, setDatabases] = useState<DatabaseInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEnvironment, setActiveEnvironment] = useState<'ALL' | DatabaseEnvironment>('ALL');
  
  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [databaseToEdit, setDatabaseToEdit] = useState<DatabaseInventoryDetail | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DatabaseInventoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  async function loadDatabases() {
    try {
      setLoading(true);
      const response = await api.get<DatabaseInventoryItem[]>('/databases');
      setDatabases(response.data);
    } catch {
      toast.error('ไม่สามารถโหลดฐานข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDatabases();
  }, []);

  useEffect(() => {
    setHeader({
      title: 'ฐานข้อมูล',
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'ฐานข้อมูล' },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const filteredData = useMemo(() => {
    if (activeEnvironment === 'ALL') return databases;
    return databases.filter(d => d.environment === activeEnvironment);
  }, [databases, activeEnvironment]);

  const countsByEnvironment = useMemo<Record<'ALL' | DatabaseEnvironment, number>>(() => ({
    ALL: databases.length,
    PROD: databases.filter(d => d.environment === 'PROD').length,
    TEST: databases.filter(d => d.environment === 'TEST').length,
    DEV: databases.filter(d => d.environment === 'DEV').length,
  }), [databases]);

  const columns = useMemo<ColumnDef<DatabaseInventoryItem>[]>(() => [
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
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="ชื่อฐานข้อมูล" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground">
            <Database className="h-4 w-4" />
          </div>
          <span className="truncate font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'engine',
      header: ({ column }) => <SortableHeader column={column} title="ประเภท" />,
      cell: ({ getValue }) => <span className="text-[12px] font-medium text-muted-foreground">{getValue() as string}</span>
    },
    {
      accessorKey: 'version',
      header: "เวอร์ชัน",
      cell: ({ getValue }) => <span className="text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'environment',
      header: "สภาพแวดล้อม",
      cell: ({ getValue }) => {
        const env = getValue() as DatabaseEnvironment;
        const variants: any = { PROD: 'danger', UAT: 'warning', TEST: 'warning', DEV: 'neutral' };
        return <Badge variant={variants[env] || 'neutral'} className="uppercase tracking-wider">{env}</Badge>;
      }
    },
    {
      accessorKey: 'host',
      header: ({ column }) => <SortableHeader column={column} title="โฮสต์" />,
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'ipAddress',
      header: "IP Address",
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'accountsCount',
      header: "บัญชี",
      cell: ({ getValue }) => <span className="text-[12px] font-semibold pl-2">{getValue() as number}</span>
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const db = row.original;
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => handleEdit(db.id)}
            >
              {loadingEditId === db.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/dashboard/db/${db.id}`)}>
                  ดูรายละเอียด
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                   className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
                   onClick={() => setDeleteTarget(db)}
                >
                  ลบฐานข้อมูล
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ], [loadingEditId]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleEdit = async (id: string) => {
    setLoadingEditId(id);
    try {
      const res = await api.get<DatabaseInventoryDetail>(`/databases/${id}`);
      setDatabaseToEdit(res.data);
      setDialogOpen(true);
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/databases/${deleteTarget.id}`);
      toast.success('ลบฐานข้อมูลเรียบร้อยแล้ว');
      setDeleteTarget(null);
      void loadDatabases();
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="workspace-page p-6 space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ระบบฐานข้อมูล</h1>
          <p className="text-muted-foreground mt-1 text-sm">จัดการเชื่อมต่อและบัญชีผู้ใช้งานสำหรับฐานข้อมูลทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card">
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
           <Button onClick={() => { setDatabaseToEdit(null); setDialogOpen(true); }} className="h-9 shadow-lg shadow-primary/20">
             <Plus className="h-4 w-4 mr-2" />
             เพิ่มฐานข้อมูล
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {ENVIRONMENT_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveEnvironment(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                  activeEnvironment === tab.value 
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeEnvironment === tab.value ? tab.iconClassName : "text-muted-foreground/50")} />
                {tab.label}
                <Badge variant="neutral" className="ml-1 h-4 px-1 font-mono text-[9px] bg-muted/50">
                  {countsByEnvironment[tab.value]}
                </Badge>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="ค้นหาชื่อ, โฮสต์, IP..."
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
                    {column.id === 'name' ? 'ชื่อฐานข้อมูล' : column.id}
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      <span className="text-sm">กำลังโหลด...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow 
                    key={row.id} 
                    className="group border-border/40 hover:bg-muted/30 transition-colors cursor-pointer data-[state=selected]:bg-muted"
                    onClick={() => router.push(`/dashboard/db/${row.original.id}`)}
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
                     ไม่มีข้อมูลฐานข้อมูล
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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
      </Card>

      <DatabaseFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setDatabaseToEdit(null); }}
        databaseToEdit={databaseToEdit}
        onSuccess={loadDatabases}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">ลบฐานข้อมูล</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            ลบฐานข้อมูล <span className="font-bold text-foreground">{deleteTarget?.name}</span> และบัญชีที่เชื่อมโยงทั้งหมดหรือไม่?
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
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
    <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 hover:text-foreground transition-colors group">
      {title}
      {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ChevronsUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />}
    </button>
  );
}
