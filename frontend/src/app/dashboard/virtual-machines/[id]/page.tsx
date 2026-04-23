'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Eye, EyeOff, ShieldCheck, Sparkles, Monitor, Cpu, Server, HardDrive, Network, Tag, Clock, Globe, LoaderCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VmFormDialog } from '@/components/VmFormDialog';
import type { VmInventoryDetail } from '@/lib/vm-inventory';
import { archiveVmInventory, getVmInventoryById } from '@/services/vm';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function VmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [vm, setVm] = useState<VmInventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RESOURCES' | 'CONTEXT'>('OVERVIEW');

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

  useEffect(() => { void loadVm(); }, [loadVm]);

  useEffect(() => {
    if (!vm) return;
    setHeader({
      title: vm.name,
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Virtual Machines', href: '/dashboard/virtual-machines' },
        { label: vm.name },
      ],
    });
    return () => setHeader(null);
  }, [setHeader, vm]);

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground"><LoaderCircle className="mb-3 h-6 w-6 animate-spin text-primary" /><p className="text-sm">Loading VM details...</p></div>;
  }

  if (!vm) {
    return (
      <div className="space-y-4 pb-8">
        <button onClick={() => router.push('/dashboard/virtual-machines')} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to VMs
        </button>
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">Virtual machine not found</div>
      </div>
    );
  }

  const getLifecycleBadge = (state: VmInventoryDetail['lifecycleState']) => {
    if (state === 'ACTIVE') return { label: 'Active', class: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' };
    if (state === 'DRAFT') return { label: 'Draft', class: 'border-violet-500/25 bg-violet-500/10 text-violet-500' };
    return { label: 'Archived', class: 'border-rose-500/25 bg-rose-500/10 text-rose-500' };
  };
  const lifecycleBadge = getLifecycleBadge(vm.lifecycleState);

  const getSyncBadge = (state: VmInventoryDetail['syncState']) => {
    if (state === 'Synced') return { label: 'Synced', class: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500' };
    if (state === 'Ready to sync') return { label: 'Ready to Sync', class: 'border-sky-500/25 bg-sky-500/10 text-sky-500' };
    return { label: 'Missing', class: 'border-amber-500/25 bg-amber-500/10 text-amber-500' };
  };
  const syncBadge = getSyncBadge(vm.syncState);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="workspace-page space-y-6 pt-2">
      <div className="flex justify-between items-center">
         <button onClick={() => router.push('/dashboard/virtual-machines')} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
           <ArrowLeft className="h-4 w-4" /> Back to VMs
         </button>
         <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="h-8 shadow-sm">Edit VM</Button>
            <Button variant="destructive" size="sm" onClick={() => setArchiveOpen(true)} className="h-8 shadow-sm">Archive</Button>
         </div>
      </div>

      {vm.lifecycleState !== 'ACTIVE' || vm.syncState !== 'Synced' ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-bold">Lifecycle Attention Required</div>
              <p className="mt-1 text-xs opacity-90">
                {vm.lifecycleState === 'DRAFT' ? 'บันทึกฉบับร่างที่สร้างจากการค้นพบ vCenter ตรวจสอบบริบทด้วยตนเองก่อนอนุมัติ' : vm.lifecycleState === 'DELETED_IN_VCENTER' ? 'VM นี้ไม่มีอยู่ใน vCenter อีกต่อไป เก็บถาวรหรือลบบันทึกหลังตรวจสอบ' : 'VM นี้ใช้งานอยู่และซิงค์กับแหล่งข้อมูลที่เชื่อมต่อ'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="glass-card overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between relative">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
          
          <div className="flex items-start gap-5 relative z-10">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl">
              <Monitor className="h-7 w-7" />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[400px]" title={vm.name}>{vm.name}</h1>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0", lifecycleBadge.class)}>{lifecycleBadge.label}</span>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0", syncBadge.class)}>{syncBadge.label}</span>
                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border-border bg-muted/50 text-foreground shrink-0")}>{vm.powerState}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1 min-w-0">
                <span className="font-semibold text-foreground/80 truncate max-w-[250px]">{vm.systemName}</span>
                <span className="flex items-center gap-1.5 shrink-0"><Globe className="h-3.5 w-3.5" /> <span className="font-mono text-xs text-foreground">{vm.primaryIp}</span></span>
                <span className="flex items-center gap-1.5 shrink-0"><Server className="h-3.5 w-3.5" /> <span className="text-foreground">{vm.host}</span></span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end relative z-10">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-5 py-2.5 shadow-sm">
               <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><Cpu className="h-3 w-3"/> CPU</span>
               <span className="text-xl font-bold text-foreground">{vm.cpuCores} <span className="text-sm font-medium text-muted-foreground">vCPU</span></span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-5 py-2.5 shadow-sm">
               <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1"><HardDrive className="h-3 w-3"/> RAM</span>
               <span className="text-xl font-bold text-foreground">{vm.memoryGb} <span className="text-sm font-medium text-muted-foreground">GB</span></span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 px-6 sm:px-8 border-t border-border/50 bg-background/30 overflow-x-auto custom-scrollbar">
           {(['OVERVIEW', 'RESOURCES', 'CONTEXT'] as const).map(tab => (
             <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-4 text-sm font-semibold uppercase tracking-wider transition-colors relative whitespace-nowrap",
                  activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
             >
               {tab}
               {activeTab === tab && (
                 <motion.div layoutId="vm-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
               )}
             </button>
           ))}
        </div>
      </section>

      {/* Tab Content */}
      <section className="glass-card p-6 sm:p-8 min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-x-12 gap-y-8 md:grid-cols-2">
               <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Server className="h-4 w-4"/> Connection Information</h3>
                 <div className="space-y-4">
                    <DetailRow label="vCenter Source" value={vm.vcenterName} />
                    <DetailRow label="MoID" value={<span className="font-mono text-xs">{vm.moid}</span>} />
                    <DetailRow label="IP Address" value={<span className="font-mono text-xs">{vm.primaryIp}</span>} />
                    <DetailRow label="Host / Cluster" value={<>{vm.host} <span className="text-muted-foreground">({vm.cluster})</span></>} />
                 </div>
               </div>
               <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Status & Timing</h3>
                 <div className="space-y-4">
                    <DetailRow label="Power State" value={vm.powerState} />
                    <DetailRow label="Sync State" value={vm.syncState} />
                    <DetailRow label="Last Sync" value={vm.lastSyncAt} />
                 </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'RESOURCES' && (
            <motion.div key="resources" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-x-12 gap-y-8 md:grid-cols-2">
               <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><HardDrive className="h-4 w-4"/> System Resources</h3>
                 <div className="space-y-4">
                    <DetailRow label="OS" value={vm.guestOs} />
                    <DetailRow label="CPU" value={`${vm.cpuCores} Cores`} />
                    <DetailRow label="Memory" value={`${vm.memoryGb} GB`} />
                    <DetailRow label="Network" value={vm.networkLabel} />
                 </div>
               </div>
               <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Database className="h-4 w-4"/> Storage Allocation</h3>
                 <div className="space-y-4">
                    <DetailRow label="Total Storage" value={`${vm.storageGb} GB`} />
                    {vm.disks && vm.disks.length > 0 && (
                      <div className="pt-2 space-y-3 border-l-2 border-border/50 pl-4 ml-1">
                        {vm.disks.map((disk, idx) => (
                           <div key={idx} className="space-y-1.5">
                             <div className="flex justify-between text-sm">
                               <span className="font-semibold">{disk.label}</span>
                               <span className="font-mono text-xs">{disk.sizeGb} GB</span>
                             </div>
                             <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                               {/* Progress bar removed as requested due to lack of usage data */}
                             </div>
                             <div className="text-[11px] text-muted-foreground">Datastore: {disk.datastore || '--'}</div>
                           </div>
                        ))}
                      </div>
                    )}
                 </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'CONTEXT' && (
            <motion.div key="context" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-x-12 gap-y-8 md:grid-cols-2">
               <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4"/> AssetOps Context</h3>
                 <div className="space-y-4">
                    <DetailRow label="System Name" value={vm.systemName} />
                    <DetailRow label="Environment" value={vm.environment} />
                    <DetailRow label="Role" value={vm.serviceRole} />
                    <DetailRow label="Tags" value={
                      vm.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {vm.tags.map(t => <span key={t} className="px-2 py-0.5 bg-muted rounded-md text-[11px] font-medium">{t}</span>)}
                        </div>
                      ) : '--'
                    } />
                 </div>
               </div>
               <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Ownership & Usage</h3>
                 <div className="space-y-4">
                    <DetailRow label="Description" value={vm.description || '--'} align="col" />
                    <DetailRow label="Notes" value={vm.notes || '--'} align="col" />
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Guest Accounts Table */}
      <section className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border/50">
           <h2 className="text-lg font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500"/> Guest OS Accounts</h2>
        </div>
        <div className="p-0 overflow-x-auto">
          {vm.guestAccounts.length === 0 ? (
             <div className="p-8 text-center text-sm text-muted-foreground">No account information saved</div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Password</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {vm.guestAccounts.map(account => {
                  const isRev = revealedPasswords[account.username];
                  return (
                    <tr key={account.username} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="font-mono font-semibold">{account.username}</span>
                           <button onClick={() => { void copyValue(account.username, 'Username'); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="font-mono bg-muted/50 px-2 py-1 rounded-md min-w-[160px] text-center font-semibold tabular-nums transition-all">
                             {isRev ? account.password : '••••••••••••'}
                           </div>
                           <button onClick={() => setRevealedPasswords(c => ({...c, [account.username]: !isRev}))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                             {isRev ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                           <button onClick={() => { void copyValue(account.password, 'Password'); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                             <Copy className="h-4 w-4" />
                           </button>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 bg-background border border-border rounded-md text-[11px] font-semibold">{account.accessMethod}</span></td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 bg-muted rounded-md text-[11px] font-semibold">{account.role}</span></td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{account.note || '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <VmFormDialog open={editOpen} onOpenChange={setEditOpen} vmToEdit={vm} onSuccess={() => void loadVm()} />
      
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md bg-card rounded-2xl">
          <DialogHeader><DialogTitle className="text-destructive">Archive Virtual Machine</DialogTitle></DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">Are you sure you want to archive <span className="font-bold text-foreground">{vm.name}</span> and keep its historical record?</div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              try { await archiveVmInventory(vm.id); toast.success('VM Archived'); router.push('/dashboard/virtual-machines'); } catch { toast.error('Archive failed'); }
            }}>Archive</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function DetailRow({ label, value, align = 'row' }: { label: string, value: ReactNode, align?: 'row'|'col' }) {
  if (align === 'col') {
    return (
      <div className="space-y-1.5 min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-all">{value}</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-4 min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5 shrink-0">{label}</div>
      <div className="text-sm font-semibold text-foreground break-all">{value}</div>
    </div>
  );
}
