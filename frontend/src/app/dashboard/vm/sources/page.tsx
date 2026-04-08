'use client';

import { useEffect, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  PlugZap,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { VmVCenterSource } from '@/lib/vm-inventory';
import { createVmSource, deleteVmSource, getVmSources, syncAllVmSources, syncVmSource, testVmSourceConnection, updateVmSource } from '@/services/vm';

const DEFAULT_SOURCE_FORM = {
  name: '',
  endpoint: '',
  username: '',
  password: '',
  syncInterval: '15 min',
  notes: '',
};

const SYNC_INTERVAL_OPTIONS = ['5 min', '15 min', '30 min', '1 hour', '6 hours'];

export default function VmSourcesPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [sources, setSources] = useState<VmVCenterSource[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VmVCenterSource | null>(null);
  const [formData, setFormData] = useState(DEFAULT_SOURCE_FORM);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingSourceIds, setSyncingSourceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSuccessfulTestKey, setLastSuccessfulTestKey] = useState<string | null>(null);
  const syncMeta = `${sources[0]?.lastSyncAt ?? '--'} from ${sources.length} sources`;

  const getConnectionTestKey = (data: typeof DEFAULT_SOURCE_FORM) =>
    JSON.stringify({
      endpoint: data.endpoint.trim(),
      username: data.username.trim(),
      password: data.password,
    });
  const currentConnectionTestKey = getConnectionTestKey(formData);
  const isConnectionVerified = lastSuccessfulTestKey === currentConnectionTestKey;

  const loadSources = async () => {
    try {
      setLoading(true);
      setSources(await getVmSources());
    } catch {
      toast.error('ไม่สามารถโหลดแหล่งข้อมูล vCenter ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  useEffect(() => {
    setHeader({
      title: 'แหล่งข้อมูล vCenter',
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'คอมพิวต์' },
        { label: 'แหล่งข้อมูล vCenter' },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader]);

  const resetForm = () => {
    setFormData(DEFAULT_SOURCE_FORM);
    setEditingSourceId(null);
    setLastSuccessfulTestKey(null);
  };

  const openAddDialog = () => {
    resetForm();
    setAddOpen(true);
  };

  const openEditDialog = (source: VmVCenterSource) => {
    setEditingSourceId(source.id);
    setFormData({
      name: source.name,
      endpoint: source.endpoint,
      username: '',
      password: '',
      syncInterval: source.syncInterval,
      notes: source.notes ?? '',
    });
    setLastSuccessfulTestKey(null);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (lastSuccessfulTestKey !== getConnectionTestKey(formData)) {
      toast.error('กรุณาทดสอบการเชื่อมต่อให้สำเร็จก่อนบันทึก');
      return;
    }

    setSaving(true);
    try {
      if (editingSourceId) {
        await updateVmSource(editingSourceId, formData);
        toast.success('แหล่งข้อมูล vCenter อัปเดตแล้ว');
      } else {
        await createVmSource(formData);
        toast.success('แหล่งข้อมูล vCenter ถูกบันทึกแล้ว');
      }
      setAddOpen(false);
      resetForm();
      await loadSources();
    } catch {
      toast.error('ไม่สามารถบันทึกแหล่งข้อมูล vCenter ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.endpoint.trim()) {
      toast.error('กรุณากรอก endpoint ก่อนทดสอบ');
      return;
    }

    try {
      setTestingConnection(true);
      const result = await testVmSourceConnection({
        endpoint: formData.endpoint,
        username: formData.username,
        password: formData.password,
      });

      if (result.success) {
        setLastSuccessfulTestKey(getConnectionTestKey(formData));
        toast.success(result.message, {
          description: result.detail,
        });
      } else {
        setLastSuccessfulTestKey(null);
        toast.error(result.message, {
          description: result.detail,
        });
      }
    } catch {
      setLastSuccessfulTestKey(null);
      toast.error('ไม่สามารถทดสอบการเชื่อมต่อ vCenter ได้');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const result = await syncAllVmSources();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      await loadSources();
    } catch {
      toast.error('ไม่สามารถซิงค์แหล่งข้อมูล vCenter ได้');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSource = async (source: VmVCenterSource) => {
    try {
      setSyncingSourceIds((current) => [...current, source.id]);
      const result = await syncVmSource(source.id);
      if (result.success) {
        toast.success(result.message, {
          description: result.detail,
        });
      } else {
        toast.error(result.message, {
          description: result.detail,
        });
      }
      await loadSources();
    } catch {
      toast.error(`ไม่สามารถซิงค์ ${source.name} ได้`);
    } finally {
      setSyncingSourceIds((current) => current.filter((id) => id !== source.id));
    }
  };

  const handleDeleteSource = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteVmSource(deleteTarget.id);
      toast.success(`ลบ ${deleteTarget.name} สำเร็จ`);
      setDeleteTarget(null);
      await loadSources();
    } catch {
      toast.error('ไม่สามารถลบแหล่งข้อมูล vCenter ได้');
    }
  };

  return (
    <div className="workspace-page">
      <section className="table-shell">
        <div className="toolbar-strip">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span>ซิงค์แล้ว {syncMeta}</span>
            </div>
            {syncingAll || syncingSourceIds.length > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium text-sky-200">
                <LoaderCircle className="h-3 w-3 animate-spin" />
                <span>
                  {syncingAll
                    ? 'กำลังซิงค์ทั้งหมด'
                    : `กำลังซิงค์ ${syncingSourceIds.length} แหล่งข้อมูล${syncingSourceIds.length === 1 ? '' : ''}`}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={openAddDialog}
              disabled={syncingAll}
            >
              <Plus className="h-4 w-4" />
              เพิ่ม vCenter
            </Button>
            <Button size="lg" className="gap-2" onClick={handleSyncAll} disabled={syncingAll || loading}>
              <RefreshCw className={cn('h-4 w-4', syncingAll && 'animate-spin')} />
              {syncingAll ? 'กำลังซิงค์แหล่งข้อมูล...' : 'ซิงค์ทั้งหมด'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-frame min-w-[980px]">
            <thead>
              <tr className="table-head-row">
                <th className="px-3 py-2.5 font-medium">ชื่อแหล่งข้อมูล</th>
                <th className="px-3 py-2.5 font-medium">Endpoint</th>
                <th className="px-3 py-2.5 font-medium">VM ที่ค้นพบ</th>
                <th className="px-3 py-2.5 font-medium">รอบการซิงค์</th>
                <th className="px-3 py-2.5 font-medium">สถานะ</th>
                <th className="px-3 py-2.5 font-medium">ซิงค์ล่าสุด</th>
                <th className="px-3 py-2.5 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      กำลังโหลดแหล่งข้อมูล...
                    </div>
                  </td>
                </tr>
              ) : sources.map((source) => (
                <tr key={source.id} className="table-row">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-muted-foreground">
                        <Server className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[12px] text-foreground">
                        {source.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    {source.endpoint}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    {source.vmCount}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    ทุกๆ {source.syncInterval}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium',
                        syncingAll || syncingSourceIds.includes(source.id)
                          ? 'border-sky-500/25 bg-sky-500/10 text-sky-200'
                          : source.status === 'Healthy'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
                      )}
                    >
                      {syncingAll || syncingSourceIds.includes(source.id) ? 'กำลังซิงค์...' : source.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    {source.lastSyncAt}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-7 w-7"
                        aria-label={`Run sync for ${source.name}`}
                        disabled={syncingAll || syncingSourceIds.includes(source.id)}
                        onClick={() => void handleSyncSource(source)}
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', (syncingAll || syncingSourceIds.includes(source.id)) && 'animate-spin')} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-7 w-7"
                        aria-label={`Edit ${source.name}`}
                        disabled={syncingAll || syncingSourceIds.includes(source.id)}
                        onClick={() => openEditDialog(source)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-7 w-7"
                        aria-label={`Delete ${source.name}`}
                        disabled={syncingAll || syncingSourceIds.includes(source.id)}
                        onClick={() => setDeleteTarget(source)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>
              {editingSourceId ? 'แก้ไขแหล่งข้อมูล vCenter' : 'เพิ่มแหล่งข้อมูล vCenter'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label required>ชื่อแหล่งข้อมูล</Label>
                <Input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="ชื่อแหล่งข้อมูล"
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Endpoint</Label>
                <Input
                  value={formData.endpoint}
                  onChange={(event) =>
                    setFormData((current) => {
                      return {
                        ...current,
                        endpoint: event.target.value,
                      };
                    })
                  }
                  placeholder="Endpoint หรือชื่อโฮสต์"
                />
              </div>
              <div className="space-y-1.5">
                <Label optional>รอบการซิงค์</Label>
                <Select
                  value={formData.syncInterval}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      syncInterval: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกรอบเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNC_INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label required>ชื่อผู้ใช้</Label>
                <Input
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((current) => {
                      return {
                        ...current,
                        username: event.target.value,
                      };
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label required>รหัสผ่าน</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => {
                      return {
                        ...current,
                        password: event.target.value,
                      };
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div
                  className={cn(
                    'rounded-[12px] border px-4 py-3 text-sm',
                    isConnectionVerified
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isConnectionVerified ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {isConnectionVerified ? 'ยืนยันการเชื่อมต่อแล้ว' : 'ต้องทดสอบใหม่'}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] opacity-90">
                    {isConnectionVerified
                      ? 'Endpoint และข้อมูลการเชื่อมต่อนี้ผ่านการทดสอบแล้ว แหล่งข้อมูลพร้อมบันทึก'
                      : 'ทดสอบการเชื่อมต่อด้วย endpoint และข้อมูลประจำตัวปัจจุบันก่อนบันทึกแหล่งข้อมูลนี้'}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-medium opacity-90">
                    <PlugZap className="h-3.5 w-3.5" />
                    <span>
                      {isConnectionVerified
                        ? 'เปิดใช้งานการบันทึกสำหรับค่าการเชื่อมต่อปัจจุบัน'
                        : 'การเปลี่ยน endpoint, ชื่อผู้ใช้ หรือรหัสผ่านจะยังคงเปิดใช้งานการบันทึกไม่ได้จนกว่าจะทดสอบใหม่'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label optional>หมายเหตุ</Label>
                <textarea
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="หมายเหตุเกี่ยวกับแหล่งข้อมูลนี้"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => void handleTestConnection()}
                disabled={saving || testingConnection}
              >
                {testingConnection ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                ทดสอบการเชื่อมต่อ
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddOpen(false);
                    resetForm();
                  }}
                  disabled={saving || testingConnection}
                >
                  ยกเลิก
                </Button>
                <Button onClick={() => void handleSave()} disabled={saving || testingConnection || !isConnectionVerified}>
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {editingSourceId ? 'บันทึกการแก้ไข' : 'บันทึกแหล่งข้อมูล'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>ลบแหล่งข้อมูล vCenter</DialogTitle>
            <DialogDescription>
              ลบแหล่งข้อมูลนี้และบันทึกการค้นพบจากกระบวนการรับ VM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[14px] border border-border/70 bg-background/55 px-4 py-3">
              <div className="text-sm font-semibold text-foreground">
                {deleteTarget?.name}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {deleteTarget?.endpoint}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleDeleteSource}>
                ลบแหล่งข้อมูล
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
