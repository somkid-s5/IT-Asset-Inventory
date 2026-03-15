'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { AlertTriangle, Boxes, Clock3, LoaderCircle, RefreshCw, Server, ShieldAlert, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  totalAssets: number;
  activeAssets: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: {
    eolAssets: number;
    outdatedPatches: number;
    oldCredentials: number;
  };
}

function getRiskTone(level: DashboardData['riskLevel']) {
  switch (level) {
    case 'CRITICAL':
      return 'text-destructive';
    case 'HIGH':
      return 'text-warning';
    case 'MEDIUM':
      return 'text-warning';
    default:
      return 'text-success';
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setError(null);
      const response = await api.get<DashboardData>('/dashboard/overview');
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
    if (user) {
      void loadDashboard();
    }
  }, [user]);

  const overviewRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        id: 'risk',
        category: 'Risk posture',
        summary: `${data.riskLevel} overall infrastructure risk`,
        value: data.riskLevel,
        note: 'Based on current risk factors',
      },
      {
        id: 'active',
        category: 'Active assets',
        summary: `${data.activeAssets} assets currently active`,
        value: String(data.activeAssets),
        note: `${Math.max(0, data.totalAssets - data.activeAssets)} inactive or retired`,
      },
      {
        id: 'patch',
        category: 'Patch backlog',
        summary: `${data.riskFactors.outdatedPatches} patch items pending`,
        value: String(data.riskFactors.outdatedPatches),
        note: 'Outdated software or firmware',
      },
      {
        id: 'credential',
        category: 'Credential hygiene',
        summary: `${data.riskFactors.oldCredentials} credentials need rotation`,
        value: String(data.riskFactors.oldCredentials),
        note: 'Old secrets requiring review',
      },
    ];
  }, [data]);

  const focusItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      `${data.riskFactors.eolAssets} assets are at or near end-of-life and should be reviewed first`,
      `${data.riskFactors.outdatedPatches} systems have pending patch actions waiting for maintenance windows`,
      `${data.riskFactors.oldCredentials} credentials are aging and should move into a rotation plan`,
    ];
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
      <div className="space-y-4 pb-8">
        <section className="surface-panel p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Dashboard unavailable</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error || 'No data received from backend.'}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  void loadDashboard();
                }}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <section className="surface-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Operations Overview</h2>
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-muted-foreground">
              ภาพรวมของ inventory ปัจจุบัน เพื่อให้เห็นจำนวน asset, สถานะการใช้งาน และประเด็นที่ต้องจัดการต่อในฝั่ง infrastructure
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total Assets</div>
              <div className="mt-1 text-base font-semibold text-foreground">{data.totalAssets}</div>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Active Assets</div>
              <div className="mt-1 text-base font-semibold text-foreground">{data.activeAssets}</div>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk Level</div>
              <div className={`mt-1 text-base font-semibold ${getRiskTone(data.riskLevel)}`}>{data.riskLevel}</div>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Patch Backlog</div>
              <div className="mt-1 text-base font-semibold text-foreground">{data.riskFactors.outdatedPatches}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Infrastructure Summary</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Snapshot of the current operational posture</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Summary</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-3 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {overviewRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/80 transition-colors hover:bg-accent/60 last:border-b-0">
                    <td className="px-3 py-3 text-[12px] font-medium text-foreground">{row.category}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{row.summary}</td>
                    <td className="px-3 py-3 text-[12px] font-mono text-foreground">{row.value}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Priority Focus</h3>
            <div className="mt-3 space-y-2">
              {focusItems.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                  <span className="text-xs leading-5 text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel p-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Current Breakdown</h3>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Boxes className="h-3.5 w-3.5" />
                    End-of-life assets
                  </span>
                  <span className="font-semibold text-foreground">{data.riskFactors.eolAssets}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" />
                    Pending patches
                  </span>
                  <span className="font-semibold text-foreground">{data.riskFactors.outdatedPatches}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Old credentials
                  </span>
                  <span className="font-semibold text-foreground">{data.riskFactors.oldCredentials}</span>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Server className="h-3.5 w-3.5" />
                    Inactive assets
                  </span>
                  <span className="font-semibold text-foreground">{Math.max(0, data.totalAssets - data.activeAssets)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
