'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown, ArrowUp, Box, ChevronsUpDown, Code2,
  Database, FlaskConical, LoaderCircle, Pencil, Plus,
  Search, ShieldCheck, Columns, ChevronLeft,
  ChevronRight, MoreHorizontal, Download, Archive, ArchiveRestore
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
import { EmptyState } from '@/components/EmptyState';
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
  Column,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fadeInUp } from '@/lib/animations';
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
    { label: 'Production', value: 'PROD', icon: ShieldCheck, iconClassName: 'text-success' },
    { label: 'Testing', value: 'TEST', icon: FlaskConical, iconClassName: 'text-warning' },
    { label: 'Development', value: 'DEV', icon: Code2, iconClassName: 'text-info' },
  ];

export default function DbPage() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setMounted(true);
  }, []);
  const initialEnvironment = searchParams.get('environment') as DatabaseEnvironment | null;
  const [showArchived, setShowArchived] = useState(() => searchParams.get('archived') === 'true');
  const [activeEnvironment, setActiveEnvironment] = useState<'ALL' | DatabaseEnvironment>(initialEnvironment && ['PROD', 'TEST', 'DEV'].includes(initialEnvironment) ? initialEnvironment : 'ALL');

  const { data: databases = [], isLoading, refetch } = useQuery({
    queryKey: ['databases', showArchived],
    queryFn: async () => {
      const response = await api.get<DatabaseInventoryItem[]>('/databases', {
        params: { includeArchived: showArchived ? 'true' : undefined },
      });
      return response.data;
    },
  });

  useEffect(() => {
    for (const database of databases) {
      void router.prefetch(`/dashboard/databases/${database.id}`);
    }
  }, [databases, router]);

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
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');

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
    let result = showArchived ? databases : databases.filter((database) => database.status !== 'ARCHIVED');
    if (activeEnvironment !== 'ALL') {
      result = result.filter(d => d.environment === activeEnvironment);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => {
        const matchesName = d.name?.toLowerCase().includes(term);
        const matchesEngine = d.engine?.toLowerCase().includes(term);
        const matchesVersion = d.version?.toLowerCase().includes(term);
        const matchesEnv = d.environment?.toLowerCase().includes(term);
        const matchesHost = d.host?.toLowerCase().includes(term);
        const matchesIp = d.ipAddress?.toLowerCase().includes(term);
        const matchesPort = d.port?.toString().includes(term);
        const matchesStatus = d.status?.toLowerCase().includes(term);

        return (
          matchesName ||
          matchesEngine ||
          matchesVersion ||
          matchesEnv ||
          matchesHost ||
          matchesIp ||
          matchesPort ||
          matchesStatus
        );
      });
    }

    return result;
  }, [databases, activeEnvironment, searchTerm, showArchived]);
  const hasActiveDatabaseFilter = Boolean(searchTerm.trim()) || activeEnvironment !== 'ALL' || showArchived;

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
          <Link
            href={`/dashboard/databases/${row.original.id}`}
            aria-label={`View details for ${row.original.name}`}
            className="truncate font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
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
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70 tabular-nums">{(getValue() as string) || '--'}</span>
    },
    {
      id: 'connection',
      header: "IP & Port",
      cell: ({ row }) => {
        const ip = row.original.ipAddress || '--';
        const port = row.original.port;
        return <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{port ? `${ip}:${port}` : ip}</span>;
      }
    },
    {
      accessorKey: 'status',
      header: "Status",
      cell: ({ getValue }) => {
        const status = (getValue() as string) || 'ACTIVE';
        const active = status === 'ACTIVE';
        return (
          <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", active ? "bg-success/10 text-success border-success/20" : "bg-muted/10 text-muted-foreground border-border/20")}>
            {status}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'accountsCount',
      header: "Accounts",
      cell: ({ getValue }) => <span className="text-[12px] font-semibold pl-2 tabular-nums">{getValue() as number}</span>
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const db = row.original;
        const isWritable = mounted && !loading && (user?.role === 'ADMIN' || user?.role === 'EDITOR');
        const isAdmin = mounted && !loading && user?.role === 'ADMIN';
        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {isWritable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                onClick={() => handleEdit(db.id)}
                aria-label="Edit Database"
              >
                {loadingEditId === db.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Database Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/dashboard/databases/${db.id}`)}>
                  View Details
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                       className={cn('cursor-pointer', db.status === 'ARCHIVED' ? 'text-primary focus:text-primary focus:bg-primary/5' : 'text-destructive focus:text-destructive focus:bg-destructive/5')}
                       onClick={() => setDeleteTarget(db)}
                    >
                      {db.status === 'ARCHIVED' ? 'Restore Database' : 'Archive Database'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ], [loadingEditId, router, user, loading, mounted]);

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
      if (deleteTarget.status === 'ARCHIVED') {
        await api.patch(`/databases/${deleteTarget.id}/restore`);
        toast.success('Database restored successfully');
      } else {
        await api.patch(`/databases/${deleteTarget.id}/archive`);
        toast.success('Database archived successfully');
      }
      setDeleteTarget(null);
      void refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to ${deleteTarget.status === 'ARCHIVED' ? 'restore' : 'archive'} database`);
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

    void api.post('/audit-logs/export', {
      resource: 'databases',
      count: exportData.length,
      query: searchTerm.trim() || undefined,
    }).catch(() => undefined);

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 200);

    toast.success('Exported all items in current view');
  };

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
            <Database className="h-3.5 w-3.5" />
            Relational Database Inventory
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">Monitor and manage all database instances</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           {mounted && !loading && user?.role === 'ADMIN' && (
             <Button
               variant={showArchived ? 'secondary' : 'outline'}
               size="sm"
               className="h-9 shadow-sm bg-card"
               onClick={() => setShowArchived((value) => !value)}
               aria-pressed={showArchived}
             >
               {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
               {showArchived ? 'Active Databases' : 'Archived Databases'}
             </Button>
           )}
           <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={handleExport}>
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
           {mounted && !loading && (user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
             <Button onClick={() => { setDatabaseToEdit(null); setDialogOpen(true); }} className="h-9 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4 mr-2" />
               Add Database
             </Button>
           )}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-md">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/80 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1">
            {ENVIRONMENT_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveEnvironment(tab.value)}
                aria-pressed={activeEnvironment === tab.value}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  activeEnvironment === tab.value
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeEnvironment === tab.value ? tab.iconClassName : "text-muted-foreground")} />
                {tab.label}
                <Badge variant="neutral" className="ml-1 h-4 px-1 font-mono text-[9px] bg-muted/50">
                  {countsByEnvironment[tab.value]}
                </Badge>
              </button>
            ))}
          </div>

          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="relative min-w-0 flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search databases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9 bg-card border-border/50 focus-visible:ring-primary/20 md:w-64"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card" aria-label="Toggle Columns">
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
          <Table className="min-w-[980px]">
            <TableHeader className="bg-transparent">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                      <TableCell key={cell.id} className="py-1.5 px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-96 p-0 border-none bg-transparent">
                    <div className="flex items-center justify-center h-full">
                      <EmptyState
                        icon={Database}
                        title="No databases found"
                        description={!hasActiveDatabaseFilter && databases.length === 0
                          ? "You haven't added any database records yet. Start by adding your first database."
                          : showArchived ? "No archived databases match your current search or environment filter." : "No databases match your current search or filter criteria."
                        }
                        action={!hasActiveDatabaseFilter && databases.length === 0 && mounted && !loading && (user?.role === 'ADMIN' || user?.role === 'EDITOR') ? {
                          label: "Add Your First Database",
                          onClick: () => { setDatabaseToEdit(null); setDialogOpen(true); }
                        } : undefined}
                        className="w-full max-w-md border-none bg-transparent"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/50 bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="text-xs text-muted-foreground">
            Total {table.getFilteredRowModel().rows.length} items
          </div>
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-6 lg:gap-8">
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
              <Button variant="outline" className="h-8 w-8 p-0" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {dialogOpen && (
        <DatabaseFormDialog
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setDatabaseToEdit(null); }}
          databaseToEdit={databaseToEdit}
          onSuccess={() => void refetch()}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
          <DialogTitle className={deleteTarget?.status === 'ARCHIVED' ? 'text-primary' : 'text-destructive'}>
            {deleteTarget?.status === 'ARCHIVED' ? 'Restore Database' : 'Archive Database'}
          </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Are you sure you want to {deleteTarget?.status === 'ARCHIVED' ? 'restore' : 'archive'} database <span className="font-bold text-foreground">{deleteTarget?.name}</span> and keep all associated accounts?
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant={deleteTarget?.status === 'ARCHIVED' ? 'default' : 'destructive'} onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm {deleteTarget?.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SortableHeader<TData, TValue>({ column, title }: { column: Column<TData, TValue>, title: string }) {
  return (
    <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 hover:text-foreground transition-colors group">
      {title}
      {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ChevronsUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />}
    </button>
  );
}
