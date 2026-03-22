'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Monitor,
  MoreHorizontal,
  RefreshCw,
  Search,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  VM_DISCOVERY_QUEUE,
  VM_INVENTORY_RECORDS,
  VM_VCENTER_SOURCES,
  type VmDiscoveryItem,
  type VmInventoryItem,
} from '@/lib/vm-inventory';

type InventoryView = 'PENDING' | 'ACTIVE' | 'ORPHANED';

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
      'VMs with drift or missing source visibility that need investigation before the record goes stale.',
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
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const pendingQueue = useMemo(
    () => VM_DISCOVERY_QUEUE.filter((vm) => vm.state !== 'DRIFTED'),
    [],
  );
  const orphanedQueue = useMemo(
    () => VM_DISCOVERY_QUEUE.filter((vm) => vm.state === 'DRIFTED'),
    [],
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
      VM_INVENTORY_RECORDS.filter((vm) =>
        matchesQuery(normalizedQuery, [
          vm.name,
          vm.primaryIp,
          vm.vcenterName,
          vm.guestOs,
          vm.owner,
          vm.description,
        ]),
      ),
    [normalizedQuery],
  );

  const filteredOrphanedQueue = useMemo(
    () =>
      orphanedQueue.filter((vm) =>
        matchesQuery(normalizedQuery, [
          vm.name,
          vm.primaryIp,
          vm.sourceName,
          vm.host,
          vm.note,
          vm.missingFields.join(' '),
        ]),
      ),
    [normalizedQuery, orphanedQueue],
  );

  const inventoryStats = useMemo(
    () => ({
      active: VM_INVENTORY_RECORDS.length,
      pending: pendingQueue.length,
      orphaned: orphanedQueue.length,
      sources: VM_VCENTER_SOURCES.length,
      lastSyncLabel: `${VM_VCENTER_SOURCES[0]?.lastSyncAt ?? '--'} from ${VM_VCENTER_SOURCES.length} sources`,
    }),
    [orphanedQueue.length, pendingQueue.length],
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

        {activeView === 'PENDING' ? (
          <PendingSetupTable
            items={filteredPendingQueue}
            onOpenRecord={(id) => router.push(`/dashboard/vm/sources/${id}`)}
          />
        ) : null}

        {activeView === 'ACTIVE' ? (
          <ActiveInventoryTable
            items={filteredActiveInventory}
            onOpenRecord={(id) => router.push(`/dashboard/vm/${id}`)}
          />
        ) : null}

        {activeView === 'ORPHANED' ? (
          <OrphanedTable
            items={filteredOrphanedQueue}
            onOpenRecord={(id) => router.push(`/dashboard/vm/sources/${id}`)}
            onManageSources={() => router.push('/dashboard/vm/sources')}
          />
        ) : null}
      </section>
    </div>
  );
}

function PendingSetupTable({
  items,
  onOpenRecord,
}: {
  items: VmDiscoveryItem[];
  onOpenRecord: (id: string) => void;
}) {
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
      <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_180px] gap-4 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
        <div>Discovered VM Name</div>
        <div>Source (vCenter)</div>
        <div>Missing Details</div>
        <div className="text-right">Action</div>
      </div>

      <div>
        {items.map((vm) => (
          <div
            key={vm.id}
            className="grid gap-4 border-b border-border/70 px-4 py-4 transition-colors hover:bg-accent/30 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.3fr)_180px] md:items-center last:border-b-0"
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
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{vm.primaryIp}</span>
                    <span>Found {vm.lastSeen}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[12px] font-medium text-foreground">
                {vm.sourceName}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Host {vm.host}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {vm.missingFields.map((field) => (
                <span
                  key={`${vm.id}-${field}`}
                  className={cn(
                    'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                    field.toLowerCase().includes('account')
                      ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                      : 'border-rose-500/25 bg-rose-500/10 text-rose-300',
                  )}
                >
                  {field}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-start md:justify-end">
              <Button size="sm" className="gap-1.5" onClick={() => onOpenRecord(vm.id)}>
                Complete Setup
                <ChevronRight className="h-3.5 w-3.5" />
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
      <div className="hidden grid-cols-[minmax(0,1.4fr)_140px_140px_minmax(0,1fr)_80px] gap-4 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
        <div>VM Name</div>
        <div>IP Address</div>
        <div>Source</div>
        <div>OS</div>
        <div className="text-right">Action</div>
      </div>

      <div>
        {items.map((vm) => (
          <div
            key={vm.id}
            onClick={() => onOpenRecord(vm.id)}
            className="grid cursor-pointer gap-4 border-b border-border/70 px-4 py-4 transition-colors hover:bg-accent/30 md:grid-cols-[minmax(0,1.4fr)_140px_140px_minmax(0,1fr)_80px] md:items-center last:border-b-0"
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
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {vm.name} - Owner: {vm.owner}
                  </div>
                </div>
              </div>
            </div>

            <div className="font-mono text-[12px] text-foreground">
              {vm.primaryIp}
            </div>

            <div>
              <span className="inline-flex rounded-lg border border-border/70 bg-background/55 px-2.5 py-1 text-[11px] text-foreground">
                {vm.vcenterName}
              </span>
            </div>

            <div className="text-[12px] text-muted-foreground">{vm.guestOs}</div>

            <div className="flex items-center justify-start md:justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenRecord(vm.id);
                }}
                aria-label={`Open ${vm.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
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
  onManageSources,
}: {
  items: VmDiscoveryItem[];
  onOpenRecord: (id: string) => void;
  onManageSources: () => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No orphaned VMs"
        description="Current discovery data does not show any drifted or missing VM records."
      />
    );
  }

  return (
    <>
      <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_220px] gap-4 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
        <div>Missing VM</div>
        <div>Last Known Source</div>
        <div>Issue Detected</div>
        <div className="text-right">Action Required</div>
      </div>

      <div>
        {items.map((vm) => (
          <div
            key={vm.id}
            className="grid gap-4 border-b border-border/70 px-4 py-4 transition-colors hover:bg-accent/30 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_220px] md:items-center last:border-b-0"
          >
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-foreground line-through decoration-foreground/35">
                {vm.name}
              </div>
              <div className="mt-1 text-[11px] text-rose-300">
                Missing since {vm.lastSeen}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[12px] font-medium text-foreground">
                {vm.sourceName}
              </div>
              <div className="text-[11px] text-muted-foreground">{vm.primaryIp}</div>
            </div>

            <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
              <span>{vm.note || 'Not found in latest vCenter sync.'}</span>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenRecord(vm.id)}
              >
                View Details
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onManageSources}
              >
                Manage Sources
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
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/55 text-muted-foreground">
        <Monitor className="h-4.5 w-4.5" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="max-w-md text-sm text-muted-foreground">{description}</div>
    </div>
  );
}
