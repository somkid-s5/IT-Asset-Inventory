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
import { useQuery } from '@tanstack/react-query';
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
    { label: 'All', value: 'ALL', icon: Box, iconClassName: 'text-primary' },
    { label: 'Production', value: 'PROD', icon: ShieldCheck, iconClassName: 'text-emerald-500' },
    { label: 'Testing', value: 'TEST', icon: FlaskConical, iconClassName: 'text-amber-500' },
    { label: 'Development', value: 'DEV', icon: Code2, iconClassName: 'text-sky-500' },
  ];

export default function DbPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [activeEnvironment, setActiveEnvironment] = useState<'ALL' | DatabaseEnvironment>('ALL');
  
  const { data: databases = [], isLoading, refetch } = useQuery({
    queryKey: ['databases'],
    queryFn: async () => {
      const response = await api.get<DatabaseInventoryItem[]>('/databases');
      return response.data;
    },
  });

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

  useEffect(() => {
    setHeader({
      title: 'Databases',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Databases' },
      ],
    });
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
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="Database Name" />,
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
      header: ({ column }) => <SortableHeader column={column} title="Type" />,
      cell: ({ getValue }) => <span className="text-[12px] font-medium text-muted-foreground">{getValue() as string}</span>
    },
    {
      accessorKey: 'version',
      header: "Version",
      cell: ({ getValue }) => <span className="text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'environment',
      header: "Environment",
      cell: ({ getValue }) => {
        const env = getValue() as DatabaseEnvironment;
        const variants: any = { PROD: 'danger', UAT: 'warning', TEST: 'warning', DEV: 'neutral' };
        return <Badge variant={variants[env] || 'neutral'} className="uppercase tracking-wider">{env}</Badge>;
      }
    },
    {
      accessorKey: 'host',
      header: ({ column }) => <SortableHeader column={column} title="Host" />,
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'ipAddress',
      header: "IP Address",
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'accountsCount',
      header: "Accounts",
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
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/dashboard/databases/${db.id}`)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                   className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
                   onClick={() => setDeleteTarget(db)}
                >
                  Delete Database
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
      toast.success('Database deleted successfully');
      setDeleteTarget(null);
      void refetch();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = filteredData.map(db => ({
      Name: db.name,
      Engine: db.engine,
      Version: db.version || '',
      Environment: db.environment || '',
      Host: db.host || '',
      IP: db.ipAddress || '',
      Port: db.port || '',
      ServiceName: db.serviceName || '',
      Owner: db.owner || '',
      BackupPolicy: db.backupPolicy || '',
      Replication: db.replication || '',
      LinkedApps: (db.linkedApps || []).join('; '),
      MaintenanceWindow: db.maintenanceWindow || '',
      Status: db.status || '',
      Notes: db.note || '',
      Accounts: db.accountsCount,
    }));

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
    const fileName = `Databases_Export_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`;
    
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

    toast.success('Exported all items in current view');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Database className="h-3.5 w-3.5" />
            Relational Database Inventory
          </h2>
          <p className="text-xs text-muted-foreground/60">Monitor and manage all database instances</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={handleExport}>
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
           <Button onClick={() => { setDatabaseToEdit(null); setDialogOpen(true); }} className="h-9 shadow-lg shadow-primary/20">
             <Plus className="h-4 w-4 mr-2" />
             Add Database
           </Button>
        </div>
      </div>

      <Card className="border-2 border-border shadow-md bg-card overflow-hidden p-0 gap-0 rounded-[24px]">
        <div className="p-4 border-b-2 border-border bg-muted/80 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                placeholder="Search name, host, IP..."
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
                <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize cursor-pointer"
                    checked={column.getIsVisible()}
                    onCheckedChange={(val) => column.toggleVisibility(!!val)}
                  >
                    {column.id === 'name' ? 'Database Name' : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4 border-b-2 border-border">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow 
                    key={row.id} 
                    className="group border-b border-border hover:bg-muted/50 transition-colors cursor-pointer data-[state=selected]:bg-muted"
                    onClick={() => router.push(`/dashboard/databases/${row.original.id}`)}
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
                     No database records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
          <div className="flex-1 text-xs text-muted-foreground">
            Total {table.getFilteredRowModel().rows.length} items
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">Rows per page</p>
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
      </Card>

      <DatabaseFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setDatabaseToEdit(null); }}
        databaseToEdit={databaseToEdit}
        onSuccess={() => void refetch()}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Database</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete database <span className="font-bold text-foreground">{deleteTarget?.name}</span> and all associated accounts?
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Delete
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
