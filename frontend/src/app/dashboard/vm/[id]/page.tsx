'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VmFormDialog } from '@/components/VmFormDialog';
import type { VmInventoryDetail } from '@/lib/vm-inventory';
import { archiveVmInventory, getVmInventoryById } from '@/services/vm';

type DetailListItem = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
};

function DetailListSection({ title, items }: { title: string; items: DetailListItem[] }) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/35 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
      <dl className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid gap-1 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-start sm:gap-4"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</dt>
            <dd className="min-w-0">
              {typeof item.meta === 'string' ? (
                <div className="text-sm font-semibold text-foreground">
                  {item.value}
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">{item.meta}</span>
                </div>
              ) : (
                <div className="text-sm font-semibold text-foreground">{item.value}</div>
              )}
              {item.meta && typeof item.meta !== 'string' ? <div className="mt-1 text-[11px] text-muted-foreground">{item.meta}</div> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TextSection({ title, content }: { title: string; content: ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/35 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
      <div className="text-sm leading-6 text-muted-foreground">{content}</div>
    </section>
  );
}

export default function VmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [vm, setVm] = useState<VmInventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVm = useCallback(async () => {
    if (typeof params.id !== 'string') {
      setVm(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setVm(await getVmInventoryById(params.id));
    } catch {
      setVm(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadVm();
  }, [loadVm]);

  useEffect(() => {
    if (!vm) {
      return;
    }

    setHeader({
      title: vm.name,
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'เครื่องเสมือน', href: '/dashboard/vm' },
        { label: vm.name },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader, vm]);

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`คัดลอก ${label} แล้ว`);
    } catch {
      toast.error(`ไม่สามารถคัดลอก ${label.toLowerCase()} ได้`);
    }
  };

  if (loading) {
    return <div className="surface-panel p-4 text-sm text-muted-foreground">กำลังโหลดรายละเอียด VM...</div>;
  }

  if (!vm) {
    return (
      <div className="space-y-4 pb-8">
        <button
          onClick={() => router.push('/dashboard/vm')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้า VM
        </button>
        <div className="surface-panel p-4 text-sm text-muted-foreground">ไม่พบข้อมูล VM</div>
      </div>
    );
  }

  const getLifecycleBadgeClassName = (state: VmInventoryDetail['lifecycleState']) => {
    if (state === 'ACTIVE') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (state === 'DRAFT') {
      return 'border-violet-500/25 bg-violet-500/10 text-violet-300';
    }

    return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  };

  const getSyncBadgeClassName = () => {
    if (vm.syncState === 'Synced') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (vm.syncState === 'Ready to sync') {
      return 'border-sky-500/25 bg-sky-500/10 text-sky-300';
    }

    return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  };

  const lifecycleMessage =
    vm.lifecycleState === 'DRAFT'
      ? 'บันทึกฉบับร่างที่สร้างจากการค้นพบ vCenter ตรวจสอบบริบทด้วยตนเองก่อนอนุมัติ'
      : vm.lifecycleState === 'DELETED_IN_VCENTER'
        ? 'VM นี้ไม่มีอยู่ใน vCenter อีกต่อไป เก็บถาวรหรือลบบันทึกหลังตรวจสอบ'
        : 'VM นี้ใช้งานอยู่และซิงค์กับแหล่งข้อมูลที่เชื่อมต่อ';
  const storageValue =
    vm.disks && vm.disks.length > 0 ? `รวม ${vm.storageGb} GB (${vm.disks.length} ดิสก์)` : `${vm.storageGb} GB`;
  const storageMeta =
    vm.disks && vm.disks.length > 0 ? (
      <div className="space-y-1">
        {vm.disks.map((disk) => (
          <div key={`${disk.label}-${disk.sizeGb}-${disk.datastore ?? 'default'}`}>
            {disk.label}: {disk.sizeGb} GB{disk.datastore ? ` (${disk.datastore})` : ''}
          </div>
        ))}
      </div>
    ) : (
      'ความจุที่จัดสรรทั้งหมด'
    );
  const identityAndPlacementDetails: DetailListItem[] = [
    {
      label: 'vCenter',
      value: vm.vcenterName,
    },
    {
      label: 'MoID',
      value: vm.moid,
    },
    {
      label: 'IP หลัก',
      value: vm.primaryIp,
    },
    {
      label: 'พลังงาน',
      value: vm.powerState,
      meta: vm.lastSyncAt === '--' ? undefined : vm.lastSyncAt,
    },
    {
      label: 'โฮสต์',
      value: vm.host,
    },
    {
      label: 'คลัสเตอร์',
      value: vm.cluster,
    },
  ];
  const infrastructureDetails: DetailListItem[] = [
    {
      label: 'ระบบปฏิบัติการ',
      value: vm.guestOs,
    },
    {
      label: 'CPU',
      value: `${vm.cpuCores} vCPU`,
    },
    {
      label: 'หน่วยความจำ',
      value: `${vm.memoryGb} GB`,
    },
    {
      label: 'พื้นที่จัดเก็บ',
      value: storageValue,
      meta: storageMeta,
    },
    {
      label: 'เครือข่าย',
      value: vm.networkLabel,
    },
  ];
  const assetOpsDetails: DetailListItem[] = [
    {
      label: 'ชื่อระบบ',
      value: vm.systemName,
    },
    {
      label: 'สภาพแวดล้อม',
      value: vm.environment,
    },
    {
      label: 'บทบาทบริการ',
      value: vm.serviceRole,
    },
    {
      label: 'แท็ก',
      value:
        vm.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {vm.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          '--'
        ),
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => router.push('/dashboard/vm')}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับไปหน้า VM
      </button>

      {vm.lifecycleState !== 'ACTIVE' || vm.syncState !== 'Synced' ? (
        <div className="surface-panel border-amber-500/20 bg-amber-500/8 p-4 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-amber-300" />
            <div>
              <div className="font-semibold">ต้องการการตรวจสอบวงจรการใช้งาน</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{lifecycleMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="workspace-hero">
        <div className="flex flex-col gap-6">
          <div className="page-breadcrumb">
            <span>พื้นที่ทำงาน</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>คอมพิวต์</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>VM</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>{vm.name}</span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[22px] font-semibold tracking-[0.01em] text-foreground">{vm.name}</h1>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${getLifecycleBadgeClassName(vm.lifecycleState)}`}>
                    {vm.lifecycleState}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${getSyncBadgeClassName()}`}>{vm.syncState}</span>
                </div>
                <div className="text-sm font-medium text-foreground/90">{vm.systemName}</div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
                <span>IP <span className="font-medium text-foreground">{vm.primaryIp}</span></span>
                <span>Host <span className="font-medium text-foreground">{vm.host}</span></span>
                <span>Cluster <span className="font-medium text-foreground">{vm.cluster}</span></span>
                <span>Source <span className="font-medium text-foreground">{vm.vcenterName}</span></span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                แก้ไข VM
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setArchiveOpen(true)}>
                เก็บถาวร
              </Button>
            </div>
          </div>

        </div>
      </section>

      <section className="space-y-4">
        <section className="surface-panel p-4">
          <div className="border-b border-border/70 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">รายละเอียด VM</h2>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DetailListSection title="ข้อมูลประจำตัวและตำแหน่ง" items={identityAndPlacementDetails} />
            <DetailListSection title="โครงสร้างพื้นฐาน" items={infrastructureDetails} />
            <DetailListSection title="บริบท AssetOps" items={assetOpsDetails} />
            <div className="space-y-4">
              <TextSection title="วัตถุประสงค์บริการ" content={vm.description || '--'} />
              <TextSection title="หมายเหตุ" content={vm.notes || '--'} />
            </div>
          </div>
        </section>

        <section className="surface-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">บัญชีระบบปฏิบัติการ</h3>
          </div>

          <div className="table-shell">
            <div className="overflow-x-auto">
              <table className="table-frame min-w-[880px]">
                <thead>
                  <tr className="table-head-row">
                    <th className="px-3 py-2.5 font-medium">ชื่อผู้ใช้</th>
                    <th className="px-3 py-2.5 font-medium">รหัสผ่าน</th>
                    <th className="px-3 py-2.5 font-medium">การเข้าถึง</th>
                    <th className="px-3 py-2.5 font-medium">บทบาท</th>
                    <th className="px-3 py-2.5 font-medium">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.guestAccounts.map((account) => {
                    const revealed = Boolean(revealedPasswords[account.username]);

                    return (
                      <tr key={account.username} className="table-row">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <span className="font-mono text-[12px] font-semibold text-foreground">{account.username}</span>
                            <button
                              type="button"
                              onClick={() => void copyValue(account.username, 'ชื่อผู้ใช้')}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-semibold tracking-[0.16em] text-foreground">
                              {revealed ? account.password : '************'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRevealedPasswords((current) => ({ ...current, [account.username]: !revealed }))}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void copyValue(account.password, 'รหัสผ่าน')}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {account.accessMethod}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {account.role}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{account.note || '--'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>

      <VmFormDialog
        key={`vm-edit-${vm.id}-${editOpen ? 'open' : 'closed'}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        vmToEdit={vm}
        onSuccess={() => void loadVm()}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle className="text-base">เก็บถาวร VM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              เก็บถาวร <span className="font-medium text-foreground">{vm.name}</span> และเก็บประวัติไว้ใน AssetOps?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await archiveVmInventory(vm.id);
                    setArchiveOpen(false);
                    toast.success('เก็บถาวร VM สำเร็จ');
                    router.push('/dashboard/vm');
                  } catch {
                    toast.error('ไม่สามารถเก็บถาวร VM ได้');
                  }
                }}
              >
                เก็บถาวร
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
