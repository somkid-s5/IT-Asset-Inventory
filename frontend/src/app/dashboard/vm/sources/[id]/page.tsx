'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CircleOff, Eye, EyeOff, Monitor, Server, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VmFormDialog } from '@/components/VmFormDialog';
import { VM_CRITICALITY_OPTIONS, type VmDiscoveryItem } from '@/lib/vm-inventory';
import { archiveVmDiscovery, getVmDiscovery, promoteVmDiscovery } from '@/services/vm';

function getPlacementResolutionCopy(resolution?: string, scope: 'host' | 'cluster') {
  if (resolution === 'DIRECT_VM') {
    return `Exact per-VM ${scope} from vCenter`;
  }

  if (resolution === 'SOURCE_SINGLE_HOST' || resolution === 'SOURCE_SINGLE_CLUSTER') {
    return `Fallback from source-level ${scope} inventory`;
  }

  return `${scope === 'host' ? 'Host' : 'Cluster'} placement was not returned by the source`;
}

export default function VmSourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [revealedNotes, setRevealedNotes] = useState(false);
  const [draft, setDraft] = useState<VmDiscoveryItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDraft = useCallback(async () => {
    if (typeof params.id !== 'string') {
      setDraft(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setDraft(await getVmDiscovery(params.id));
    } catch {
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  const draftStats = useMemo(() => {
    if (!draft) {
      return { completeness: 0, missing: 0, accounts: 0 };
    }

    return {
      completeness: draft.completeness,
      missing: draft.missingFields.length,
      accounts: draft.guestAccountsCount,
    };
  }, [draft]);

  if (loading) {
    return <div className="surface-panel p-4 text-sm text-muted-foreground">Loading VM discovery...</div>;
  }

  if (!draft) {
    return (
      <div className="space-y-4 pb-8">
        <button
          onClick={() => router.push('/dashboard/vm/sources')}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to vCenter Sources
        </button>
        <div className="surface-panel p-4 text-sm text-muted-foreground">Discovery record not found.</div>
      </div>
    );
  }

  const stateLabel =
    draft.state === 'READY_TO_PROMOTE'
      ? 'Ready to promote'
      : draft.state === 'DRIFTED'
        ? 'Needs review'
        : 'Needs context';

  const stateClassName =
    draft.state === 'READY_TO_PROMOTE'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
      : draft.state === 'DRIFTED'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
        : 'border-violet-500/25 bg-violet-500/10 text-violet-300';
  const suggestedCriticalityLabel =
    VM_CRITICALITY_OPTIONS.find(
      (item) => item.value === draft.suggestedCriticality,
    )?.label ?? '--';

  const buildPromotePayload = () => ({
    systemName: draft.systemName ?? '',
    environment: draft.environment ?? draft.suggestedEnvironment ?? 'PROD',
    owner: draft.owner ?? draft.suggestedOwner ?? '',
    businessUnit: draft.businessUnit ?? '',
    slaTier: draft.slaTier ?? '',
    serviceRole: draft.serviceRole ?? draft.suggestedServiceRole ?? '',
    criticality: draft.criticality ?? draft.suggestedCriticality ?? 'STANDARD',
    description: draft.description ?? draft.note ?? '',
    notes: draft.notes ?? '',
    lifecycleState: 'ACTIVE' as const,
    tags: draft.tags.join(', '),
    guestAccounts: (draft.guestAccounts ?? []).map((account) => ({
      username: account.username,
      password: account.password,
      accessMethod: account.accessMethod,
      role: account.role,
      note: account.note ?? '',
    })),
  });

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => router.push('/dashboard/vm/sources')}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to vCenter Sources
      </button>

      <section className="workspace-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className="icon-chip h-11 w-11 shrink-0 text-foreground">
                <Monitor className="h-5 w-5" />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-xl font-semibold uppercase tracking-[0.06em] text-foreground">{draft.name}</h1>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${stateClassName}`}>{stateLabel}</span>
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                    {draft.sourceName}
                  </span>
                </div>

                <div className="text-sm font-semibold text-foreground">
                  {draft.systemName || 'System name not set'}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <span>MoID {draft.moid}</span>
                  <span>/</span>
                  <span>{draft.cluster}</span>
                  <span>/</span>
                  <span>{draft.host}</span>
                </div>

                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{draft.note}</p>
              </div>
            </div>
          </div>

          <div className="stats-grid sm:grid-cols-3">
            <div className="stat-tile">
              <div className="stat-kicker">Completeness</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{draftStats.completeness}%</div>
            </div>
            <div className="stat-tile">
              <div className="stat-kicker">Missing Fields</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{draftStats.missing}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-kicker">Guest Accounts</div>
              <div className="mt-2 text-lg font-semibold text-foreground">{draftStats.accounts}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Complete Draft
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              if (draft.completeness < 100) {
                toast.error('Complete all required VM context fields before approval');
                return;
              }
              try {
                const inventory = await promoteVmDiscovery(draft.id, buildPromotePayload());
                toast.success('VM promoted to active inventory');
                router.push(`/dashboard/vm/${inventory.id}`);
              } catch {
                toast.error('Failed to promote VM');
              }
            }}
          >
            Approve
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setArchiveOpen(true)}>
            Archive
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="surface-panel p-4">
            <div className="border-b border-border/70 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Discovered From vCenter</h2>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Source</div>
                  <div className="text-sm font-semibold text-foreground">{draft.sourceName}</div>
                  <div className="text-[11px] text-muted-foreground">Connected vCenter source</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <CircleOff className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">MoID</div>
                  <div className="text-sm font-semibold text-foreground">{draft.moid}</div>
                  <div className="text-[11px] text-muted-foreground">Unique VM identity</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Runtime</div>
                  <div className="text-sm font-semibold text-foreground">{draft.powerState}</div>
                  <div className="text-[11px] text-muted-foreground">{draft.lastSeen}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Guest OS</div>
                  <div className="text-sm font-semibold text-foreground">{draft.guestOs}</div>
                  <div className="text-[11px] text-muted-foreground">{draft.primaryIp}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">CPU / Memory</div>
                  <div className="text-sm font-semibold text-foreground">{draft.cpuCores} vCPU / {draft.memoryGb} GB</div>
                  <div className="text-[11px] text-muted-foreground">Read-only from source sync</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Storage / Network</div>
                  <div className="text-sm font-semibold text-foreground">{draft.storageGb} GB</div>
                  <div className="text-[11px] text-muted-foreground">{draft.networkLabel}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Host</div>
                  <div className="text-sm font-semibold text-foreground">{draft.host}</div>
                  <div className="text-[11px] text-muted-foreground">{getPlacementResolutionCopy(draft.hostResolution, 'host')}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cluster</div>
                  <div className="text-sm font-semibold text-foreground">{draft.cluster}</div>
                  <div className="text-[11px] text-muted-foreground">{getPlacementResolutionCopy(draft.clusterResolution, 'cluster')}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="muted-panel px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Missing Fields</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draft.missingFields.length > 0 ? (
                    draft.missingFields.map((field) => (
                      <span key={field} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground">
                        {field}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No missing fields.</span>
                  )}
                </div>
              </div>
              <div className="muted-panel px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tags</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draft.tags.length > 0 ? (
                    draft.tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No tags returned by the source.</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">AssetOps Context To Fill</h3>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">System Name</div>
                  <div className="text-sm font-semibold text-foreground">{draft.systemName || '--'}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Suggested Owner</div>
                  <div className="text-sm font-semibold text-foreground">{draft.suggestedOwner || '--'}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Suggested Environment</div>
                  <div className="text-sm font-semibold text-foreground">{draft.suggestedEnvironment || '--'}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Suggested Service Role</div>
                  <div className="text-sm font-semibold text-foreground">{draft.suggestedServiceRole || '--'}</div>
                </div>
              </div>
              <div className="metric-pair">
                <div className="icon-chip h-9 w-9 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Suggested Criticality</div>
                  <div className="text-sm font-semibold text-foreground">{suggestedCriticalityLabel}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 muted-panel px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Discovery Note</div>
                <button
                  type="button"
                  onClick={() => setRevealedNotes((current) => !current)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {revealedNotes ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{revealedNotes ? draft.note || '--' : 'Hidden until reviewed'}</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Promotion Steps</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>1. Review the discovered VM data from vCenter.</p>
              <p>2. Fill the missing AssetOps context fields.</p>
              <p>3. Promote the draft into the active VM inventory.</p>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Queue Summary</h3>
            </div>
            <div className="mt-3 space-y-3">
              <div className="muted-panel px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Completeness</div>
                <div className="mt-2 text-sm font-semibold text-foreground">{draft.completeness}%</div>
              </div>
              <div className="muted-panel px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Guest Accounts</div>
                <div className="mt-2 text-sm font-semibold text-foreground">{draft.guestAccountsCount}</div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <VmFormDialog
        key={`draft-edit-${draft.id}-${editOpen ? 'open' : 'closed'}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        discoveryVm={draft}
        onSuccess={() => void loadDraft()}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>Archive Discovery Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Archive <span className="font-medium text-foreground">{draft.name}</span> from the discovery queue?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await archiveVmDiscovery(draft.id);
                    setArchiveOpen(false);
                    toast.success('Discovery item archived');
                    router.push('/dashboard/vm/sources');
                  } catch {
                    toast.error('Failed to archive discovery item');
                  }
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
