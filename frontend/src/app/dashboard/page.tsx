'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Database, RefreshCw, Server, ShieldCheck, Users, Monitor, ShieldAlert, Laptop, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    return 'ยังไม่ได้ซิงค์';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'ยังไม่ได้ซิงค์';
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
          typeof (err as any).response?.data?.message === 'string'
          ? (err as any).response?.data?.message
          : null;

      const message = apiMessage ?? 'ไม่สามารถโหลดข้อมูลแดชบอร์ดจากเซิร์ฟเวอร์ได้';
      setError(message);
      toast.error('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    setHeader({
      title: 'ภาพรวม',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'ภาพรวม' },
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
        title: `${data.vm.pendingSetup} VM รอดำเนินการตั้งค่า`,
        detail: 'ดำเนินการบริบททางธุรกิจก่อนที่ VM เหล่านี้จะย้ายไปยังสินทรัพย์ที่ใช้งานอยู่',
        route: '/dashboard/vm',
      });
    }

    if (data.vm.orphaned > 0) {
      items.push({
        id: 'orphaned-vm',
        title: `${data.vm.orphaned} VM ถูกยกเลิก`,
        detail: 'บันทึก VM ที่เคยใช้งานอยู่ไม่ถูกแสดงผลจากการซิงค์แหล่งข้อมูลล่าสุดอีกต่อไป',
        route: '/dashboard/vm',
      });
    }

    if (data.vm.connectionFailedSources > 0 || data.vm.readyToSyncSources > 0) {
      items.push({
        id: 'vm-sources',
        title: `${data.vm.connectionFailedSources} แหล่งล้มเหลว / ${data.vm.readyToSyncSources} รออยู่`,
        detail: 'ตรวจสอบสถานะแหล่ง vCenter และกำหนดการซิงค์',
        route: '/dashboard/vm/sources',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'all-clear',
        title: 'ไม่มีปัญหาสินค้าคงคลังเร่งด่วน',
        detail: 'สินทรัพย์ คงคลัง VM และแหล่งเชื่อมต่อขณะนี้มีเสถียรภาพ',
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
        <section className="flex items-start gap-4 mt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold tracking-tight">ไม่สามารถแสดงแดชบอร์ดได้</h2>
            <p className="mt-1 text-sm text-muted-foreground">{error || 'ไม่ได้รับข้อมูลจาก backend'}</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true);
                void loadDashboard();
              }}
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              ลองใหม่
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="workspace-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">ภาพรวม</h2>
          <p className="mt-1 text-sm text-muted-foreground">สรุปโครงสร้างพื้นฐาน IT และการดำเนินงานของคุณ</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 font-normal bg-card">
            <span className="text-muted-foreground mr-1">ซิงค์ล่าสุด</span>
            <span className="font-medium text-foreground">{formatSyncTime(data.vm.latestSyncAt)}</span>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setLoading(true);
              void loadDashboard();
            }}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            รีเฟรช
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => router.push('/dashboard/assets')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">สินทรัพย์ทางกายภาพ</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.assets.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.assets.active} ใช้งาน</span> · {data.assets.inactive} ไม่ใช้งาน
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => router.push('/dashboard/vm')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">เครื่องเสมือน</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.vm.activeInventory}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-600 dark:text-amber-500 font-medium">{data.vm.pendingSetup} รอดำเนินการ</span> · {data.vm.orphaned} ถูกยกเลิก
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => router.push('/dashboard/db')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ฐานข้อมูล</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.databases.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-blue-600 dark:text-blue-400 font-medium">{data.databases.production} ใช้งานจริง</span> · {data.databases.accounts} บัญชี
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => router.push('/dashboard/users')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">สมาชิกในทีม</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">{data.users.admins} ผู้ดูแลระบบ</span> · ผู้ใช้ Workspace
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Asset Breakdown Panel */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
              <Laptop className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-sm font-semibold">รายละเอียดสินทรัพย์</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="space-y-3">
              {data.assets.breakdown.length > 0 ? (
                data.assets.breakdown.map((b) => (
                  <div key={b.label} className="group flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/40 transition-colors group-hover:bg-primary"></span>
                      {b.label}
                    </div>
                    <span className="text-sm font-medium">{b.count}</span>
                  </div>
                ))
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">ไม่มีข้อมูลการกระจาย</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/60 pt-4">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard/assets')}>
              ดูสมุดทะเบียนทั้งหมด
            </Button>
          </CardFooter>
        </Card>

        {/* VM Source Health Panel */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-sm font-semibold">สถานะการเชื่อมต่อแหล่งข้อมูล</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-4 space-y-2.5">
            <Button variant="outline" className="w-full justify-between h-auto py-2.5 px-3 font-normal" onClick={() => router.push('/dashboard/vm/sources')}>
              <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                การเชื่อมต่อปกติ
              </span>
              <span className="font-semibold text-foreground text-xs">{data.vm.healthySources}</span>
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-2.5 px-3 font-normal border-destructive/20 hover:border-destructive/40" onClick={() => router.push('/dashboard/vm/sources')}>
              <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                <AlertTriangle className={data.vm.connectionFailedSources > 0 ? "h-3.5 w-3.5 text-red-500" : "h-3.5 w-3.5 text-muted-foreground"} />
                การเชื่อมต่อล้มเหลว
              </span>
              <span className="font-semibold text-foreground text-xs">{data.vm.connectionFailedSources}</span>
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-2.5 px-3 font-normal" onClick={() => router.push('/dashboard/vm/sources')}>
              <span className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                พร้อมซิงค์
              </span>
              <span className="font-semibold text-foreground text-xs">{data.vm.readyToSyncSources}</span>
            </Button>
          </CardContent>
        </Card>

        {/* Needs Attention Panel */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-500">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-sm font-semibold">ต้องการการตรวจสอบ</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pt-4 space-y-2.5">
            {attentionItems.length > 0 && attentionItems[0].id === 'all-clear' ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <ShieldCheck className="mb-3 h-8 w-8 text-emerald-500/60" />
                <p className="text-sm font-medium text-foreground">ไม่มีปัญหา</p>
                <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">ไม่มีปัญหาสินค้าคงคลังเร่งด่วนที่ต้องการการตรวจสอบจากคุณ</p>
              </div>
            ) : (
              attentionItems.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  className="flex w-full items-start justify-start h-auto gap-2.5 px-3 py-2.5 text-left font-normal"
                  onClick={() => router.push(item.route)}
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="min-w-0 flex flex-col items-start text-left">
                    <span className="block text-xs font-medium text-foreground">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground whitespace-normal line-clamp-2">{item.detail}</span>
                  </span>
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
