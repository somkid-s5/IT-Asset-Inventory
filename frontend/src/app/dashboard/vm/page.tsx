'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown, Monitor, Plus, Search, Server, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VM_ENVIRONMENT_FILTERS, VM_INVENTORY_RECORDS, VM_SOURCE_FILTERS, VM_VCENTER_SOURCES, type VmInventoryItem } from '@/lib/vm-inventory';

type SortKey = 'name' | 'vcenterName' | 'cluster' | 'host' | 'guestOs' | 'primaryIp';
type SortDirection = 'asc' | 'desc';

export default function VmPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEnvironment, setActiveEnvironment] = useState<'ALL' | VmInventoryItem['environment']>('ALL');
  const [activeSource, setActiveSource] = useState<'ALL' | string>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredVms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return VM_INVENTORY_RECORDS.filter((vm) => {
      const matchesEnvironment = activeEnvironment === 'ALL' || vm.environment === activeEnvironment;
      const matchesSource = activeSource === 'ALL' || vm.vcenterName === activeSource;
      const matchesSearch =
        query.length === 0 ||
        vm.name.toLowerCase().includes(query) ||
        vm.moid.toLowerCase().includes(query) ||
        vm.vcenterName.toLowerCase().includes(query) ||
        vm.cluster.toLowerCase().includes(query) ||
        vm.host.toLowerCase().includes(query) ||
        vm.guestOs.toLowerCase().includes(query) ||
        vm.owner.toLowerCase().includes(query);

      return matchesEnvironment && matchesSource && matchesSearch;
    }).sort((left, right) => {
      const leftValue = String(left[sortKey] ?? '').toLowerCase();
      const rightValue = String(right[sortKey] ?? '').toLowerCase();

      if (leftValue < rightValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }, [activeEnvironment, activeSource, searchTerm, sortDirection, sortKey]);

  const stats = useMemo(() => {
    const activeCount = VM_INVENTORY_RECORDS.length;
    const prodCount = VM_INVENTORY_RECORDS.filter((vm) => vm.environment === 'PROD').length;
    const guestAccounts = VM_INVENTORY_RECORDS.reduce((count, vm) => count + vm.guestAccountsCount, 0);

    return {
      vms: activeCount,
      prod: prodCount,
      guestAccounts,
      vCenters: VM_VCENTER_SOURCES.length,
    };
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="workspace-subtle">Compute Inventory</p>
            <h2 className="workspace-heading">VM Inventory</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              This page shows only complete VM records that have already been promoted from vCenter discovery into the AssetOps inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" className="gap-2" onClick={() => router.push('/dashboard/vm/sources')}>
              <Server className="h-4 w-4" />
              Manage vCenters
            </Button>
            <Button size="lg" className="gap-2" onClick={() => router.push('/dashboard/vm/sources')}>
              <Plus className="h-4 w-4" />
              Promote Draft
            </Button>
          </div>
        </div>

        <div className="stats-grid sm:grid-cols-2 xl:grid-cols-4">
          <div className="stat-tile">
            <div className="stat-kicker">Active VMs</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.vms}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Production</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.prod}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Guest Accounts</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.guestAccounts}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Connected vCenters</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.vCenters}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {VM_ENVIRONMENT_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveEnvironment(filter.value)}
                className={`filter-chip ${activeEnvironment === filter.value ? 'filter-chip-active' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {VM_SOURCE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveSource(filter.value)}
                className={`filter-chip ${activeSource === filter.value ? 'filter-chip-active' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <div className="toolbar-input-wrap">
            <Search className="toolbar-input-icon" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search VM, MoID, host, or OS"
              className="pl-10"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="table-shell">
          <div className="table-section-header">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Inventory Overview</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Only completed records live here. Incomplete discoveries stay in the vCenter sync queue.</p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/65 px-3 py-1.5 text-[11px] text-muted-foreground">
              Active inventory
              <Monitor className="h-3 w-3" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-frame min-w-[1080px]">
              <thead>
                <tr className="table-head-row">
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      VM Name
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('vcenterName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Source
                      {renderSortIcon('vcenterName')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('cluster')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Cluster / Host
                      {renderSortIcon('cluster')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('guestOs')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Guest OS
                      {renderSortIcon('guestOs')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('primaryIp')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      IP
                      {renderSortIcon('primaryIp')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Env</th>
                  <th className="px-3 py-3 font-medium">Accounts</th>
                </tr>
              </thead>
              <tbody>
                {filteredVms.map((vm) => (
                  <tr key={vm.id} className="table-row cursor-pointer" onClick={() => router.push(`/dashboard/vm/${vm.id}`)}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="icon-chip h-9 w-9 text-muted-foreground">
                          <Monitor className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-foreground">{vm.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{vm.moid}</span>
                            <span>•</span>
                            <span>{vm.lastSyncAt}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        <div className="text-[12px] font-medium text-foreground">{vm.vcenterName}</div>
                        <div className="text-[11px] text-muted-foreground">{vm.vcenterVersion}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        <div className="text-[12px] font-medium text-foreground">{vm.cluster}</div>
                        <div className="text-[11px] text-muted-foreground">{vm.host}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-0.5">
                        <div className="text-[12px] font-medium text-foreground">{vm.guestOs}</div>
                        <div className="text-[11px] text-muted-foreground">{vm.owner}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{vm.primaryIp}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground">{vm.environment}</span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{vm.guestAccountsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Connected vCenters</h3>
            </div>
            <div className="mt-3 space-y-2">
              {VM_VCENTER_SOURCES.map((source) => (
                <div key={source.id} className="metric-pair">
                  <div className="icon-chip h-9 w-9 text-muted-foreground">
                    <Server className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-foreground">{source.name}</div>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{source.version}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{source.endpoint}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{source.vmCount} VMs</span>
                      <span>{source.status}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Last sync {source.lastSyncAt}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">How this works</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>1. Add a vCenter source and sync discovered VMs into the queue.</p>
              <p>2. Complete the manual fields for each discovered VM.</p>
              <p>3. Promote the record into the active inventory only when it is complete.</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
