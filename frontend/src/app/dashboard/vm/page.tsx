'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Monitor,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';
import { VmFormDialog } from '@/components/LazyLoadedDialogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  type VmDiscoveryItem,
  type VmInventoryItem,
} from '@/lib/vm-inventory';
import { getVmDiscoveries, getVmDiscovery, getVmInventory, getVmSources } from '@/services/vm';

type InventoryView = 'PENDING' | 'ACTIVE' | 'ORPHANED';
type OrphanedVmRecord = {
  id: string;
  name: string;
  displayName?: string | null;
  sourceName: string;
  host: string;
  primaryIp: string;
  lastSeen: string;
  route: string;
};

const VIEW_COPY: Record<
  InventoryView,
  {
    title: string;
    description: string;
    searchPlaceholder: string;
  }
> = {
  PENDING: {
    title: 'Pending Setup',
    description:
      'Newly discovered VMs that still need business context before entering the active inventory.',
    searchPlaceholder: 'Search VM, IP, or source...',
  },
  ACTIVE: {
    title: 'Active Inventory',
    description:
      'Production-ready VM records that are already promoted and managed inside AssetOps.',
    searchPlaceholder: 'Search VM, system name, owner, or source...',
  },
  ORPHANED: {
    title: 'Orphaned',
    description:
      'Previously active VMs that are no longer returned by the latest source sync and are now kept as historical records.',
    searchPlaceholder: 'Search missing VM, source, or issue...',
  },
};

function matchesQuery(
  query: string,
  fields: Array<string | null | undefined>,
) {
  if (query.length === 0) {
    return true;
  }

  return fields.some((field) => field?.toLowerCase().includes(query));
}

