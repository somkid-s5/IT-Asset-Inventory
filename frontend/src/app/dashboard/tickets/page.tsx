'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { ticketsService, Ticket, TicketPriority, TicketStatus } from '@/services/tickets';
import { useRouter } from 'next/navigation';
import {
  Ticket as TicketIcon, Plus, Search, Filter,
  MoreHorizontal, ChevronLeft, ChevronRight,
  Clock, CheckCircle2, AlertCircle, PlayCircle,
  ArrowUp, ArrowDown, ChevronsUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, getFilteredRowModel, useReactTable,
  ColumnDef, SortingState, VisibilityState
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AssetsTableSkeleton } from '@/components/Skeletons';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
};

export default function TicketsPage() {
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeTab, setActiveTab] = useState('my-active');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: ticketsService.findAll,
  });

  useEffect(() => {
    setHeader({
      title: 'Support Tickets',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Tickets & Requests' },
      ],
    });
  }, [setHeader]);

  const priorityColors: Record<TicketPriority, string> = {
    LOW: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse',
  };

  const statusIcons: Record<TicketStatus, any> = {
    OPEN: AlertCircle,
    IN_PROGRESS: PlayCircle,
    WAITING_FOR_CLIENT: Clock,
    RESOLVED: CheckCircle2,
    CLOSED: CheckCircle2,
  };

  const filteredData = useMemo(() => {
    const isActive = (status: TicketStatus) => !['RESOLVED', 'CLOSED'].includes(status);
    
    if (activeTab === 'my-active') {
      return tickets.filter(t => t.assigneeId === user?.id && isActive(t.status));
    }
    if (activeTab === 'active-pool') {
      return tickets.filter(t => isActive(t.status));
    }
    if (activeTab === 'completed') {
      return tickets.filter(t => !isActive(t.status));
    }
    if (activeTab === 'unassigned') {
      return tickets.filter(t => !t.assigneeId && isActive(t.status));
    }
    return tickets;
  }, [tickets, activeTab, user?.id]);

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'ticketNo',
      header: 'ID',
      cell: ({ row }) => {
        const isMine = row.original.assigneeId === user?.id;
        return (
          <div className="flex items-center gap-2">
            {isMine && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" title="Assigned to you" />}
            <span className={cn("font-mono text-xs font-bold", isMine ? "text-primary" : "text-muted-foreground/60")}>
              {row.original.ticketNo}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'title',
      header: 'Subject',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground truncate max-w-[300px]">
            {row.original.title}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Client: {row.original.client.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => {
        const priority = getValue() as TicketPriority;
        return (
          <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0", priorityColors[priority])}>
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as TicketStatus;
        const Icon = statusIcons[status];
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 opacity-70" />
            <span className="text-xs font-medium">{status.replace(/_/g, ' ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ row }) => {
        const assignee = row.original.assignee as any;
        const isMine = row.original.assigneeId === user?.id;
        return (
          <div className="flex items-center gap-2">
            <span className={cn("text-xs", isMine ? "font-bold text-primary" : "opacity-80")}>
              {isMine ? 'YOU' : (assignee?.displayName || '--')}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-[11px] opacity-60 font-medium">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors px-3 text-xs font-bold"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/tickets/${row.original.id}`);
            }}
          >
            MANAGE
          </Button>
        </div>
      ),
    },
  ], [router, user?.id]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) return <AssetsTableSkeleton />;

  const isActive = (status: TicketStatus) => !['RESOLVED', 'CLOSED'].includes(status);
  const myActive = tickets.filter(t => t.assigneeId === user?.id && isActive(t.status));
  const activePool = tickets.filter(t => isActive(t.status));
  const completed = tickets.filter(t => !isActive(t.status));
  const unassigned = tickets.filter(t => !t.assigneeId && isActive(t.status));
  const critical = tickets.filter(t => t.priority === 'CRITICAL' && isActive(t.status));

  const stats = [
    { 
      label: 'My Active Tasks', 
      value: myActive.length, 
      total: activePool.length,
      icon: TicketIcon, 
      color: 'text-primary',
      bg: 'bg-primary/5'
    },
    { 
      label: 'Open / Unassigned', 
      value: unassigned.length, 
      total: tickets.filter(t => t.status === 'OPEN').length,
      icon: AlertCircle, 
      color: 'text-orange-500',
      bg: 'bg-orange-500/5'
    },
    { 
      label: 'System Critical', 
      value: critical.filter(t => t.assigneeId === user?.id).length, 
      total: critical.length,
      icon: AlertCircle, 
      color: 'text-rose-500',
      bg: 'bg-rose-500/5'
    },
    { 
      label: 'Resolved / Closed', 
      value: completed.length, 
      total: tickets.length,
      icon: CheckCircle2, 
      color: 'text-success',
      bg: 'bg-success/5'
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Stats Cards with [My] / [Total] */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className={cn("p-5 border-2 border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden group hover:border-border transition-all", stat.bg)}>
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-3xl font-black font-display", stat.color)}>{stat.value}</span>
                    <span className="text-xs font-bold text-muted-foreground/40">/ {stat.total}</span>
                  </div>
                </div>
                <div className={cn("p-2 rounded-xl bg-background/50 border border-border shadow-inner", stat.color)}>
                  <stat.icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
              </div>
              <div className={cn("absolute -right-4 -bottom-4 h-16 w-16 opacity-5 blur-2xl rounded-full bg-current transition-all group-hover:opacity-10", stat.color)} />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-4 md:w-[600px] rounded-xl bg-muted/50 p-1 border border-border/50">
              <TabsTrigger value="my-active" className="rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                My Tasks ({myActive.length})
              </TabsTrigger>
              <TabsTrigger value="active-pool" className="rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Active Pool ({activePool.length})
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Unassigned ({unassigned.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Archive ({completed.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                placeholder="Search ticket pool..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-card/40 border-border/50 focus:border-primary/50 transition-all text-sm"
              />
            </div>
            <Button onClick={() => router.push('/dashboard/tickets/new')} className="h-10 rounded-xl px-5 shadow-lg shadow-primary/20 font-bold text-xs uppercase tracking-wider">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>
        </div>

        <Card className="border-2 border-border/60 rounded-[32px] overflow-hidden bg-card/30 backdrop-blur-xl shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40 border-b-2 border-border/50">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} className="text-[10px] font-black uppercase tracking-[0.2em] py-5 px-6 text-muted-foreground/70">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "group border-b border-border/40 hover:bg-primary/[0.03] transition-all cursor-pointer relative",
                          row.original.assigneeId === user?.id && "bg-primary/[0.01]"
                        )}
                        onClick={() => router.push(`/dashboard/tickets/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className="py-5 px-6">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columns.length} className="h-72 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                          <TicketIcon className="h-12 w-12" strokeWidth={1} />
                          <p className="text-sm font-medium uppercase tracking-widest">No matching tickets in this view</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          
          <div className="p-5 border-t border-border/40 flex items-center justify-between bg-muted/20">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Showing {table.getRowModel().rows.length} of {filteredData.length} records
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-border/50 bg-card/50"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-border/50 bg-card/50"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
