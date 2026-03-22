'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, CircleOff, Copy, Eye, EyeOff, Monitor, Server, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VmFormDialog } from '@/components/VmFormDialog';
import { getVmRecord, VM_CRITICALITY_OPTIONS, type VmInventoryDetail } from '@/lib/vm-inventory';

export default function VmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const vm = typeof params.id === 'string' ? getVmRecord(params.id) : null;

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const vmStats = useMemo(() => {
    if (!vm) {
      return { guestAccounts: 0, syncedFields: 0, manualFields: 0, tags: 0 };
    }

    return {
      guestAccounts: vm.guestAccounts.length,
      syncedFields: vm.syncedFields.length,
      manualFields: vm.managedFields.length,
      tags: vm.tags.length,
    };
  }, [vm]);

  if (!vm) {
    return (
      <div className="space-y-4 pb-8">
        <button
          onClick={() => router.push('/dashboard/vm')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to VM Inventory
        </button>
        <div className="surface-panel p-4 text-sm text-muted-foreground">VM record not found.</div>
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
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  };

  const lifecycleMessage =
    vm.lifecycleState === 'DRAFT'
      ? 'Draft record created from vCenter discovery. Review the manual context before approving.'
      : vm.lifecycleState === 'DELETED_IN_VCENTER'
        ? 'This VM no longer exists in vCenter. Keep the record archived or remove it after review.'
        : 'This VM is active and in sync with the connected source.';
  const criticalityLabel =
    VM_CRITICALITY_OPTIONS.find((item) => item.value === vm.criticality)?.label ??
    vm.criticality;

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => router.push('/dashboard/vm')}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to VM Inventory
      </button>

      {vm.lifecycleState !== 'ACTIVE' || vm.syncState !== 'Synced' ? (
        <div className="surface-panel border-amber-500/20 bg-amber-500/8 p-4 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-amber-300" />
            <div>
              <div className="font-semibold">Lifecycle attention needed</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{lifecycleMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="workspace-hero">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="icon-chip h-11 w-11 shrink-0 text-foreground">
                  <Monitor className="h-5 w-5" />
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate font-display text-xl font-semibold uppercase tracking-[0.06em] text-foreground">{vm.name}</h1>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${getLifecycleBadgeClassName(vm.lifecycleState)}`}>
                      {vm.lifecycleState}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${getSyncBadgeClassName()}`}>{vm.syncState}</span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {vm.vcenterName} / {vm.vcenterVersion}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span>MoID {vm.moid}</span>
                    <span>•</span>
                    <span>{vm.cluster}</span>
                    <span>•</span>
                    <span>{vm.host}</span>
                  </div>

                  <div className="text-sm font-semibold text-foreground">{vm.systemName}</div>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{vm.description}</p>
                </div>
              </div>
            </div>

            <div className="stats-grid sm:grid-cols-2 xl:grid-cols-4">
              <div className="stat-tile">
                <div className="stat-kicker">Guest Accounts</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{vmStats.guestAccounts}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-kicker">Synced Fields</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{vmStats.syncedFields}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-kicker">Manual Fields</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{vmStats.manualFields}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-kicker">Tags</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{vmStats.tags}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit Draft
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast.info('Approval flow will connect to backend later')}>
              Approve
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setArchiveOpen(true)}>
              Archive
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="surface-panel p-4">
            <div className="border-b border-border/70 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">VM Details</h2>
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Synced from vCenter</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">vCenter</div>
                      <div className="text-sm font-semibold text-foreground">{vm.vcenterName}</div>
                      <div className="text-[11px] text-muted-foreground">{vm.vcenterVersion}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Power</div>
                      <div className="text-sm font-semibold text-foreground">{vm.powerState}</div>
                      <div className="text-[11px] text-muted-foreground">{vm.lastSyncAt}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <CircleOff className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">MoID</div>
                      <div className="text-sm font-semibold text-foreground">{vm.moid}</div>
                      <div className="text-[11px] text-muted-foreground">Managed object id</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Monitor className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Primary IP</div>
                      <div className="text-sm font-semibold text-foreground">{vm.primaryIp}</div>
                      <div className="text-[11px] text-muted-foreground">{vm.guestOs}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">CPU / Memory</div>
                      <div className="text-sm font-semibold text-foreground">{vm.cpuCores} vCPU / {vm.memoryGb} GB</div>
                      <div className="text-[11px] text-muted-foreground">Source synced spec</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Storage / Network</div>
                      <div className="text-sm font-semibold text-foreground">{vm.storageGb} GB</div>
                      <div className="text-[11px] text-muted-foreground">{vm.networkLabel}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cluster</div>
                      <div className="text-sm font-semibold text-foreground">{vm.cluster}</div>
                      <div className="text-[11px] text-muted-foreground">{vm.host}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {vm.tags.map((tag) => (
                          <span key={tag} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Managed in AssetOps</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">System Name</div>
                      <div className="text-sm font-semibold text-foreground">{vm.systemName}</div>
                      <div className="text-[11px] text-muted-foreground">AssetOps context</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Environment</div>
                      <div className="text-sm font-semibold text-foreground">{vm.environment}</div>
                      <div className="text-[11px] text-muted-foreground">Manual context</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Owner</div>
                      <div className="text-sm font-semibold text-foreground">{vm.owner}</div>
                      <div className="text-[11px] text-muted-foreground">{vm.businessUnit}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">SLA Tier</div>
                      <div className="text-sm font-semibold text-foreground">{vm.slaTier}</div>
                      <div className="text-[11px] text-muted-foreground">{vm.syncState}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Service Role</div>
                      <div className="text-sm font-semibold text-foreground">{vm.serviceRole}</div>
                      <div className="text-[11px] text-muted-foreground">{criticalityLabel}</div>
                    </div>
                  </div>
                  <div className="metric-pair">
                    <div className="icon-chip h-9 w-9 text-muted-foreground">
                      <Monitor className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Service Purpose</div>
                      <div className="text-sm font-semibold text-foreground">{vm.description}</div>
                      <div className="text-[11px] text-muted-foreground">Business context</div>
                    </div>
                  </div>
                </div>

                <div className="muted-panel px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{vm.notes}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Guest OS Accounts</h3>
            </div>

            <div className="table-shell">
              <div className="overflow-x-auto">
                <table className="table-frame min-w-[880px]">
                  <thead>
                    <tr className="table-head-row">
                      <th className="px-3 py-3 font-medium">Username</th>
                      <th className="px-3 py-3 font-medium">Password</th>
                      <th className="px-3 py-3 font-medium">Access</th>
                      <th className="px-3 py-3 font-medium">Role</th>
                      <th className="px-3 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.guestAccounts.map((account) => {
                      const revealed = Boolean(revealedPasswords[account.username]);

                      return (
                        <tr key={account.username} className="table-row">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              <span className="font-mono text-[13px] font-semibold text-foreground">{account.username}</span>
                              <button
                                type="button"
                                onClick={() => void copyValue(account.username, 'Username')}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13px] font-semibold tracking-[0.18em] text-foreground">
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
                                onClick={() => void copyValue(account.password, 'Password')}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground">
                              {account.accessMethod}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                              {account.role}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[12px] text-muted-foreground">{account.note || '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Source History</h3>
            </div>
            <div className="mt-3 space-y-2">
              {vm.sourceHistory.map((source) => (
                <div key={`${source.label}-${source.version}`} className="metric-pair">
                  <div className="icon-chip h-9 w-9 text-muted-foreground">
                    <Server className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-foreground">{source.label}</div>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{source.version}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{source.lastSeen}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{source.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Sync Scope</h3>
            </div>
            <div className="mt-3 space-y-3">
              <div className="muted-panel px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Synced automatically</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  VM name, MoID, power state, host, cluster, guest OS, primary IP, and vCenter tags.
                </p>
              </div>
              <div className="muted-panel px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Managed manually</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  System name, owner, environment, business unit, SLA tier, description, notes, and guest OS credentials.
                </p>
              </div>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Lifecycle</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>Draft records are created from discovery and held for approval.</p>
              <p>Active records are the operational inventory that the team relies on.</p>
              <p>Deleted records remain visible for audit history before archive or purge.</p>
            </div>
          </section>
        </div>
      </section>

      <VmFormDialog key={`vm-edit-${vm.id}-${editOpen ? 'open' : 'closed'}`} open={editOpen} onOpenChange={setEditOpen} vmToEdit={vm} />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle className="text-base">Archive VM</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Archive <span className="font-medium text-foreground">{vm.name}</span> and keep the history in AssetOps?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setArchiveOpen(false);
                  toast.success('Archive flow will connect to the backend later');
                }}
              >
                Archive
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