export default function VmPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<InventoryView>('ACTIVE');
  const [discoveries, setDiscoveries] = useState<VmDiscoveryItem[]>([]);
  const [inventory, setInventory] = useState<VmInventoryItem[]>([]);
  const [selectedDiscovery, setSelectedDiscovery] = useState<VmDiscoveryItem | null>(null);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [openingPendingId, setOpeningPendingId] = useState<string | null>(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [lastSyncLabel, setLastSyncLabel] = useState('--');
  const [loading, setLoading] = useState(true);
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const loadVmData = async () => {
    try {
      setLoading(true);
      const [sources, discoveryRecords, inventoryRecords] = await Promise.all([
        getVmSources(),
        getVmDiscoveries(),
        getVmInventory(),
      ]);
      setDiscoveries(discoveryRecords);
      setInventory(inventoryRecords);
      setSourceCount(sources.length);
      setLastSyncLabel(`${sources[0]?.lastSyncAt ?? '--'} from ${sources.length} sources`);
    } catch {
      toast.error('Failed to load VM inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVmData();
  }, []);

  const openPendingSetup = async (id: string) => {
    try {
      setOpeningPendingId(id);
      const discovery = await getVmDiscovery(id);
      setSelectedDiscovery(discovery);
      setPendingDialogOpen(true);
    } catch {
      toast.error('Failed to open VM setup');
    } finally {
      setOpeningPendingId(null);
    }
  };

  const pendingQueue = useMemo(
    () => discoveries.filter((vm) => vm.state !== 'DRIFTED'),
    [discoveries],
  );
  const activeInventoryQueue = useMemo(
    () =>
      inventory.filter(
        (vm) =>
          vm.lifecycleState === 'ACTIVE' && vm.syncState !== 'Missing from source',
      ),
    [inventory],
  );
  const orphanedQueue = useMemo<OrphanedVmRecord[]>(
    () =>
      inventory
        .filter(
          (vm) =>
            vm.syncState === 'Missing from source' ||
            vm.lifecycleState === 'DELETED_IN_VCENTER',
        )
        .map((vm) => ({
          id: vm.id,
          name: vm.name,
          displayName: vm.systemName,
          sourceName: vm.vcenterName,
          host: vm.host,
          primaryIp: vm.primaryIp,
          lastSeen: vm.lastSyncAt,
          route: `/dashboard/vm/${vm.id}`,
        })),
    [inventory],
  );

  const filteredPendingQueue = useMemo(
    () =>
      pendingQueue.filter((vm) =>
        matchesQuery(normalizedQuery, [
          vm.name,
          vm.systemName,
          vm.primaryIp,
          vm.sourceName,
          vm.cluster,
          vm.host,
          vm.note,
          vm.missingFields.join(' '),
        ]),
      ),
    [normalizedQuery, pendingQueue],
  );

  const filteredActiveInventory = useMemo(
    () =>
      activeInventoryQueue.filter((vm) =>
        matchesQuery(normalizedQuery, [
          vm.name,
          vm.primaryIp,
          vm.vcenterName,
          vm.guestOs,
          vm.owner,
          vm.description,
        ]),
      ),
    [activeInventoryQueue, normalizedQuery],
  );

  const filteredOrphanedQueue = useMemo(
    () =>
      orphanedQueue.filter((vm) =>
        matchesQuery(normalizedQuery, [
          vm.name,
          vm.displayName,
          vm.primaryIp,
          vm.sourceName,
          vm.host,
        ]),
      ),
    [normalizedQuery, orphanedQueue],
  );

  const inventoryStats = useMemo(
    () => ({
      active: activeInventoryQueue.length,
      pending: pendingQueue.length,
      orphaned: orphanedQueue.length,
      sources: sourceCount,
      lastSyncLabel,
    }),
    [activeInventoryQueue.length, orphanedQueue.length, pendingQueue.length, sourceCount, lastSyncLabel],
  );

  const currentCount =
    activeView === 'PENDING'
      ? filteredPendingQueue.length
      : activeView === 'ACTIVE'
        ? filteredActiveInventory.length
        : filteredOrphanedQueue.length;

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="workspace-subtle">Virtual Machines</p>
              <h2 className="workspace-heading">Compute Inventory</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Manage discovered VMs, complete missing metadata, and keep active records aligned with vCenter sync results.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Last synced: {inventoryStats.lastSyncLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => router.push('/dashboard/vm/sources')}
                >
                  <Server className="h-4 w-4" />
                  Manage vCenters
                </Button>
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => router.push('/dashboard/vm/sources')}
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Discoveries
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="table-shell">
        <div className="table-section-header flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  key: 'PENDING',
                  label: 'Pending Setup',
                  count: inventoryStats.pending,
                  icon: Clock3,
                },
                {
                  key: 'ACTIVE',
                  label: 'Active Inventory',
                  count: inventoryStats.active,
                  icon: CheckCircle2,
                },
                {
                  key: 'ORPHANED',
                  label: 'Orphaned',
                  count: inventoryStats.orphaned,
                  icon: AlertTriangle,
                },
              ] satisfies Array<{
                key: InventoryView;
                label: string;
                count: number;
                icon: typeof Clock3;
              }>
            ).map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveView(tab.key)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-[12px] border px-3 py-2 text-sm font-medium transition-all',
                    activeView === tab.key
                      ? 'border-primary/35 bg-accent text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/55 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      tab.key === 'ACTIVE' &&
                      'bg-emerald-500/15 text-emerald-300',
                      tab.key === 'PENDING' &&
                      'bg-amber-500/15 text-amber-300',
                      tab.key === 'ORPHANED' &&
                      'bg-rose-500/15 text-rose-300',
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="toolbar-input-wrap min-w-0 lg:w-[320px]">
              <Search className="toolbar-input-icon" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={VIEW_COPY[activeView].searchPlaceholder}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {VIEW_COPY[activeView].title}
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {VIEW_COPY[activeView].description}
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Showing {currentCount} record{currentCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {loading ? (
          <EmptyState
            title="Loading VM records"
            description="Fetching sources, discovery queue, and active inventory."
          />
        ) : sourceCount === 0 ? (
          <EmptyState
            title="No vCenter sources connected"
            description="Add at least one vCenter source before discovery and active inventory records can appear here."
            action={(
              <Button
                size="sm"
                className="gap-2"
                onClick={() => router.push('/dashboard/vm/sources')}
              >
                <Server className="h-4 w-4" />
                Add vCenter Source
              </Button>
            )}
          />
        ) : activeView === 'PENDING' ? (
          <PendingSetupTable
            items={filteredPendingQueue}
            openingId={openingPendingId}
            onOpenRecord={(id) => void openPendingSetup(id)}
          />
        ) : activeView === 'ACTIVE' ? (
          <ActiveInventoryTable
            items={filteredActiveInventory}
            onOpenRecord={(id) => router.push(`/dashboard/vm/${id}`)}
          />
        ) : activeView === 'ORPHANED' ? (
          <OrphanedTable
            items={filteredOrphanedQueue}
            onOpenRecord={(route) => router.push(route)}
          />
        ) : null}
      </section>

      <VmFormDialog
        open={pendingDialogOpen}
        onOpenChange={setPendingDialogOpen}
        discoveryVm={selectedDiscovery}
        submitMode="promote"
        onPromoted={(inventoryDetail) => {
          router.push(`/dashboard/vm/${inventoryDetail.id}`);
        }}
        onSuccess={() => void loadVmData()}
      />
    </div>
  );
}

