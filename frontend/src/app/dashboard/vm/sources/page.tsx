'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown, LoaderCircle, Plus, Search, Server, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VM_DISCOVERY_QUEUE, VM_VCENTER_SOURCES, type VmDiscoveryItem, type VmVCenterSource } from '@/lib/vm-inventory';

type SortKey = 'name' | 'sourceName' | 'completeness' | 'lastSeen' | 'state';
type SortDirection = 'asc' | 'desc';

const DEFAULT_SOURCE_FORM = {
  name: '',
  endpoint: '',
  version: '8.0.2',
  username: '',
  password: '',
  syncInterval: '15 min',
  notes: '',
};

export default function VmSourcesPage() {
  const router = useRouter();
  const [sources] = useState<VmVCenterSource[]>(VM_VCENTER_SOURCES);
  const [queue] = useState<VmDiscoveryItem[]>(VM_DISCOVERY_QUEUE);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastSeen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_SOURCE_FORM);
  const [saving, setSaving] = useState(false);

  const filteredQueue = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return queue.filter((item) => {
      return (
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.moid.toLowerCase().includes(query) ||
        item.sourceName.toLowerCase().includes(query) ||
        item.cluster.toLowerCase().includes(query) ||
        item.host.toLowerCase().includes(query) ||
        item.guestOs.toLowerCase().includes(query)
      );
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
  }, [queue, searchTerm, sortDirection, sortKey]);

  const stats = useMemo(() => {
    return {
      sources: sources.length,
      queue: queue.length,
      ready: queue.filter((item) => item.state === 'READY_TO_PROMOTE').length,
      drifted: queue.filter((item) => item.state === 'DRIFTED').length,
    };
  }, [queue, sources.length]);

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

  const handleSave = () => {
    setSaving(true);
    window.setTimeout(() => {
      toast.success('vCenter source saved');
      setAddOpen(false);
      setFormData(DEFAULT_SOURCE_FORM);
      setSaving(false);
    }, 350);
  };

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="workspace-subtle">Compute Sync Settings</p>
            <h2 className="workspace-heading">vCenter Sources</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Register one or more vCenters here. AssetOps will pull discovered VMs into a separate queue first, then you can complete and promote them into inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" className="gap-2" onClick={() => router.push('/dashboard/vm')}>
              Back to Inventory
            </Button>
            <Button size="lg" className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add vCenter
            </Button>
          </div>
        </div>

        <div className="stats-grid sm:grid-cols-2 xl:grid-cols-4">
          <div className="stat-tile">
            <div className="stat-kicker">Connected vCenters</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.sources}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Discovery Queue</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.queue}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Ready to Promote</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.ready}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Drifted</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.drifted}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="table-shell">
            <div className="table-section-header">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Connected vCenters</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">The list below is the source of sync jobs for VM discovery.</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/65 px-3 py-1.5 text-[11px] text-muted-foreground">
                Sources
                <Settings2 className="h-3 w-3" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table-frame min-w-[980px]">
                <thead>
                  <tr className="table-head-row">
                    <th className="px-3 py-3 font-medium">
                      <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                        Source Name
                        {renderSortIcon('name')}
                      </button>
                    </th>
                    <th className="px-3 py-3 font-medium">
                      <button onClick={() => toggleSort('sourceName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                        Endpoint
                        {renderSortIcon('sourceName')}
                      </button>
                    </th>
                    <th className="px-3 py-3 font-medium">Version</th>
                    <th className="px-3 py-3 font-medium">VMs</th>
                    <th className="px-3 py-3 font-medium">Sync Interval</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="table-row">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="icon-chip h-9 w-9 text-muted-foreground">
                            <Server className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-foreground">{source.name}</div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">{source.lastSyncAt}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{source.endpoint}</td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{source.version}</td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{source.vmCount}</td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{source.syncInterval}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                          {source.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="table-shell">
            <div className="table-section-header">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Discovery Queue</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Discovered VMs land here first. Complete the missing context before promotion.</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/65 px-3 py-1.5 text-[11px] text-muted-foreground">
                {filteredQueue.length} pending
                <Sparkles className="h-3 w-3" />
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="toolbar-input-wrap">
                <Search className="toolbar-input-icon" />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search draft VM, source, host, or OS" className="pl-10" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table-frame min-w-[1080px]">
                <thead>
                  <tr className="table-head-row">
                    <th className="px-3 py-3 font-medium">VM Name</th>
                    <th className="px-3 py-3 font-medium">Source</th>
                    <th className="px-3 py-3 font-medium">MoID</th>
                    <th className="px-3 py-3 font-medium">Completeness</th>
                    <th className="px-3 py-3 font-medium">Missing Data</th>
                    <th className="px-3 py-3 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((item) => (
                    <tr key={item.id} className="table-row cursor-pointer" onClick={() => router.push(`/dashboard/vm/sources/${item.id}`)}>
                      <td className="px-3 py-3">
                        <div className="text-[13px] font-medium text-foreground">{item.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{item.lastSeen}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <div className="text-[12px] font-medium text-foreground">{item.sourceName}</div>
                          <div className="text-[11px] text-muted-foreground">{item.sourceVersion}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{item.moid}</td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{item.completeness}%</td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{item.missingFields.join(', ')}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${
                            item.state === 'READY_TO_PROMOTE'
                              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                              : item.state === 'DRIFTED'
                                ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                                : 'border-violet-500/25 bg-violet-500/10 text-violet-300'
                          }`}
                        >
                          {item.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Promotion Flow</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>1. Register one or more vCenters here.</p>
              <p>2. Sync discovers VMs into the queue.</p>
              <p>3. Fill the missing AssetOps context and promote to inventory.</p>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Setup Notes</h3>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <p>Use vCenter source settings to capture endpoint, credentials, and sync cadence.</p>
              <p>Discovery results stay separate from inventory until the manual fields are completed.</p>
            </div>
          </section>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>Add vCenter Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Source Name</Label>
                <Input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="vc-prod-01" />
              </div>
              <div className="space-y-1.5">
                <Label>Endpoint</Label>
                <Input value={formData.endpoint} onChange={(event) => setFormData((current) => ({ ...current, endpoint: event.target.value }))} placeholder="vcenter-prod.dc1.local" />
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={formData.version} onChange={(event) => setFormData((current) => ({ ...current, version: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sync Interval</Label>
                <Input value={formData.syncInterval} onChange={(event) => setFormData((current) => ({ ...current, syncInterval: event.target.value }))} placeholder="15 min" />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={formData.username} onChange={(event) => setFormData((current) => ({ ...current, username: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Optional notes for the sync source"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Save source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
