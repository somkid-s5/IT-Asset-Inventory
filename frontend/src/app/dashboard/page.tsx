'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database, RefreshCw, Server,
  ShieldCheck, Monitor, ShieldAlert,
  Laptop, Activity, ArrowUpRight,
  Ticket, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { DashboardSkeleton } from '@/components/Skeletons';
import { motion, Variants } from 'framer-motion';
import {
  PieChart, Pie, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { cn } from '@/lib/utils';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useQuery } from '@tanstack/react-query';

interface DashboardOverview {
  assets: {
    total: number;
    active: number;
    inactive: number;
    breakdown: Array<{
      label: string;
      count: number;
    }>;
  };
  vm: {
    sources: number;
    healthySources: number;
    connectionFailedSources: number;
    readyToSyncSources: number;
    pendingSetup: number;
    activeInventory: number;
    orphaned: number;
    latestSyncAt: string | null;
  };
  databases: {
    total: number;
    production: number;
    accounts: number;
  };
  users: {
    total: number;
    admins: number;
    nonAdmins: number;
  };
  tickets?: {
    total: number;
    open: number;
    resolved: number;
    metSla: number;
    breached: number;
    slaSuccessRate: number;
  };
  assetHealth?: {
    score: number;
    eolCount: number;
  };
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }
};

