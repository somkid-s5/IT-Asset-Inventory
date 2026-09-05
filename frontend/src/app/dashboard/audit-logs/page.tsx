'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { fadeInUp } from '@/lib/animations';
import { AccessDenied } from '@/components/access-denied';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';

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
  user: UserInfo | null;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function actionClasses(action: string) {
  if (action.includes('DELETE')) return 'bg-destructive/10 text-destructive border-destructive/20';
  if (action.includes('VIEW') || action.includes('LOGIN')) return 'bg-primary/10 text-primary border-primary/20';
  if (action.includes('CREATE')) return 'bg-success/10 text-success border-success/20';
  return 'bg-warning/10 text-warning border-warning/20';
}

function ActionBadge({ action }: { action: string }) {
  const label = action || 'UNKNOWN';
  return <Badge variant="outline" className={`text-[10px] font-bold tracking-tight ${actionClasses(label)}`}>{label}</Badge>;
}

function LogDetailsDialog({ details }: { details: string }) {
  let formattedDetails = details;
  try {
    formattedDetails = JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    // Keep plain text details as-is.
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="max-w-[320px] truncate rounded-md p-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title="Click to view full details"
        >
          {details}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>Full details and metadata for this audit event.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-x-auto overflow-y-auto rounded-xl bg-muted p-4">
          <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">{formattedDetails}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableHeader({ column, title }: { column: any; title: string }) {
  const direction = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(direction === 'asc')}
      className="group flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors hover:text-foreground"
    >
      {title}
      {direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : direction === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />}
    </button>
  );
}

function SummaryTile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <Card className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-black tracking-tight">{value.toLocaleString()}</p>
      </div>
    </Card>
  );
}

function LogIdentity({ user }: { user: UserInfo | null }) {
  if (!user) return <span className="text-xs italic text-muted-foreground">System / Deleted User</span>;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar seed={user.avatarSeed} imageUrl={user.avatarImage} label={user.displayName} className="h-7 w-7 rounded-lg" />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{user.displayName}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">@{user.username}</p>
      </div>
    </div>
  );
}

