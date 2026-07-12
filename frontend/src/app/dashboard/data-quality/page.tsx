'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useEffect } from 'react';
import api from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type QualityIssue = { id: string; assetId?: string | null; name: string; type: string; issues: string[] };
type QualitySummary = { totalAssets: number; completeAssets: number; issueCount: number; issues: QualityIssue[] };
type DatabaseQualitySummary = { totalDatabases: number; completeDatabases: number; issueCount: number; issues: Array<{ id: string; name: string; engine: string; issues: string[] }> };
type VmQualitySummary = { totalVms: number; issueCount: number; issues: Array<{ id: string; name: string; kind: 'discovery' | 'inventory'; issues: string[] }> };

export default function DataQualityPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader({ title: 'Data Quality', breadcrumbs: [{ label: 'Workspace', href: '/dashboard' }, { label: 'Data Quality' }] });
  }, [setHeader]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['asset-data-quality'],
    queryFn: async () => (await api.get<QualitySummary>('/assets/data-quality/summary')).data,
  });
  const { data: databaseData } = useQuery({
    queryKey: ['database-data-quality'],
    queryFn: async () => (await api.get<DatabaseQualitySummary>('/databases/data-quality/summary')).data,
  });
  const { data: vmData } = useQuery({
    queryKey: ['vm-data-quality'],
    queryFn: async () => (await api.get<VmQualitySummary>('/vm/data-quality/summary')).data,
  });

  if (isLoading) return <div className="flex min-h-64 items-center justify-center text-muted-foreground"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Checking inventory records…</div>;
  if (isError || !data) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Could not load data-quality results. Please retry.</div>;

  return <div className="workspace-page space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric title="Inventory records" value={data.totalAssets} />
      <Metric title="Complete records" value={data.completeAssets} tone="success" />
      <Metric title="Need review" value={data.issueCount + (databaseData?.issueCount ?? 0) + (vmData?.issueCount ?? 0)} tone={data.issueCount + (databaseData?.issueCount ?? 0) + (vmData?.issueCount ?? 0) ? 'warning' : 'success'} />
    </div>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Records needing attention</CardTitle>
        <CardDescription>Completeness is based on owner, location, serial number, IP address, and warranty status.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.issues.length === 0 ? <div className="py-12 text-center text-muted-foreground"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" />All current asset records meet the defined completeness checks.</div> :
          <div className="space-y-2">{data.issues.map((item) => <Link key={item.id} href={`/dashboard/assets/${item.id}`} className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-medium">{item.name} <span className="font-mono text-xs text-muted-foreground">{item.assetId ?? 'No asset ID'}</span></p><p className="text-xs text-muted-foreground">{item.type}</p></div>
            <div className="flex flex-wrap gap-1">{item.issues.map((issue) => <Badge key={issue} variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground"><AlertTriangle className="mr-1 h-3 w-3" />{issue}</Badge>)}</div>
          </Link>)}</div>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Database records needing attention</CardTitle><CardDescription>Checks owner, environment, backup policy, and at least one database account.</CardDescription></CardHeader>
      <CardContent>{!databaseData ? <div className="text-sm text-muted-foreground">Loading database checks…</div> : databaseData.issues.length === 0 ? <div className="text-sm text-success">All database records meet the defined completeness checks.</div> : <div className="space-y-2">{databaseData.issues.map((item) => <Link key={item.id} href={`/dashboard/databases/${item.id}`} className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.engine}</p></div><div className="flex flex-wrap gap-1">{item.issues.map((issue) => <Badge key={issue} variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground"><AlertTriangle className="mr-1 h-3 w-3" />{issue}</Badge>)}</div></Link>)}</div>}</CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Virtual machine records needing attention</CardTitle><CardDescription>Includes missing business context in discovery and incomplete or source-missing inventory records.</CardDescription></CardHeader>
      <CardContent>{!vmData ? <div className="text-sm text-muted-foreground">Loading VM checks…</div> : vmData.issues.length === 0 ? <div className="text-sm text-success">All VM records meet the defined checks.</div> : <div className="space-y-2">{vmData.issues.map((item) => <Link key={`${item.kind}-${item.id}`} href={item.kind === 'discovery' ? `/dashboard/virtual-machines/sources/${item.id}` : `/dashboard/virtual-machines/${item.id}`} className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.kind === 'discovery' ? 'Discovery queue' : 'Inventory'}</p></div><div className="flex flex-wrap gap-1">{item.issues.map((issue) => <Badge key={issue} variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground"><AlertTriangle className="mr-1 h-3 w-3" />{issue}</Badge>)}</div></Link>)}</div>}</CardContent>
    </Card>
  </div>;
}

function Metric({ title, value, tone = 'primary' }: { title: string; value: number; tone?: 'primary' | 'success' | 'warning' }) {
  const toneClass = { primary: 'text-primary', success: 'text-success', warning: 'text-warning' }[tone];
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{title}</p><p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p></CardContent></Card>;
}
