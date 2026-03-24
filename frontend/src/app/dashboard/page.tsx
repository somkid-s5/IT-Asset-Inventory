'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Database, LoaderCircle, RefreshCw, Server, ShieldCheck, Users, Waypoints } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

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

  const summaryRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        id: 'assets',
        module: 'Assets',
        records: data.assets.total,
        status: `${data.assets.active} active / ${data.assets.inactive} inactive`,
        detail:
          data.assets.breakdown.length > 0
            ? data.assets.breakdown.map((item) => `${item.label} ${item.count}`).join(' • ')
            : 'No asset records yet',
        actionLabel: 'Open Assets',
        route: '/dashboard/assets',
      },
      {
        id: 'vm',
        module: 'VM Inventory',
        records: data.vm.activeInventory,
        status: `${data.vm.pendingSetup} pending / ${data.vm.orphaned} orphaned`,
        detail: `${data.vm.sources} sources • ${data.vm.healthySources} healthy`,
        actionLabel: 'Open VM',
        route: '/dashboard/vm',
      },
      {
        id: 'databases',
        module: 'Databases',
        records: data.databases.total,
        status: `${data.databases.production} production`,
        detail: `${data.databases.accounts} database accounts`,
        actionLabel: 'Open Database',
        route: '/dashboard/db',
      },
      {
        id: 'users',
        module: 'Users',
        records: data.users.total,
        status: `${data.users.admins} admins / ${data.users.nonAdmins} non-admins`,
        detail: 'Workspace access control',
        actionLabel: 'Open Users',
        route: '/dashboard/users',
      },
    ];
  }, [data]);

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
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-foreground" />
          <p className="text-sm">Loading workspace overview...</p>
        </div>
      </div>
    );
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
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="workspace-subtle">Operations Overview</p>
            <h2 className="workspace-heading mt-2">Infrastructure Dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Real-time summary of assets, VM inventory, databases, and user access based on the live records inside AssetOps.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="text-[11px] text-muted-foreground">Latest VM sync: {formatSyncTime(data.vm.latestSyncAt)}</div>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                void loadDashboard();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Dashboard
            </Button>
          </div>
        </div>

        <div className="stats-grid sm:grid-cols-2 xl:grid-cols-4">
          <div className="stat-tile">
            <div className="stat-kicker">Assets</div>
            <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Server className="h-4 w-4 text-muted-foreground" />
              {data.assets.total}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{data.assets.active} active</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Active VM</div>
            <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Waypoints className="h-4 w-4 text-muted-foreground" />
              {data.vm.activeInventory}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{data.vm.pendingSetup} pending setup</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Databases</div>
            <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Database className="h-4 w-4 text-muted-foreground" />
              {data.databases.total}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{data.databases.production} production</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Users</div>
            <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
              {data.users.total}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{data.users.admins} admin accounts</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="table-shell">
          <div className="table-section-header">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Inventory Summary</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Operational overview of the core modules in this system</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-frame min-w-[820px]">
              <thead>
                <tr className="table-head-row">
                  <th className="px-3 py-3 font-medium">Module</th>
                  <th className="px-3 py-3 font-medium">Records</th>
                  <th className="px-3 py-3 font-medium">Current Status</th>
                  <th className="px-3 py-3 font-medium">Detail</th>
                  <th className="px-3 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td className="px-3 py-3 text-[12px] font-medium text-foreground">{row.module}</td>
                    <td className="px-3 py-3 font-mono text-[12px] text-foreground">{row.records}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{row.status}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{row.detail}</td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => router.push(row.route)}>
                        {row.actionLabel}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Needs Attention</h3>
            <div className="mt-3 space-y-2">
              {attentionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.route)}
                  className="muted-panel flex w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="surface-panel p-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">VM Source Health</h3>
            <div className="mt-3 space-y-2">
              <div className="muted-panel flex items-center justify-between gap-3 px-3 py-3 text-xs">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Healthy sources
                </span>
                <span className="font-semibold text-foreground">{data.vm.healthySources}</span>
              </div>
              <div className="muted-panel flex items-center justify-between gap-3 px-3 py-3 text-xs">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Connection failed
                </span>
                <span className="font-semibold text-foreground">{data.vm.connectionFailedSources}</span>
              </div>
              <div className="muted-panel flex items-center justify-between gap-3 px-3 py-3 text-xs">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Ready to sync
                </span>
                <span className="font-semibold text-foreground">{data.vm.readyToSyncSources}</span>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/dashboard/vm/sources')}>
                  Open VM Sources
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
