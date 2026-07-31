'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Eye, EyeOff, ShieldCheck, Sparkles, Monitor, Cpu, Server, HardDrive, Network, Tag, Clock, Globe, LoaderCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VmFormDialog } from '@/components/VmFormDialog';
import type { VmInventoryDetail } from '@/lib/vm-inventory';
import { archiveVmInventory, getVmInventoryById, revealVmGuestAccountPassword } from '@/services/vm';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function VmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RESOURCES' | 'CONTEXT'>('OVERVIEW');

  const { data: vm, isLoading: loading, isError, refetch: loadVm } = useQuery({
    queryKey: ['vm-inventory-detail', params?.id],
    queryFn: async () => {
      if (typeof params?.id !== 'string') throw new Error('Invalid ID');
      return await getVmInventoryById(params.id);
    },
    enabled: typeof params?.id === 'string',
  });

  useEffect(() => {
    if (isError) {
      toast.error('Failed to load virtual machine details');
      router.push('/dashboard/virtual-machines');
    }
  }, [isError, router]);

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

  const handleRevealPassword = async (accountId: string) => {
    if (revealed.has(accountId)) {
      setRevealed(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
      return;
    }

    try {
      if (!passwords[accountId]) {
        const res = await revealVmGuestAccountPassword(accountId);
        setPasswords(prev => ({ ...prev, [accountId]: res.password }));
      }
      setRevealed(prev => {
        const next = new Set(prev);
        next.add(accountId);
        return next;
      });
    } catch {
      toast.error('Failed to reveal password');
    }
  };

  const handleCopyPassword = async (account: VmInventoryDetail['guestAccounts'][number]) => {
    const accountId = account.id || '';
    let pwd = passwords[accountId];
    if (!pwd) {
      try {
        const res = await revealVmGuestAccountPassword(accountId);
        pwd = res.password;
        setPasswords(prev => ({ ...prev, [accountId]: pwd }));
      } catch {
        toast.error('Failed to copy password');
        return;
      }
    }
    void copyValue(pwd, 'Password');
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
    if (state === 'ACTIVE') return { label: 'Active', class: 'border-success/25 bg-success/10 text-success' };
    if (state === 'DRAFT') return { label: 'Draft', class: 'border-low/25 bg-low/10 text-low' };
    return { label: 'Archived', class: 'border-critical/25 bg-critical/10 text-critical' };
  };
  const lifecycleBadge = getLifecycleBadge(vm.lifecycleState);

  const getSyncBadge = (state: VmInventoryDetail['syncState']) => {
    const normalizedState = String(state).trim().toLowerCase();
    if (normalizedState === 'synced') return { label: 'Synced', class: 'border-success/25 bg-success/10 text-success' };
    if (normalizedState === 'ready to sync') return { label: 'Ready to Sync', class: 'border-info/25 bg-info/10 text-info' };
    if (normalizedState === 'connection failed') return { label: 'Connection Failed', class: 'border-critical/25 bg-critical/10 text-critical' };
    return { label: 'Missing', class: 'border-warning/25 bg-warning/10 text-warning' };
  };
  const syncBadge = getSyncBadge(vm.syncState);
  const isSynced = syncBadge.label === 'Synced';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="workspace-page space-y-4 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
         <button onClick={() => router.push('/dashboard/virtual-machines')} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
           <ArrowLeft className="h-4 w-4" /> Back to VMs
         </button>
         <div className="flex w-full shrink-0 flex-wrap justify-end gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="h-8 shadow-sm">Edit VM</Button>
            <Button variant="destructive" size="sm" onClick={() => setArchiveOpen(true)} className="h-8 shadow-sm">Archive</Button>
         </div>
      </div>

      {vm.lifecycleState !== 'ACTIVE' || !isSynced ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <div className="flex min-w-0 items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold break-words">Lifecycle Attention Required</div>
              <p className="mt-1 break-words text-xs opacity-90">
                {vm.lifecycleState === 'DRAFT' ? 'Draft record created from vCenter discovery. Review the context before promoting it.' : vm.lifecycleState === 'DELETED_IN_VCENTER' ? 'This VM is no longer present in vCenter. Archive or delete the record after review.' : 'This VM is active and synced with the connected source.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="space-y-4">
          <section className="glass-card overflow-hidden">
            <div className="relative flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
              
              <div className="relative z-10 flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-low to-primary text-white shadow-xl">
                  <Monitor className="h-6 w-6" />
                </div>

                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="max-w-full truncate text-2xl font-bold tracking-tight text-foreground sm:max-w-[400px]" title={vm.name}>{vm.name}</h1>
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0", lifecycleBadge.class)}>{lifecycleBadge.label}</span>
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0", syncBadge.class)}>{syncBadge.label}</span>
                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border-border bg-muted/50 text-foreground shrink-0")}>{vm.powerState}</span>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-muted-foreground">
                    <span className="min-w-0 max-w-full truncate font-semibold text-foreground/80 sm:max-w-[250px]">{vm.systemName}</span>
                    <span className="flex items-center gap-1.5 shrink-0"><Globe className="h-3.5 w-3.5" /> <span className="font-mono text-xs text-foreground">{vm.primaryIp}</span></span>
                    <span className="flex min-w-0 max-w-full items-center gap-1.5"><Server className="h-3.5 w-3.5 shrink-0" /> <span className="truncate text-foreground">{vm.host}</span></span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                <div className="flex min-w-[84px] flex-col items-center justify-center rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 shadow-sm">
                   <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Cpu className="h-3 w-3"/> CPU</span>
                   <span className="text-xl font-bold text-foreground">{vm.cpuCores} <span className="text-sm font-medium text-muted-foreground">vCPU</span></span>
                </div>
                <div className="flex min-w-[84px] flex-col items-center justify-center rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 shadow-sm">
                   <span className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><HardDrive className="h-3 w-3"/> RAM</span>
                   <span className="text-xl font-bold text-foreground">{vm.memoryGb} <span className="text-sm font-medium text-muted-foreground">GB</span></span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-5 overflow-x-auto border-t border-border/50 bg-background/30 px-4 sm:px-6 custom-scrollbar">
               {(['OVERVIEW', 'RESOURCES', 'CONTEXT'] as const).map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider transition-colors",
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
          <section className="glass-card min-h-[300px] p-4 sm:p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {activeTab === 'OVERVIEW' && (
                  <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                     <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Server className="h-4 w-4"/> Connection Information</h3>
                       <div className="space-y-3">
                          <DetailRow label="vCenter Source" value={vm.vcenterName} />
                          <DetailRow label="MoID" value={<span className="font-mono text-xs">{vm.moid}</span>} />
                          <DetailRow label="IP Address" value={<span className="font-mono text-xs">{vm.primaryIp}</span>} />
                          <DetailRow label="Host / Cluster" value={<>{vm.host} <span className="text-muted-foreground">({vm.cluster})</span></>} />
                       </div>
                     </div>
                     <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Status & Timing</h3>
                       <div className="space-y-3">
                          <DetailRow label="Power State" value={vm.powerState} />
                          <DetailRow label="Sync State" value={syncBadge.label} />
                          <DetailRow label="Last Sync" value={vm.lastSyncAt} />
                       </div>
                     </div>
                  </div>
                )}

                {activeTab === 'RESOURCES' && (
                  <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                     <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><HardDrive className="h-4 w-4"/> System Resources</h3>
                       <div className="space-y-3">
                          <DetailRow label="OS" value={vm.guestOs} />
                          <DetailRow label="CPU" value={`${vm.cpuCores} Cores`} />
                          <DetailRow label="Memory" value={`${vm.memoryGb} GB`} />
                          <DetailRow label="Network" value={vm.networkLabel} />
                       </div>
                     </div>
                     <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Database className="h-4 w-4"/> Storage Allocation</h3>
                       <div className="space-y-3">
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
                  </div>
                )}

                {activeTab === 'CONTEXT' && (
                  <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                     <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Tag className="h-4 w-4"/> AssetOps Context</h3>
                       <div className="space-y-3">
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
                     <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Ownership & Usage</h3>
                       <div className="space-y-3">
                          <DetailRow label="Description" value={vm.description || '--'} align="col" />
                          <DetailRow label="Notes" value={vm.notes || '--'} align="col" />
                       </div>
                     </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          {/* Guest Accounts Table */}
          <section className="glass-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border/50 px-4 py-3 sm:px-5">
               <h2 className="flex items-center gap-2 text-base font-bold tracking-tight"><ShieldCheck className="h-4 w-4 text-success"/> Guest OS Accounts</h2>
            </div>
            <div className="p-0 overflow-x-auto">
              {vm.guestAccounts.length === 0 ? (
                 <div className="p-8 text-center text-sm text-muted-foreground">No account information saved</div>
              ) : (
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 sm:px-4">Username</th>
                      <th className="px-3 py-2.5 sm:px-4">Password</th>
                      <th className="px-3 py-2.5 sm:px-4">Method</th>
                      <th className="px-3 py-2.5 sm:px-4">Role</th>
                      <th className="px-3 py-2.5 sm:px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {vm.guestAccounts.map(account => {
                      const accountId = account.id || '';
                      const isRev = revealed.has(accountId);
                      const pwdText = passwords[accountId] || '••••••••••••';
                      return (
                        <tr key={account.username} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 sm:px-4">
                            <div className="flex items-center gap-2">
                               <span className="font-mono font-semibold">{account.username}</span>
                               <button aria-label="Copy username" onClick={() => { void copyValue(account.username, 'Username'); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 sm:px-4">
                            <div className="flex items-center gap-2">
                               <div className="font-mono bg-muted/50 px-2 py-1 rounded-md min-w-[160px] text-center font-semibold tabular-nums transition-all">
                                 {isRev ? pwdText : '••••••••••••'}
                               </div>
                               <button aria-label={isRev ? "Hide password" : "Reveal password"} onClick={() => { void handleRevealPassword(accountId); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                                 {isRev ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                               </button>
                               <button aria-label="Copy password" onClick={() => { void handleCopyPassword(account); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                                 <Copy className="h-4 w-4" />
                               </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 sm:px-4"><span className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-semibold">{account.accessMethod}</span></td>
                          <td className="px-3 py-2.5 sm:px-4"><span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-semibold">{account.role}</span></td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground sm:px-4">{account.note || '--'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

      </div>

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