export default function DashboardPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await api.get<DashboardOverview>('/dashboard/overview');
      return response.data;
    },
  });

  useEffect(() => {
    setHeader({
      title: 'SysOps Console',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Control Center' },
      ],
    });
  }, [setHeader]);

  const chartConfig = useMemo(() => {
    if (!data?.assets.breakdown) return {};
    const config: any = {};
    const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
    data.assets.breakdown.forEach((b, i) => {
      config[b.label] = {
        label: b.label.toUpperCase(),
        color: colors[i % colors.length]
      };
    });
    return config;
  }, [data]);

  const assetChartData = useMemo(() => {
    if (!data?.assets.breakdown) return [];
    return data.assets.breakdown.map((b) => ({
      name: b.label,
      value: b.count,
      fill: `var(--color-${b.label})`
    }));
  }, [data]);

  const attentionItems = useMemo(() => {
    if (!data) return [];
    const items = [];
    if (data.tickets && data.tickets.breached > 0) {
      items.push({ id: 'ticket-breached', title: `${data.tickets.breached} SLA Breached Ticket(s)`, route: '/dashboard/tickets', variant: 'destructive' });
    }
    if (data.vm.pendingSetup > 0) items.push({ id: 'pending-vm', title: `${data.vm.pendingSetup} VMs Pending Setup`, route: '/dashboard/virtual-machines', variant: 'warning' });
    if (data.vm.connectionFailedSources > 0) items.push({ id: 'vm-err', title: `vCenter Sync Failed`, route: '/dashboard/virtual-machines/sources', variant: 'destructive' });
    return items;
  }, [data]);

  // Asset Health parameters
  const score = data?.assetHealth?.score ?? 100;
  const eolCount = data?.assetHealth?.eolCount ?? 0;
  const inactiveCount = data?.assets?.inactive ?? 0;
  const failedSyncCount = data?.vm?.connectionFailedSources ?? 0;

  // Color mapping for score
  let strokeColor = "stroke-success";
  let textColor = "text-success";
  if (score < 60) {
    strokeColor = "stroke-destructive";
    textColor = "text-destructive";
  } else if (score < 85) {
    strokeColor = "stroke-warning";
    textColor = "text-warning";
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">Command Center</h2>
          <p className="text-[13px] font-medium text-muted-foreground">Service & Infrastructure Operations Orchestrator</p>
        </div>
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 font-medium bg-card/50 border-border/50">
            <Activity className="h-3 w-3 text-success mr-2 animate-pulse" />
            <span className="text-success">Ops Center Active</span>
          </Badge>
          <Button variant="outline" size="sm" className="shadow-sm bg-card h-9" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isFetching && "animate-spin")} />
            {isFetching ? 'Updating...' : 'Sync System'}
          </Button>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open Tickets" value={data?.tickets?.open} icon={Ticket} subtitle={`${data?.tickets?.slaSuccessRate ?? 100}% SLA Target Met`} color="destructive" onClick={() => router.push('/dashboard/tickets')} />
        <StatCard title="Compute Assets" value={data?.vm.activeInventory} icon={Monitor} subtitle={`${data?.vm.pendingSetup} Setup · ${data?.vm.orphaned} Orphaned`} color="primary" onClick={() => router.push('/dashboard/virtual-machines')} />
        <StatCard title="Infrastructure" value={data?.assets.total} icon={Server} subtitle={`${data?.assets.active} Healthy · ${data?.assets.inactive} Offline`} color="info" onClick={() => router.push('/dashboard/assets')} />
        <StatCard title="Managed DBs" value={data?.databases.total} icon={Database} subtitle={`${data?.databases.production} Prod · ${data?.databases.accounts} Accounts`} color="success" onClick={() => router.push('/dashboard/databases')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* CMDB Distribution (5 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-5">
          <Card className="h-full border border-border/60 bg-card flex flex-col rounded-2xl overflow-hidden p-0 gap-0 shadow-sm">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/30 px-6 py-5">
              <CardTitle className="text-lg flex items-center gap-2"><Laptop className="h-5 w-5 text-primary" />CMDB Distribution</CardTitle>
              <CardDescription>Visual breakdown of Configuration Items (CIs)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[320px] relative p-6">
              {mounted && assetChartData.length > 0 ? (
                <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center pt-8">
                  <ChartContainer config={chartConfig} className="w-full max-w-[320px] h-full aspect-square">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={assetChartData}
                        innerRadius={80}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        cornerRadius={6}
                      />
                      <ChartLegend content={<ChartLegendContent />} className="flex-wrap gap-2 text-[10px] pb-4" />
                    </PieChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No CI data available</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Asset Health Index (3 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="h-full border border-border/60 bg-card flex flex-col rounded-2xl overflow-hidden p-0 gap-0 shadow-sm">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/30 px-6 py-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-success" />
                Asset Health
              </CardTitle>
              <CardDescription>Real-time platform compliance</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-between p-6 min-h-[320px]">
              {/* Circular Gauge */}
              <div className="relative flex items-center justify-center w-36 h-36 mt-2">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle
                    className="text-muted/20 stroke-current"
                    strokeWidth="8"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className={cn("stroke-current transition-all duration-1000 ease-out", strokeColor)}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-3xl font-bold font-mono tracking-tighter", textColor)}>
                    {score}%
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Index Score</span>
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="w-full space-y-3 mt-4">
                <div className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", failedSyncCount > 0 ? "bg-destructive animate-pulse" : "bg-success")}></span>
                    Sync Issues
                  </span>
                  <span className="font-mono font-semibold">{failedSyncCount} failed</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", inactiveCount > 0 ? "bg-warning" : "bg-success")}></span>
                    Offline Assets
                  </span>
                  <span className="font-mono font-semibold">{inactiveCount} inactive</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-0.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", eolCount > 0 ? "bg-destructive animate-pulse" : "bg-success")}></span>
                    EOL Platforms
                  </span>
                  <span className="font-mono font-semibold">{eolCount} warnings</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Incident Monitor (4 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card className="h-full border border-border/60 bg-card flex flex-col rounded-2xl overflow-hidden p-0 gap-0 shadow-sm">
            <CardHeader className="pb-2 border-b border-border/40 bg-muted/30 px-6 py-5">
              <CardTitle className="text-lg flex items-center justify-between"><ShieldAlert className="h-5 w-5 text-warning" />Incident Monitor</CardTitle>
              <CardDescription>Service requests and critical events</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 p-6 overflow-y-auto max-h-[340px]">
              {attentionItems.length > 0 ? (
                attentionItems.map((item: any) => (
                  <Alert 
                    key={item.id} 
                    variant={item.variant || "warning"} 
                    className="cursor-pointer hover:bg-muted/10 transition-all group"
                    onClick={() => router.push(item.route)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <AlertTitle className="text-sm">{item.title}</AlertTitle>
                        <AlertDescription className="text-xs">Immediate intervention suggested.</AlertDescription>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                  </Alert>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success"><ShieldCheck className="h-6 w-6" /></div>
                  <p className="text-sm font-medium">Service Level OK</p>
                  <p className="text-xs text-muted-foreground px-6">All systems operational. No open critical incidents.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, subtitle, color, onClick }: any) {
  const styles: any = {
    primary: { bg: 'group-hover:bg-primary/5', border: 'group-hover:border-primary/50', text: 'text-primary', dot: 'bg-primary', gradient: 'from-primary/20 via-primary/5 to-transparent' },
    success: { bg: 'group-hover:bg-success/5', border: 'group-hover:border-success/50', text: 'text-success', dot: 'bg-success', gradient: 'from-success/20 via-success/5 to-transparent' },
    info: { bg: 'group-hover:bg-info/5', border: 'group-hover:border-info/50', text: 'text-info', dot: 'bg-info', gradient: 'from-info/20 via-info/5 to-transparent' },
    warning: { bg: 'group-hover:bg-warning/5', border: 'group-hover:border-warning/50', text: 'text-warning', dot: 'bg-warning', gradient: 'from-warning/20 via-warning/5 to-transparent' },
    destructive: { bg: 'group-hover:bg-destructive/5', border: 'group-hover:border-destructive/50', text: 'text-destructive', dot: 'bg-destructive', gradient: 'from-destructive/20 via-destructive/5 to-transparent' },
  };
  const theme = styles[color] || styles.primary;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card 
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer p-0 gap-0",
          theme.border
        )}
        onClick={onClick}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", theme.gradient)} />
        <div className={cn("absolute inset-0 transition-colors duration-500", theme.bg)} />

        <div className="p-4 relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg bg-background border border-border/50", theme.text)}>
                <Icon className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
            </div>
          </div>
          <div className="pl-1">
            <div className="text-3xl font-bold font-mono tracking-tight text-foreground">{value?.toLocaleString() || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", theme.dot)}></span>
              {subtitle}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}