function MobileLogCard({ log }: { log: AuditLogRecord }) {
  const timestamp = formatTimestamp(log.timestamp);
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <ActionBadge action={log.action} />
        <time className="text-right text-[10px] text-muted-foreground">
          <span className="block font-semibold">{timestamp.date}</span>
          <span>{timestamp.time}</span>
        </time>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">User</p>
          <LogIdentity user={log.user} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">IP Address</p>
          <p className="truncate font-mono text-xs">{log.ipAddress || '--'}</p>
        </div>
      </div>
      <div className="mt-3 border-t border-border/50 pt-3">
        <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Details</p>
        {log.details ? <LogDetailsDialog details={log.details} /> : <span className="text-xs italic text-muted-foreground">No details</span>}
      </div>
    </article>
  );
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const { data: logs = [], isLoading: loading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.get('/audit-logs');
      const responseData = response.data as any;
      return (responseData.data || responseData) as AuditLogRecord[];
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  useEffect(() => {
    setHeader({
      title: 'Audit Logs',
      breadcrumbs: [{ label: 'Workspace', href: '/dashboard' }, { label: 'Audit Logs' }],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const columns = useMemo<ColumnDef<AuditLogRecord>[]>(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => <SortableHeader column={column} title="Date & Time" />,
      cell: ({ getValue }) => {
        const timestamp = formatTimestamp(getValue() as string);
        return <div className="flex flex-col"><span className="text-xs font-semibold">{timestamp.date}</span><span className="text-[10px] text-muted-foreground">{timestamp.time}</span></div>;
      },
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => <LogIdentity user={row.original.user} />,
      filterFn: (row, _id, value) => {
        const recordUser = row.original.user;
        if (!recordUser) return false;
        return `${recordUser.displayName} ${recordUser.username}`.toLowerCase().includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'action',
      header: ({ column }) => <SortableHeader column={column} title="Action" />,
      cell: ({ getValue }) => <ActionBadge action={(getValue() as string) || 'UNKNOWN'} />,
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }) => row.original.details ? <LogDetailsDialog details={row.original.details} /> : <span className="text-xs italic text-muted-foreground">No details</span>,
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) || '--'}</span>,
    },
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
    globalFilterFn: (row, _columnId, filterValue) => {
      const recordUser = row.original.user;
      const userText = recordUser ? `${recordUser.displayName} ${recordUser.username}` : 'system';
      const searchText = `${userText} ${row.original.action || ''} ${row.original.details || ''} ${row.original.ipAddress || ''}`.toLowerCase();
      return searchText.includes(filterValue.toLowerCase());
    },
  });

  if (!user || user.role !== 'ADMIN') return <AccessDenied />;

  const today = new Date();
  const todayEvents = logs.filter((log) => {
    const date = new Date(log.timestamp);
    return date.toDateString() === today.toDateString();
  }).length;
  const deleteEvents = logs.filter((log) => log.action.includes('DELETE')).length;
  const uniqueActors = new Set(logs.map((log) => log.user?.username || 'system')).size;
  const filteredRows = table.getFilteredRowModel().rows;

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl"><Activity className="h-5 w-5 text-primary" />System Audit Logs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Monitor system activity and changes in one place.</p>
        </div>
        {globalFilter && (
          <Button variant="ghost" size="sm" onClick={() => setGlobalFilter('')} className="h-8 rounded-lg text-xs text-muted-foreground">
            <X className="mr-1.5 h-3.5 w-3.5" /> Clear search
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile icon={Activity} label="Total Events" value={logs.length} tone="bg-primary/10 text-primary" />
        <SummaryTile icon={Clock3} label="Today" value={todayEvents} tone="bg-info/10 text-info" />
        <SummaryTile icon={Trash2} label="Delete Events" value={deleteEvents} tone="bg-destructive/10 text-destructive" />
        <SummaryTile icon={Users} label="Unique Actors" value={uniqueActors} tone="bg-primary/10 text-primary" />
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs by user, action, or details..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="h-9 rounded-xl border-border/60 bg-card pl-9 text-xs"
            />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground">{filteredRows.length} matching events</p>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map((header) => <TableHead key={header.id} className="px-4 py-2.5 text-muted-foreground">{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length} className="h-32 text-center"><div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading logs...</div></TableCell></TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => <TableRow key={row.id} className="border-b border-border/60 transition-colors hover:bg-muted/40">{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="px-4 py-2.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)
              ) : (
                <TableRow><TableCell colSpan={columns.length} className="h-72 p-0"><EmptyState icon={ShieldAlert} title="No audit logs found" description={logs.length === 0 ? 'No system audit logs have been recorded yet.' : 'No audit logs match your current search criteria.'} className="border-none bg-transparent" /></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading logs...</div>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => <MobileLogCard key={row.id} log={row.original} />)
          ) : (
            <EmptyState icon={ShieldAlert} title="No audit logs found" description={logs.length === 0 ? 'No system audit logs have been recorded yet.' : 'No audit logs match your current search criteria.'} className="border-none bg-transparent" />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="text-muted-foreground">Showing {table.getRowModel().rows.length} of {filteredRows.length} records</div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <label htmlFor="audit-page-size" className="flex items-center gap-2 font-medium text-muted-foreground">Rows per page
              <select id="audit-page-size" aria-label="Rows per page" value={table.getState().pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))} className="h-8 w-16 rounded-lg border border-border bg-card px-2 text-xs outline-none focus:ring-1 focus:ring-primary">
                {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <span className="font-medium text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" aria-label="Previous page" className="h-8 w-8 rounded-lg p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" aria-label="Next page" className="h-8 w-8 rounded-lg p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
