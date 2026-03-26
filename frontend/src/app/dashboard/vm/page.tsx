'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-4 min-[1080px]:flex-row min-[1080px]:items-start min-[1080px]:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="page-breadcrumb">
                <span>Workspace</span>
                <span className="page-breadcrumb-separator">/</span>
                <span>Compute</span>
                <span className="page-breadcrumb-separator">/</span>
                <span>VM Inventory</span>
              </div>
              <p className="workspace-subtle mt-3">Virtual Machines</p>
              <h2 className="workspace-heading">Compute Inventory</h2>
              <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground">
                Manage discovered VMs, complete missing metadata, and keep active records aligned with vCenter sync results.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 min-[1080px]:items-end">
              <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Last synced: {inventoryStats.lastSyncLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 min-[1080px]:flex-nowrap">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 whitespace-nowrap"
                  onClick={() => router.push('/dashboard/vm/sources')}
                >
                  <Server className="h-4 w-4" />
                  Manage vCenters
                </Button>
                <Button
                  size="lg"
                  className="gap-2 whitespace-nowrap"
                  onClick={() => router.push('/dashboard/vm/sources')}
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Discoveries
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">Active <span className="font-semibold text-foreground">{inventoryStats.active}</span></span>
              <span className="inline-flex items-center gap-1.5">Pending <span className="font-semibold text-foreground">{inventoryStats.pending}</span></span>
              <span className="inline-flex items-center gap-1.5">Orphaned <span className="font-semibold text-foreground">{inventoryStats.orphaned}</span></span>
              <span className="inline-flex items-center gap-1.5">Sources <span className="font-semibold text-foreground">{inventoryStats.sources}</span></span>
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
                  key: 'ACTIVE',
                  label: 'Active Inventory',
                  count: inventoryStats.active,
                  icon: CheckCircle2,
                },
                {
                  key: 'PENDING',
                  label: 'Pending Setup',
                  count: inventoryStats.pending,
                  icon: Clock3,
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
    <div className="overflow-x-auto">
      <table className="table-frame">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Discovered VM Name</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">IP Address</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Host</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Power</th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground xl:table-cell">Last Seen</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((vm) => (
            <tr key={vm.id} className="table-row transition-colors hover:bg-accent/30">
              <td className="px-4 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-emerald-300">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                    {vm.name}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 font-mono text-[12px] text-foreground">{vm.primaryIp}</td>
              <td className="px-4 py-4 text-[12px] font-medium text-foreground">
                <div className="line-clamp-2 break-words">{vm.sourceName}</div>
              </td>
              <td className="px-4 py-4 text-[12px] text-muted-foreground">
                <div className="line-clamp-2 break-words">{vm.host}</div>
              </td>
              <td className="px-4 py-4">
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                    getPowerStateClassName(vm.powerState),
                  )}
                >
                  {vm.powerState}
                </span>
              </td>
              <td className="hidden px-4 py-4 text-[12px] text-muted-foreground whitespace-nowrap xl:table-cell">{vm.lastSeen}</td>
              <td className="px-4 py-4 text-right">
                <Button size="sm" className="h-8 gap-1 px-2.5 text-xs whitespace-nowrap" onClick={() => onOpenRecord(vm.id)} disabled={openingId === vm.id}>
                  {openingId === vm.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  {openingId === vm.id ? 'Opening' : 'Setup'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  if (items.length === 0) {
    return (
      <EmptyState
        title="No active inventory matches"
        description="Try a different search term to find an existing VM record."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-frame">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">System Name</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">VM Name</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">IP Address</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Host</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Power</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((vm) => (
            <tr key={vm.id} className="table-row transition-colors hover:bg-accent/30">
              <td className="px-4 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                    {vm.systemName}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-[12px] font-medium text-foreground">
                <div className="line-clamp-2 break-words">{vm.name}</div>
              </td>
              <td className="px-4 py-4 font-mono text-[12px] text-foreground">{vm.primaryIp}</td>
              <td className="px-4 py-4 text-[12px] font-medium text-foreground">
                <div className="line-clamp-2 break-words">{vm.vcenterName}</div>
              </td>
              <td className="px-4 py-4 text-[12px] text-muted-foreground">
                <div className="line-clamp-2 break-words">{vm.host}</div>
              </td>
              <td className="px-4 py-4">
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                    getPowerStateClassName(vm.powerState),
                  )}
                >
                  {vm.powerState}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 text-xs whitespace-nowrap" onClick={() => onOpenRecord(vm.id)}>
                  Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="overflow-x-auto">
      <table className="table-frame">
        <thead>
          <tr className="table-head-row">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">System Name</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">VM Name</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">IP Address</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Host</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Last Seen</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((vm) => (
            <tr key={vm.id} className="table-row transition-colors hover:bg-accent/30">
              <td className="px-4 py-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate text-[13px] font-semibold text-foreground line-through decoration-foreground/35">
                    {vm.displayName || vm.name}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-[12px] font-medium text-foreground">
                <div className="line-clamp-2 break-words">{vm.name}</div>
              </td>
              <td className="px-4 py-4 font-mono text-[12px] text-foreground">{vm.primaryIp}</td>
              <td className="px-4 py-4 text-[12px] font-medium text-foreground">
                <div className="line-clamp-2 break-words">{vm.sourceName}</div>
              </td>
              <td className="px-4 py-4 text-[12px] text-muted-foreground">
                <div className="line-clamp-2 break-words">{vm.host}</div>
              </td>
              <td className="px-4 py-4 text-[12px] text-muted-foreground whitespace-nowrap">{vm.lastSeen}</td>
              <td className="px-4 py-4 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs whitespace-nowrap"
                  onClick={() => onOpenRecord(vm.route)}
                >
                  Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
