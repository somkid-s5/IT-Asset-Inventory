'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Database, RefreshCw, Server, ShieldCheck, Users, Monitor, ShieldAlert, Laptop, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { DashboardSkeleton } from '@/components/Skeletons';

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

function formatSyncTime(value: string | null) {
  if (!value) {
    return 'No sync yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No sync yet';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DashboardPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setError(null);
      const response = await api.get<DashboardOverview>('/dashboard/overview');
      setData(response.data);
    } catch (err: unknown) {
      const apiMessage =
        typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;

      const message = apiMessage ?? 'Failed to load dashboard data from server.';
      setError(message);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    setHeader({
      title: 'Overview',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Overview' },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader]);



  const attentionItems = useMemo(() => {
    if (!data) {
      return [];
    }

    const items: Array<{ id: string; title: string; detail: string; route: string }> = [];

    if (data.vm.pendingSetup > 0) {
      items.push({
        id: 'pending-vm',
        title: `${data.vm.pendingSetup} VM waiting for setup`,
        detail: 'Complete business context before these VMs move into active inventory.',
        route: '/dashboard/vm',
      });
    }

    if (data.vm.orphaned > 0) {
      items.push({
        id: 'orphaned-vm',
        title: `${data.vm.orphaned} orphaned VM record`,
        detail: 'Previously active VM records are no longer returned by the latest source sync.',
        route: '/dashboard/vm',
      });
    }

    if (data.vm.connectionFailedSources > 0 || data.vm.readyToSyncSources > 0) {
      items.push({
        id: 'vm-sources',
        title: `${data.vm.connectionFailedSources} source failed / ${data.vm.readyToSyncSources} waiting`,
        detail: 'Review vCenter source health and sync schedule.',
        route: '/dashboard/vm/sources',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'all-clear',
        title: 'No urgent inventory issues',
        detail: 'Assets, VM inventory, and connected sources currently look stable.',
        route: '/dashboard',
      });
    }

    return items;
  }, [data]);



  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="workspace-page">
        <section className="workspace-hero">
          <div className="flex items-start gap-3">
            <div className="icon-chip border-destructive/20 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="workspace-heading text-lg">Dashboard Unavailable</h2>
              <p className="mt-2 text-sm text-muted-foreground">{error || 'No data received from backend.'}</p>
              <Button
                onClick={() => {
                  setLoading(true);
                  void loadDashboard();
                }}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="workspace-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Summary of your IT infrastructure and operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="brand-chip bg-muted/30">
            Last Sync 
            <span className="font-medium normal-case tracking-normal text-foreground">{formatSyncTime(data.vm.latestSyncAt)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              void loadDashboard();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-tile cursor-pointer transition-colors hover:border-primary/30" onClick={() => router.push('/dashboard/assets')}>
          <div className="flex items-center justify-between">
            <span className="stat-kicker">Physical Assets</span>
            <Server className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold tracking-tight">{data.assets.total}</span>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.assets.active} Active</span> · {data.assets.inactive} Inactive
            </p>
          </div>
        </div>

        <div className="stat-tile cursor-pointer transition-colors hover:border-primary/30" onClick={() => router.push('/dashboard/vm')}>
          <div className="flex items-center justify-between">
            <span className="stat-kicker">Virtual Machines</span>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold tracking-tight">{data.vm.activeInventory}</span>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-600 dark:text-amber-500 font-medium">{data.vm.pendingSetup} Pending</span> · {data.vm.orphaned} Orphaned
            </p>
          </div>
        </div>

        <div className="stat-tile cursor-pointer transition-colors hover:border-primary/30" onClick={() => router.push('/dashboard/db')}>
          <div className="flex items-center justify-between">
            <span className="stat-kicker">Databases</span>
            <Database className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold tracking-tight">{data.databases.total}</span>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-600 dark:text-blue-400 font-medium">{data.databases.production} Prod</span> · {data.databases.accounts} Accounts
            </p>
          </div>
        </div>

        <div className="stat-tile cursor-pointer transition-colors hover:border-primary/30" onClick={() => router.push('/dashboard/users')}>
          <div className="flex items-center justify-between">
            <span className="stat-kicker">Team Members</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold tracking-tight">{data.users.total}</span>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">{data.users.admins} Admins</span> · Workspace Users
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Asset Breakdown Panel */}
        <div className="surface-panel p-5 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
            <div className="icon-chip h-7 w-7 rounded border-none bg-primary/10 text-primary">
              <Laptop className="h-3.5 w-3.5" />
            </div>
            <h3 className="app-panel-title">Asset Breakdown</h3>
          </div>
          
          <div className="flex-1 space-y-3">
            {data.assets.breakdown.length > 0 ? (
              data.assets.breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></span>
                    {b.label}
                  </div>
                  <span className="text-sm font-medium">{b.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No distribution data</p>
            )}
          </div>
          
          <div className="mt-5 pt-4 border-t border-border/60">
             <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard/assets')}>
                View Full Register
             </Button>
          </div>
        </div>

        {/* VM Source Health Panel */}
        <div className="surface-panel p-5 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
            <div className="icon-chip h-7 w-7 rounded border-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <h3 className="app-panel-title">Source Connection Health</h3>
          </div>
          
          <div className="mt-1 space-y-2.5 flex-1">
            <button className="muted-panel flex items-center justify-between w-full gap-3 px-3 py-2.5 text-xs transition-colors hover:border-emerald-500/30" onClick={() => router.push('/dashboard/vm/sources')}>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Healthy Connections
              </span>
              <span className="font-semibold text-foreground">{data.vm.healthySources}</span>
            </button>
            <button className="muted-panel flex items-center justify-between w-full gap-3 px-3 py-2.5 text-xs transition-colors hover:border-red-500/30" onClick={() => router.push('/dashboard/vm/sources')}>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className={data.vm.connectionFailedSources > 0 ? "h-3.5 w-3.5 text-red-500" : "h-3.5 w-3.5 text-muted-foreground"} />
                Connection Failed
              </span>
              <span className="font-semibold text-foreground">{data.vm.connectionFailedSources}</span>
            </button>
            <button className="muted-panel flex items-center justify-between w-full gap-3 px-3 py-2.5 text-xs transition-colors hover:border-primary/30" onClick={() => router.push('/dashboard/vm/sources')}>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                Ready to Sync
              </span>
              <span className="font-semibold text-foreground">{data.vm.readyToSyncSources}</span>
            </button>
          </div>
        </div>

        {/* Needs Attention Panel */}
        <div className="surface-panel p-5 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
            <div className="icon-chip h-7 w-7 rounded border-none bg-amber-500/10 text-amber-600 dark:text-amber-500">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            <h3 className="app-panel-title">Needs Attention</h3>
          </div>
          
          <div className="mt-1 space-y-2.5 flex-1 overflow-y-auto">
            {attentionItems.length > 0 && attentionItems[0].id === 'all-clear' ? (
               <div className="flex flex-col items-center justify-center py-6 text-center">
                 <ShieldCheck className="h-8 w-8 text-emerald-500/60 mb-3" />
                 <p className="text-sm font-medium text-foreground">All Clear</p>
                 <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">No urgent inventory issues require your attention.</p>
               </div>
            ) : (
              attentionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.route)}
                  className="muted-panel flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/60"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground line-clamp-2">{item.detail}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