function PendingSetupTable({
  items,
  openingId,
  onOpenRecord,
}: {
  items: VmDiscoveryItem[];
  openingId: string | null;
  onOpenRecord: (id: string) => void;
}) {
  const getQueueStatusLabel = (state: VmDiscoveryItem['state']) => {
    if (state === 'READY_TO_PROMOTE') {
      return 'Ready to promote';
    }

    if (state === 'DRIFTED') {
      return 'Needs review';
    }

    return 'Needs context';
  };

  const getQueueStatusClassName = (state: VmDiscoveryItem['state']) => {
    if (state === 'READY_TO_PROMOTE') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (state === 'DRIFTED') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    return 'border-violet-500/25 bg-violet-500/10 text-violet-300';
  };

  const getPowerStateClassName = (powerState: VmDiscoveryItem['powerState']) => {
    if (powerState === 'RUNNING') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (powerState === 'SUSPENDED') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    return 'border-border bg-background text-muted-foreground';
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending setup records"
        description="Everything discovered is either already promoted or waiting in another state."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1fr)_160px_120px_140px_140px_180px] gap-4 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
        <div>Discovered VM Name</div>
        <div>IP Address</div>
        <div>Source</div>
        <div>Host</div>
        <div>Power</div>
        <div>Last Seen</div>
        <div>Queue Status</div>
        <div className="text-right">Action</div>
      </div>

      <div>
        {items.map((vm) => (
          <div
            key={vm.id}
            className="grid gap-4 border-b border-border/70 px-4 py-4 transition-colors hover:bg-accent/30 md:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1fr)_160px_120px_140px_140px_180px] md:items-center last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-emerald-300">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {vm.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="font-mono text-[12px] text-foreground">
              {vm.primaryIp}
            </div>

            <div className="text-[12px] font-medium text-foreground">
              {vm.sourceName}
            </div>

            <div>
              <div className="text-[12px] text-muted-foreground">
                {vm.host}
              </div>
            </div>

            <div>
              <span
                className={cn(
                  'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                  getPowerStateClassName(vm.powerState),
                )}
              >
                {vm.powerState}
              </span>
            </div>

            <div className="text-[12px] text-muted-foreground">
              {vm.lastSeen}
            </div>

            <div>
              <span
                className={cn(
                  'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                  getQueueStatusClassName(vm.state),
                )}
              >
                {getQueueStatusLabel(vm.state)}
              </span>
            </div>

            <div className="flex items-center justify-start md:justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => onOpenRecord(vm.id)} disabled={openingId === vm.id}>
                {openingId === vm.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                {openingId === vm.id ? 'Opening...' : 'Complete Setup'}
                {openingId === vm.id ? null : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ActiveInventoryTable({
  items,
  onOpenRecord,
}: {
  items: VmInventoryItem[];
  onOpenRecord: (id: string) => void;
}) {
  const getPowerStateClassName = (powerState: VmInventoryItem['powerState']) => {
    if (powerState === 'RUNNING') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (powerState === 'SUSPENDED') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    return 'border-border bg-background text-muted-foreground';
  };

  const getSyncStateClassName = (syncState: VmInventoryItem['syncState']) => {
    if (syncState === 'Synced') {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (syncState === 'Missing from source') {
      return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
    }

    if (syncState === 'Connection failed') {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    return 'border-border bg-background text-muted-foreground';
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No active inventory matches"
        description="Try a different search term to find an existing VM record."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_140px_minmax(0,1fr)_160px_120px_140px_180px] gap-4 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
        <div>System Name</div>
        <div>VM Name</div>
        <div>IP Address</div>
        <div>Source</div>
        <div>Host</div>
        <div>Power</div>
        <div>Sync Status</div>
        <div className="text-right">Action</div>
      </div>

      <div>
        {items.map((vm) => (
          <div
            key={vm.id}
            className="grid gap-4 border-b border-border/70 px-4 py-4 transition-colors hover:bg-accent/30 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_140px_minmax(0,1fr)_160px_120px_140px_180px] md:items-center last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {vm.systemName}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[12px] font-medium text-foreground">
              {vm.name}
            </div>

            <div className="font-mono text-[12px] text-foreground">
              {vm.primaryIp}
            </div>

            <div className="text-[12px] font-medium text-foreground">
              {vm.vcenterName}
            </div>

            <div className="text-[12px] text-muted-foreground">
              {vm.host}
            </div>

            <div>
              <span
                className={cn(
                  'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                  getPowerStateClassName(vm.powerState),
                )}
              >
                {vm.powerState}
              </span>
            </div>

            <div>
              <span
                className={cn(
                  'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                  getSyncStateClassName(vm.syncState),
                )}
              >
                {vm.syncState}
              </span>
            </div>

            <div className="flex items-center justify-start md:justify-end">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onOpenRecord(vm.id)}>
                View Details
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function OrphanedTable({
  items,
  onOpenRecord,
}: {
  items: OrphanedVmRecord[];
  onOpenRecord: (route: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No orphaned VMs"
        description="No previously active VM is currently missing from the connected source."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_140px_minmax(0,1fr)_160px_140px_140px_180px] gap-4 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
        <div>System Name</div>
        <div>VM Name</div>
        <div>IP Address</div>
        <div>Source</div>
        <div>Host</div>
        <div>Last Seen</div>
        <div>Orphaned Status</div>
        <div className="text-right">Action Required</div>
      </div>

      <div>
        {items.map((vm) => (
          <div
            key={vm.id}
            className="grid gap-4 border-b border-border/70 px-4 py-4 transition-colors hover:bg-accent/30 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_140px_minmax(0,1fr)_160px_140px_140px_180px] md:items-center last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300">
                  <Monitor className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground line-through decoration-foreground/35">
                    {vm.displayName || vm.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[12px] font-medium text-foreground">
              {vm.name}
            </div>

            <div className="font-mono text-[12px] text-foreground">
              {vm.primaryIp}
            </div>

            <div className="text-[12px] font-medium text-foreground">
              {vm.sourceName}
            </div>

            <div className="text-[12px] text-muted-foreground">
              {vm.host}
            </div>

            <div className="text-[12px] text-muted-foreground">
              {vm.lastSeen}
            </div>

            <div>
              <span className="inline-flex rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-300">
                Missing from source
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenRecord(vm.route)}
              >
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/55 text-muted-foreground">
        <Monitor className="h-4.5 w-4.5" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="max-w-md text-sm text-muted-foreground">{description}</div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
