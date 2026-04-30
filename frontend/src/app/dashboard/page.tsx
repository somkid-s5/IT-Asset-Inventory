'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, Database, RefreshCw, Server, 
  ShieldCheck, Users, Monitor, ShieldAlert, 
  Laptop, Activity, ArrowUpRight 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { DashboardSkeleton } from '@/components/Skeletons';
import { motion } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
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
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: any = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } }
};

export default function DashboardPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
      title: 'Dashboard',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Dashboard' },
      ],
    });
  }, [setHeader]);

  const assetChartData = useMemo(() => {
    if (!data?.assets.breakdown) return [];
    const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];
    return data.assets.breakdown.map((b, i) => ({
      name: b.label,
      value: b.count,
      color: colors[i % colors.length]
    }));
  }, [data]);

  const attentionItems = useMemo(() => {
    if (!data) return [];
    const items = [];
    if (data.vm.pendingSetup > 0) items.push({ id: 'pending-vm', title: `${data.vm.pendingSetup} VMs Pending`, route: '/dashboard/virtual-machines' });
    if (data.vm.connectionFailedSources > 0) items.push({ id: 'vm-err', title: `${data.vm.connectionFailedSources} Source(s) Failed`, route: '/dashboard/virtual-machines/vcenter-sources' });
    return items;
  }, [data]);

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
          <h2 className="text-sm font-medium text-muted-foreground">Infrastructure Overview</h2>
          <p className="text-xs text-muted-foreground/60">Real-time status of your IT ecosystem</p>
        </div>
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 font-medium bg-card/50 border-border/50">
            <Activity className="h-3 w-3 text-success mr-2 animate-pulse" />
            <span className="text-success">System Online</span>
          </Badge>
          <Button variant="outline" size="sm" className="shadow-sm bg-card h-9" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isFetching && "animate-spin")} />
            {isFetching ? 'Updating...' : 'Refresh Data'}
          </Button>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Hardware Assets" value={data?.assets.total} icon={Server} subtitle={`${data?.assets.active} Active · ${data?.assets.inactive} Inactive`} color="primary" onClick={() => router.push('/dashboard/assets')} />
        <StatCard title="Virtual Machines" value={data?.vm.activeInventory} icon={Monitor} subtitle={`${data?.vm.pendingSetup} Pending · ${data?.vm.orphaned} Cancelled`} color="info" onClick={() => router.push('/dashboard/virtual-machines')} />
        <StatCard title="Databases" value={data?.databases.total} icon={Database} subtitle={`${data?.databases.production} Production · ${data?.databases.accounts} Accounts`} color="success" onClick={() => router.push('/dashboard/databases')} />
        <StatCard title="User Accounts" value={data?.users.total} icon={Users} subtitle={`${data?.users.admins} Admins · IT Staff`} color="warning" onClick={() => router.push('/dashboard/users')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <Card className="glass-card h-full border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl flex flex-col rounded-[24px] overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/20 bg-muted/10 px-6 py-5">
              <CardTitle className="text-lg flex items-center gap-2"><Laptop className="h-5 w-5 text-primary" />Asset Distribution</CardTitle>
              <CardDescription>Breakdown of IT resources across the system</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[320px] relative p-6">
              {mounted && assetChartData.length > 0 ? (
                <div className="absolute inset-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assetChartData} innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value">
                        {assetChartData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data available</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card className="glass-card h-full border border-border/40 bg-card/40 backdrop-blur-2xl shadow-xl flex flex-col rounded-[24px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/20 bg-muted/10 px-6 py-5">
              <CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-warning" />Requires Attention</CardTitle>
              <CardDescription>Critical items requiring action</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 p-6">
              {attentionItems.length > 0 ? (
                attentionItems.map((item: any) => (
                  <button key={item.id} onClick={() => router.push(item.route)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                    <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-warning" /></div>
                    <span className="text-sm font-medium flex-1">{item.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/30" />
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                   <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center text-success"><ShieldCheck className="h-6 w-6" /></div>
                   <p className="text-sm font-medium">Everything is normal</p>
                   <p className="text-xs text-muted-foreground px-6">There are currently no urgent issues in your infrastructure.</p>
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
  };
  const theme = styles[color] || styles.primary;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card 
        className={cn(
          "group relative overflow-hidden h-full rounded-[24px] border border-border/40 bg-card/40 backdrop-blur-2xl shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer",
          theme.border
        )} 
        onClick={onClick}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", theme.gradient)} />
        <div className={cn("absolute inset-0 transition-colors duration-500", theme.bg)} />
        
        <CardHeader className="flex flex-row items-start justify-between pb-2 relative z-10 space-y-0 px-5 pt-5">
          <div className={cn("p-2.5 rounded-2xl bg-background/80 border border-border/50 shadow-sm transition-transform duration-500 group-hover:scale-110", theme.text)}>
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 px-5 pb-5 pt-4">
          <div className="text-4xl font-extrabold tracking-tighter font-display">{value?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground mt-3 font-medium flex items-center gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", theme.dot)}></span>
            {subtitle}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
