'use client';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
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
type PendingSortKey = 'name' | 'primaryIp' | 'sourceName' | 'host' | 'powerState' | 'lastSeen';
type ActiveSortKey = 'systemName' | 'name' | 'primaryIp' | 'vcenterName' | 'host' | 'powerState';
type OrphanedSortKey = 'displayName' | 'name' | 'primaryIp' | 'sourceName' | 'host' | 'lastSeen';
type SortDirection = 'asc' | 'desc';
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
    shortLabel: string;
    description: string;
    searchPlaceholder: string;
  }
> = {
  PENDING: {
    title: 'Pending Setup',
    shortLabel: 'Pending',
    description:
      'Newly discovered VMs that still need business context before entering the active inventory.',
    searchPlaceholder: 'Search by VM name, IP address, or source...',
  },
  ACTIVE: {
    title: 'Active Inventory',
    shortLabel: 'Active',
    description:
      'Production-ready VM records that are already promoted and managed inside AssetOps.',
    searchPlaceholder: 'Search by VM name, system name, owner, or source...',
  },
  ORPHANED: {
    title: 'Orphaned',
    shortLabel: 'Orphaned',
    description:
      'Previously active VMs that are no longer returned by the latest source sync and are now kept as historical records.',
    searchPlaceholder: 'Search by VM name, source, or issue...',
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
  const { setHeader } = usePageHeader();
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
  const [pendingSortKey, setPendingSortKey] = useState<PendingSortKey>('name');
  const [activeSortKey, setActiveSortKey] = useState<ActiveSortKey>('systemName');
  const [orphanedSortKey, setOrphanedSortKey] = useState<OrphanedSortKey>('displayName');
  const [pendingSortDirection, setPendingSortDirection] = useState<SortDirection>('asc');
  const [activeSortDirection, setActiveSortDirection] = useState<SortDirection>('asc');
  const [orphanedSortDirection, setOrphanedSortDirection] = useState<SortDirection>('asc');
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

  useEffect(() => {
    setHeader({
      title: 'Virtual Machines',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Compute' },
        { label: 'Virtual Machines' },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader]);

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

  const compareValues = (leftValue: string, rightValue: string, direction: SortDirection) => {
    if (leftValue < rightValue) {
      return direction === 'asc' ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return direction === 'asc' ? 1 : -1;
    }

    return 0;
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
      pendingQueue
        .filter((vm) =>
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
        )
        .sort((left, right) => {
          const leftValue = String(left[pendingSortKey] ?? '').toLowerCase();
          const rightValue = String(right[pendingSortKey] ?? '').toLowerCase();
          return compareValues(leftValue, rightValue, pendingSortDirection);
        }),
    [normalizedQuery, pendingQueue, pendingSortDirection, pendingSortKey],
  );

  const filteredActiveInventory = useMemo(
    () =>
      activeInventoryQueue
        .filter((vm) =>
          matchesQuery(normalizedQuery, [
            vm.name,
            vm.primaryIp,
            vm.vcenterName,
            vm.guestOs,
            vm.owner,
            vm.description,
          ]),
        )
        .sort((left, right) => {
          const leftValue = String(left[activeSortKey] ?? '').toLowerCase();
          const rightValue = String(right[activeSortKey] ?? '').toLowerCase();
          return compareValues(leftValue, rightValue, activeSortDirection);
        }),
    [activeInventoryQueue, activeSortDirection, activeSortKey, normalizedQuery],
  );

  const filteredOrphanedQueue = useMemo(
    () =>
      orphanedQueue
        .filter((vm) =>
          matchesQuery(normalizedQuery, [
            vm.name,
            vm.displayName,
            vm.primaryIp,
            vm.sourceName,
            vm.host,
          ]),
        )
        .sort((left, right) => {
          const leftValue = String(left[orphanedSortKey] ?? '').toLowerCase();
          const rightValue = String(right[orphanedSortKey] ?? '').toLowerCase();
          return compareValues(leftValue, rightValue, orphanedSortDirection);
        }),
    [normalizedQuery, orphanedQueue, orphanedSortDirection, orphanedSortKey],
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

  const togglePendingSort = (key: PendingSortKey) => {
    if (pendingSortKey === key) {
      setPendingSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setPendingSortKey(key);
    setPendingSortDirection('asc');
  };

  const toggleActiveSort = (key: ActiveSortKey) => {
    if (activeSortKey === key) {
      setActiveSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setActiveSortKey(key);
    setActiveSortDirection('asc');
  };

  const toggleOrphanedSort = (key: OrphanedSortKey) => {
    if (orphanedSortKey === key) {
      setOrphanedSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setOrphanedSortKey(key);
    setOrphanedSortDirection('asc');
  };

  const renderSortIcon = (active: boolean, direction: SortDirection) => {
    if (!active) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="workspace-page">
      <section className="table-shell">
        <div className="toolbar-strip">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {(
              [
                {
                  key: 'ACTIVE',
                  label: VIEW_COPY.ACTIVE.shortLabel,
                  count: inventoryStats.active,
                  icon: CheckCircle2,
                  iconClassName: 'text-emerald-400',
                  iconWrapClassName: 'border-emerald-500/25 bg-emerald-500/10',
                },
                {
                  key: 'PENDING',
                  label: VIEW_COPY.PENDING.shortLabel,
                  count: inventoryStats.pending,
                  icon: Clock3,
                  iconClassName: 'text-amber-400',
                  iconWrapClassName: 'border-amber-500/25 bg-amber-500/10',
                },
                {
                  key: 'ORPHANED',
                  label: VIEW_COPY.ORPHANED.shortLabel,
                  count: inventoryStats.orphaned,
                  icon: AlertTriangle,
                  iconClassName: 'text-rose-400',
                  iconWrapClassName: 'border-rose-500/25 bg-rose-500/10',
                },
              ] satisfies Array<{
                key: InventoryView;
                label: string;
                count: number;
                icon: typeof Clock3;
                iconClassName: string;
                iconWrapClassName: string;
              }>
            ).map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveView(tab.key)}
                  className={`filter-chip ${activeView === tab.key ? 'filter-chip-active' : ''}`}
                >
                  <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full border', tab.iconWrapClassName)}>
                    <Icon className={cn('h-3 w-3', tab.iconClassName)} />
                  </span>
                  <span>{tab.label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                    {tab.count}
                  </span>
                </button>
              );
            })}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="toolbar-input-wrap min-w-0 lg:w-[240px]">
                <Search className="toolbar-input-icon" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={VIEW_COPY[activeView].searchPlaceholder}
                  className="pl-10"
                />
              </div>
              <Button
                variant="default"
                size="default"
                className="gap-2 whitespace-nowrap"
                onClick={() => router.push('/dashboard/vm/sources')}
              >
                <Server className="h-4 w-4" />
                Manage vCenters
              </Button>

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
            sortKey={pendingSortKey}
            sortDirection={pendingSortDirection}
            onSort={togglePendingSort}
            renderSortIcon={renderSortIcon}
          />
        ) : activeView === 'ACTIVE' ? (
          <ActiveInventoryTable
            items={filteredActiveInventory}
            onOpenRecord={(id) => router.push(`/dashboard/vm/${id}`)}
            sortKey={activeSortKey}
            sortDirection={activeSortDirection}
            onSort={toggleActiveSort}
            renderSortIcon={renderSortIcon}
          />
        ) : activeView === 'ORPHANED' ? (
          <OrphanedTable
            items={filteredOrphanedQueue}
            onOpenRecord={(route) => router.push(route)}
            sortKey={orphanedSortKey}
            sortDirection={orphanedSortDirection}
            onSort={toggleOrphanedSort}
            renderSortIcon={renderSortIcon}
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
  sortKey,
  sortDirection,
  onSort,
  renderSortIcon,
}: {
  items: VmDiscoveryItem[];
  openingId: string | null;
  onOpenRecord: (id: string) => void;
  sortKey: PendingSortKey;
  sortDirection: SortDirection;
  onSort: (key: PendingSortKey) => void;
  renderSortIcon: (active: boolean, direction: SortDirection) => ReactNode;
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
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Discovered VM Name
                {renderSortIcon(sortKey === 'name', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('primaryIp')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                IP Address
                {renderSortIcon(sortKey === 'primaryIp', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('sourceName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Source
                {renderSortIcon(sortKey === 'sourceName', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('host')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Host
                {renderSortIcon(sortKey === 'host', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('powerState')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Power
                {renderSortIcon(sortKey === 'powerState', sortDirection)}
              </button>
            </th>
            <th className="hidden px-3 py-2.5 font-semibold xl:table-cell">
              <button onClick={() => onSort('lastSeen')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Last Seen
                {renderSortIcon(sortKey === 'lastSeen', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((vm) => (
            <tr key={vm.id} className="table-row transition-colors hover:bg-accent/30">
              <td className="px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-emerald-300">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate text-[12px] text-foreground">
                    {vm.name}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-foreground">{vm.primaryIp}</td>
              <td className="px-3 py-2.5 text-[12px] text-foreground">
                <div className="line-clamp-2 break-words">{vm.sourceName}</div>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                <div className="line-clamp-2 break-words">{vm.host}</div>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium',
                    getPowerStateClassName(vm.powerState),
                  )}
                >
                  {vm.powerState}
                </span>
              </td>
              <td className="hidden px-3 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap xl:table-cell">{vm.lastSeen}</td>
              <td className="px-3 py-2.5 text-right">
                <Button size="sm" className="h-7 gap-1 px-2 text-xs whitespace-nowrap" onClick={() => onOpenRecord(vm.id)} disabled={openingId === vm.id}>
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
  sortKey,
  sortDirection,
  onSort,
  renderSortIcon,
}: {
  items: VmInventoryItem[];
  onOpenRecord: (id: string) => void;
  sortKey: ActiveSortKey;
  sortDirection: SortDirection;
  onSort: (key: ActiveSortKey) => void;
  renderSortIcon: (active: boolean, direction: SortDirection) => ReactNode;
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
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('systemName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                System Name
                {renderSortIcon(sortKey === 'systemName', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                VM Name
                {renderSortIcon(sortKey === 'name', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('primaryIp')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                IP Address
                {renderSortIcon(sortKey === 'primaryIp', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('vcenterName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Source
                {renderSortIcon(sortKey === 'vcenterName', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('host')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Host
                {renderSortIcon(sortKey === 'host', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('powerState')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Power
                {renderSortIcon(sortKey === 'powerState', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((vm) => (
            <tr key={vm.id} className="table-row transition-colors hover:bg-accent/30">
              <td className="px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate text-[12px] text-foreground">
                    {vm.systemName}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-foreground">
                <div className="line-clamp-2 break-words">{vm.name}</div>
              </td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-foreground">{vm.primaryIp}</td>
              <td className="px-3 py-2.5 text-[12px] text-foreground">
                <div className="line-clamp-2 break-words">{vm.vcenterName}</div>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                <div className="line-clamp-2 break-words">{vm.host}</div>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className={cn(
                    'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium',
                    getPowerStateClassName(vm.powerState),
                  )}
                >
                  {vm.powerState}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs whitespace-nowrap" onClick={() => onOpenRecord(vm.id)}>
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
  sortKey,
  sortDirection,
  onSort,
  renderSortIcon,
}: {
  items: OrphanedVmRecord[];
  onOpenRecord: (route: string) => void;
  sortKey: OrphanedSortKey;
  sortDirection: SortDirection;
  onSort: (key: OrphanedSortKey) => void;
  renderSortIcon: (active: boolean, direction: SortDirection) => ReactNode;
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
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('displayName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                System Name
                {renderSortIcon(sortKey === 'displayName', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                VM Name
                {renderSortIcon(sortKey === 'name', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('primaryIp')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                IP Address
                {renderSortIcon(sortKey === 'primaryIp', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('sourceName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Source
                {renderSortIcon(sortKey === 'sourceName', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('host')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Host
                {renderSortIcon(sortKey === 'host', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 font-semibold">
              <button onClick={() => onSort('lastSeen')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                Last Seen
                {renderSortIcon(sortKey === 'lastSeen', sortDirection)}
              </button>
            </th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((vm) => (
            <tr key={vm.id} className="table-row transition-colors hover:bg-accent/30">
              <td className="px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300">
                    <Monitor className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate text-[12px] text-foreground line-through decoration-foreground/35">
                    {vm.displayName || vm.name}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-foreground">
                <div className="line-clamp-2 break-words">{vm.name}</div>
              </td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-foreground">{vm.primaryIp}</td>
              <td className="px-3 py-2.5 text-[12px] text-foreground">
                <div className="line-clamp-2 break-words">{vm.sourceName}</div>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                <div className="line-clamp-2 break-words">{vm.host}</div>
              </td>
              <td className="px-3 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">{vm.lastSeen}</td>
              <td className="px-3 py-2.5 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs whitespace-nowrap"
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
