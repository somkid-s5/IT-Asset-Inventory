'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, Database, RefreshCw, Server, 
  ShieldCheck, Users, Monitor, ShieldAlert, 
  Laptop, Activity, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { DashboardSkeleton } from '@/components/Skeletons';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { cn } from '@/lib/utils';

interface DashboardOverview {
  assets: number;
  databases: number;
  vms: number;
  users: number;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

function formatSyncTime(value: string | null) {
  if (!value) return 'เพิ่งอัปเดตล่าสุด';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'เพิ่งอัปเดตล่าสุด' : new Intl.DateTimeFormat('th-TH', {
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
      setLoading(true);
      setError(null);
      const response = await api.get<DashboardOverview>('/dashboard/stats');
      setData(response.data);
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const assetChartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'ฮาร์ดแวร์', value: data.assets, color: 'hsl(var(--primary))' },
      { name: 'เครื่องเสมือน', value: data.vms, color: 'hsl(var(--info))' },
      { name: 'ฐานข้อมูล', value: data.databases, color: 'hsl(var(--success))' },
    ].filter(item => item.value > 0);
  }, [data]);

  const attentionItems = useMemo(() => {
    return []; // เคลียร์ข้อความแจ้งเตือนหลอกออก
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="workspace-page p-6 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold tracking-tight">ภาพรวมระบบ</h1>
          <p className="text-muted-foreground mt-1">สรุปสถานะโครงสร้างพื้นฐานไอทีและภาพรวมการดำเนินงาน</p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Badge variant="outline" className="px-4 py-1.5 font-medium bg-card shadow-sm border-border/50">
            <Activity className="h-3 w-3 text-emerald-500 mr-2 animate-pulse" />
            <span className="text-muted-foreground mr-1">สถานะ:</span>
            <span className="text-emerald-500">ออนไลน์</span>
          </Badge>
          <Button variant="outline" size="sm" className="shadow-sm bg-card" onClick={loadDashboard}>
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
            รีเฟรช
          </Button>
        </motion.div>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="สินทรัพย์ฮาร์ดแวร์" 
          value={data?.assets} 
          icon={Server} 
          subtitle={`อุปกรณ์เครือข่ายและเซิร์ฟเวอร์ทั้งหมด`}
          color="primary"
          onClick={() => router.push('/dashboard/assets')}
        />
        <StatCard 
          title="เครื่องเสมือน (VM)" 
          value={data?.vms} 
          icon={Monitor} 
          subtitle={`เครื่องเสมือนในระบบ vCenter`}
          color="info"
          onClick={() => router.push('/dashboard/vm')}
        />
        <StatCard 
          title="ฐานข้อมูล" 
          value={data?.databases} 
          icon={Database} 
          subtitle={`ฐานข้อมูลทุกสภาพแวดล้อม`}
          color="success"
          onClick={() => router.push('/dashboard/db')}
        />
        <StatCard 
          title="บัญชีผู้ใช้งาน" 
          value={data?.users} 
          icon={Users} 
          subtitle={`ผู้ใช้งานในระบบทั้งหมด`}
          color="warning"
          onClick={() => router.push('/dashboard/users')}
        />
      </div>

      {/* Charts & Focus Areas */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Asset Breakdown Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <Card className="glass-card h-full border-none shadow-xl flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Laptop className="h-4 w-4 text-primary" />
                สัดส่วนสินทรัพย์
              </CardTitle>
              <CardDescription>การกระจายตัวของทรัพยากรไอทีในระบบ</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {assetChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetChartData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {assetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">ไม่มีข้อมูล</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks / Attention */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card className="glass-card h-full border-none shadow-xl flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                ต้องการการตรวจสอบ
              </CardTitle>
              <CardDescription>รายการเร่งด่วนที่ควรจัดการ</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {attentionItems.length > 0 ? (
                attentionItems.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.route)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium flex-1">{item.title}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/30" />
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                   <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                     <ShieldCheck className="h-6 w-6" />
                   </div>
                   <p className="text-sm font-medium">ทุกอย่างปกติ</p>
                   <p className="text-xs text-muted-foreground px-6">ขณะนี้ยังไม่มีปัญหาเร่งด่วนในโครงสร้างพื้นฐานของคุณ</p>
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
  const colors: any = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    info: 'bg-indigo-500',
    warning: 'bg-amber-500'
  };

  return (
    <motion.div variants={itemVariants}>
      <Card 
        className="group relative overflow-hidden border-none shadow-lg hover:shadow-2xl transition-all cursor-pointer bg-card"
        onClick={onClick}
      >
        <div className={cn("absolute left-0 top-0 h-full w-1.5 transition-all group-hover:w-3", colors[color])} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">{title}</CardTitle>
          <div className={cn("p-2 rounded-lg text-white shadow-sm transition-transform group-hover:scale-110", colors[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">{value?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">{subtitle}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HealthStatusItem({ label, count, icon: Icon, color, bg }: any) {
  return (
    <div className="flex items-center justify-between p-1">
      <div className="flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", bg, color)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <span className={cn("text-sm font-bold", count > 0 ? color : "text-muted-foreground/30")}>{count || 0}</span>
    </div>
  );
}
