'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { ticketsService, Ticket, TicketPriority, TicketStatus } from '@/services/tickets';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlayCircle,
  Plus,
  Search,
  Ticket as TicketIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AssetsTableSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function TicketsPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
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
      header: () => <span className="hidden sm:inline">ID</span>,
      cell: ({ row }) => {
        const isMine = row.original.assigneeId === user?.id;
        return (
          <div className="hidden sm:flex items-center gap-2">
            {isMine && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" title="Assigned to you" />}
            <span className={cn("font-mono text-[11px] font-bold", isMine ? "text-primary" : "text-muted-foreground")}>
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
        <div className="flex flex-col overflow-hidden min-w-[140px] max-w-[200px]">
          <span className="font-bold text-[13px] text-foreground truncate">
            {row.original.title}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter truncate">
              {row.original.client.name}
            </span>
            <span className="sm:hidden text-[10px] text-muted-foreground font-black">
              • {row.original.ticketNo}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => {
        const priority = getValue() as TicketPriority;
        return (
          <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 py-0 h-4.5 border-2 uppercase tracking-tighter", priorityColors[priority])}>
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => <span className="hidden xs:inline">Status</span>,
      cell: ({ getValue }) => {
        const status = getValue() as TicketStatus;
        const Icon = statusIcons[status];
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="h-3 w-3 opacity-60" />
            <span className="hidden xs:inline text-[11px] font-bold uppercase tracking-tighter">{status.replace(/_/g, ' ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'assignee',
      header: () => <span className="hidden md:inline">Assignee</span>,
      cell: ({ row }) => {
        const assignee = row.original.assignee as any;
        const isMine = row.original.assigneeId === user?.id;
        return (
          <div className="hidden md:flex items-center gap-2">
            <span className={cn("text-[11px] font-bold uppercase tracking-tight", isMine ? "text-primary" : "text-muted-foreground/80")}>
              {isMine ? 'YOU' : (assignee?.displayName || '--')}
            </span>
          </div>
        );
      },
    },
    {
      id: 'sla',
      header: () => <span className="hidden md:inline">SLA Status</span>,
      cell: ({ row }) => {
        const ticket = row.original as any;
        if (!ticket.slaDeadline) return <span className="hidden md:inline text-[11px] text-muted-foreground">--</span>;

        const deadline = new Date(ticket.slaDeadline);
        const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;

        const now = new Date();
        const totalSla = (ticket.slaLimitHours || 24) * 60 * 60 * 1000;
        const created = new Date(ticket.createdAt);

        const elapsed = (resolved ? resolved.getTime() : now.getTime()) - created.getTime();
        const percent = Math.min(100, Math.max(0, (elapsed / totalSla) * 100));

        const isBreached = ticket.slaStatus === 'BREACHED';
        const isCompleted = ['RESOLVED', 'CLOSED'].includes(ticket.status);

        let colorClass = 'bg-success';
        if (isBreached) {
          colorClass = 'bg-destructive';
        } else if (percent > 75) {
          colorClass = 'bg-warning animate-pulse';
        } else if (percent > 50) {
          colorClass = 'bg-orange-500';
        }

        return (
          <div className="hidden md:flex flex-col gap-1 w-[80px]">
            <div className="flex items-center justify-between text-[10px] font-black tracking-tighter uppercase">
              <span className={cn(isBreached ? "text-destructive" : isCompleted ? "text-success" : "text-muted-foreground")}>
                {isBreached ? 'Breached' : isCompleted ? 'Met SLA' : `${Math.round(100 - percent)}% left`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/10">
              <div
                className={cn("h-full transition-all duration-500", colorClass)}
                style={{ width: `${isCompleted && !isBreached ? 100 : percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => <span className="hidden lg:inline">Created</span>,
      cell: ({ getValue }) => (
        <span className="hidden lg:inline text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
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
            className="h-7 w-7 sm:w-auto sm:h-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors px-0 sm:px-2.5 text-[10px] font-black uppercase tracking-widest"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/tickets/${row.original.id}`);
            }}
          >
            <span className="hidden sm:inline">Manage</span>
            <ChevronRight className="sm:hidden h-4 w-4" />
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
      className="space-y-4"
    >
      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className={cn("p-4 border border-border/50 bg-card relative overflow-hidden group hover:border-primary/20 transition-all shadow-sm rounded-xl", stat.bg)}>
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn("text-2xl font-black font-display", stat.color)}>{stat.value}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">/ {stat.total}</span>
                  </div>
                </div>
                <div className={cn("p-1.5 rounded-lg bg-background/50 border border-border/50 shadow-inner", stat.color)}>
                  <stat.icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto overflow-hidden">
            <TabsList className="flex lg:grid lg:grid-cols-4 w-full lg:w-[480px] h-auto min-h-10 p-1 rounded-xl bg-muted/50 border border-border/40 overflow-x-auto custom-scrollbar">
              <TabsTrigger value="my-active" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-card data-[state=active]:text-primary py-1 px-3">
                My Tasks ({myActive.length})
              </TabsTrigger>
              <TabsTrigger value="active-pool" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-card py-1 px-3">
                Pool ({activePool.length})
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-card py-1 px-3">
                Open ({unassigned.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-card py-1 px-3">
                Archive ({completed.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search pool..."
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
                className="h-9 pl-8 rounded-lg bg-card border-border/60 text-xs"
              />
            </div>
            <Button
              onClick={() => router.push('/dashboard/tickets/new')}
              size="sm"
              className="h-9 px-4 rounded-lg font-bold text-xs shadow-md shadow-primary/10"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Standardized Table Frame */}
        <div className="table-shell">
          <table className="table-frame">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="table-head-row">
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id}
                    onClick={() => router.push(`/dashboard/tickets/${row.original.id}`)}
                    className={cn(
                      "cursor-pointer",
                      row.original.assigneeId === user?.id && "bg-primary/[0.01]"
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-30 uppercase tracking-widest font-black text-[10px]">
                      <TicketIcon className="h-8 w-8" />
                      <span>No matching records found</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination - Compact */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-t border-border/40">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Showing {table.getRowModel().rows.length} of {filteredData.length} records
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-md hover:bg-primary/10 hover:text-primary"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-md hover:bg-primary/10 hover:text-primary"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
