'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, getFilteredRowModel, useReactTable,
  ColumnDef, SortingState, ColumnFiltersState
} from '@tanstack/react-table';
import {
  Activity, ArrowDown, ArrowUp, ChevronsUpDown, LoaderCircle,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserInfo {
  username: string;
  displayName: string;
  avatarSeed: string;
  avatarImage?: string | null;
}

interface AuditLogRecord {
  id: string;
  action: string;
  targetId: string | null;
  ipAddress: string | null;
  details: string | null;
  timestamp: string;
  user: UserInfo;
}

function SortableHeader({ column, title }: { column: any, title: string }) {
  return (
    <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 hover:text-foreground transition-colors group">
      {title}
      {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ChevronsUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />}
    </button>
  );
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    
    const loadLogs = async () => {
      try {
        const response = await api.get<AuditLogRecord[]>('/audit-logs');
        setLogs(response.data);
      } catch (error) {
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };
    
    void loadLogs();
  }, [user, router]);

  useEffect(() => {
    setHeader({
      title: 'Audit Logs',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Audit Logs' },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const columns = useMemo<ColumnDef<AuditLogRecord>[]>(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => <SortableHeader column={column} title="Date & Time" />,
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span className="text-[11px] text-muted-foreground">{date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'user',
      header: "User",
      cell: ({ row }) => {
        const u = row.original.user;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar seed={u.avatarSeed} imageUrl={u.avatarImage} label={u.displayName} className="h-8 w-8 rounded-lg shadow-sm" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{u.displayName}</span>
              <span className="text-[11px] font-mono text-muted-foreground">@{u.username}</span>
            </div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const user = row.original.user;
        return user.displayName.toLowerCase().includes(value.toLowerCase()) || 
               user.username.toLowerCase().includes(value.toLowerCase());
      }
    },
    {
      accessorKey: 'action',
      header: ({ column }) => <SortableHeader column={column} title="Action" />,
      cell: ({ getValue }) => {
        const action = getValue() as string;
        const colorClass = action.includes('DELETE') ? 'bg-destructive/10 text-destructive border-destructive/20' 
                         : action.includes('VIEW') || action.includes('LOGIN') ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                         : action.includes('CREATE') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                         : 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        return <Badge variant="outline" className={colorClass}>{action}</Badge>;
      }
    },
    {
      accessorKey: 'details',
      header: "Details",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate text-xs text-muted-foreground" title={row.original.details || 'N/A'}>
          {row.original.details || <span className="italic opacity-50">No details</span>}
        </div>
      )
    },
    {
      accessorKey: 'ipAddress',
      header: "IP Address",
      cell: ({ getValue }) => <span className="text-xs font-mono">{getValue() as string || '--'}</span>
    }
  ], []);

  const table = useReactTable({
    data: logs,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const u = row.original.user;
      const searchStr = `${u.displayName} ${u.username} ${row.original.action} ${row.original.details || ''}`.toLowerCase();
      return searchStr.includes(filterValue.toLowerCase());
    }
  });

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            System Audit Logs
          </h2>
          <p className="text-xs text-muted-foreground/60">Monitor all activities and changes in the system</p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search logs by user, action, or details..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 pl-9 w-64 md:w-80 bg-card border-border/50 focus-visible:ring-primary/20"
            />
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
                      <span className="text-sm">Loading logs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow 
                    key={row.id} 
                    className="group border-border/40 hover:bg-muted/30 transition-colors"
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
                     No logs match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
          <div className="flex-1 text-xs text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} records
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">Rows per page</p>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                className="h-8 w-16 rounded-md border border-border bg-card text-xs focus:ring-1 focus:ring-primary outline-none"
              >
                {[10, 20, 50, 100].map(size => (
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
    </motion.div>
  );
}
