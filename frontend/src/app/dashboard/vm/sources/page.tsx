'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  PlugZap,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { VmVCenterSource } from '@/lib/vm-inventory';
import { createVmSource, deleteVmSource, getVmSources, syncAllVmSources, syncVmSource, testVmSourceConnection, updateVmSource } from '@/services/vm';

const DEFAULT_SOURCE_FORM = {
  name: '',
  endpoint: '',
  username: '',
  password: '',
  syncInterval: '15 min',
  notes: '',
};

const SYNC_INTERVAL_OPTIONS = ['5 min', '15 min', '30 min', '1 hour', '6 hours'];

export default function VmSourcesPage() {
  const router = useRouter();
  const [sources, setSources] = useState<VmVCenterSource[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VmVCenterSource | null>(null);
  const [formData, setFormData] = useState(DEFAULT_SOURCE_FORM);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingSourceIds, setSyncingSourceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSuccessfulTestKey, setLastSuccessfulTestKey] = useState<string | null>(null);
  const stats = {
    lastSyncLabel: `${sources[0]?.lastSyncAt ?? '--'} from ${sources.length} sources`,
  };

  const getConnectionTestKey = (data: typeof DEFAULT_SOURCE_FORM) =>
    JSON.stringify({
      endpoint: data.endpoint.trim(),
      username: data.username.trim(),
      password: data.password,
    });
  const currentConnectionTestKey = getConnectionTestKey(formData);
  const isConnectionVerified = lastSuccessfulTestKey === currentConnectionTestKey;

  const loadSources = async () => {
    try {
      setLoading(true);
      setSources(await getVmSources());
    } catch {
      toast.error('Failed to load vCenter sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  const resetForm = () => {
    setFormData(DEFAULT_SOURCE_FORM);
    setEditingSourceId(null);
    setLastSuccessfulTestKey(null);
  };

  const openAddDialog = () => {
    resetForm();
    setAddOpen(true);
  };

  const openEditDialog = (source: VmVCenterSource) => {
    setEditingSourceId(source.id);
    setFormData({
      name: source.name,
      endpoint: source.endpoint,
      username: '',
      password: '',
      syncInterval: source.syncInterval,
      notes: source.notes ?? '',
    });
    setLastSuccessfulTestKey(null);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (lastSuccessfulTestKey !== getConnectionTestKey(formData)) {
      toast.error('Please run Test Connect successfully before saving');
      return;
    }

    setSaving(true);
    try {
      if (editingSourceId) {
        await updateVmSource(editingSourceId, formData);
        toast.success('vCenter source updated');
      } else {
        await createVmSource(formData);
        toast.success('vCenter source saved');
      }
      setAddOpen(false);
      resetForm();
      await loadSources();
    } catch {
      toast.error('Failed to save vCenter source');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.endpoint.trim()) {
      toast.error('Enter an endpoint before testing');
      return;
    }

    try {
      setTestingConnection(true);
      const result = await testVmSourceConnection({
        endpoint: formData.endpoint,
        username: formData.username,
        password: formData.password,
      });

      if (result.success) {
        setLastSuccessfulTestKey(getConnectionTestKey(formData));
        toast.success(result.message, {
          description: result.detail,
        });
      } else {
        setLastSuccessfulTestKey(null);
        toast.error(result.message, {
          description: result.detail,
        });
      }
    } catch {
      setLastSuccessfulTestKey(null);
      toast.error('Failed to test vCenter connection');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const result = await syncAllVmSources();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      await loadSources();
    } catch {
      toast.error('Failed to sync vCenter sources');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSource = async (source: VmVCenterSource) => {
    try {
      setSyncingSourceIds((current) => [...current, source.id]);
      const result = await syncVmSource(source.id);
      if (result.success) {
        toast.success(result.message, {
          description: result.detail,
        });
      } else {
        toast.error(result.message, {
          description: result.detail,
        });
      }
      await loadSources();
    } catch {
      toast.error(`Failed to sync ${source.name}`);
    } finally {
      setSyncingSourceIds((current) => current.filter((id) => id !== source.id));
    }
  };

  const handleDeleteSource = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteVmSource(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      await loadSources();
    } catch {
      toast.error('Failed to delete vCenter source');
    }
  };

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="workspace-subtle">Compute Sync Settings</p>
              <h2 className="workspace-heading">vCenter Sources</h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Manage source connections, trigger discovery syncs, and review what enters the VM promotion queue before it becomes active inventory.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Last synced: {stats.lastSyncLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => router.push('/dashboard/vm')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Inventory
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={openAddDialog}
                  disabled={syncingAll}
                >
                  <Plus className="h-4 w-4" />
                  Add vCenter
                </Button>
                <Button size="lg" className="gap-2" onClick={handleSyncAll} disabled={syncingAll || loading}>
                  <RefreshCw className={cn('h-4 w-4', syncingAll && 'animate-spin')} />
                  {syncingAll ? 'Syncing Sources...' : 'Sync All Sources'}
                </Button>
              </div>
            </div>
          </div>

          {syncingAll || syncingSourceIds.length > 0 ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-[12px] border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[11px] font-medium text-sky-200">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              <span>
                {syncingAll
                  ? 'Syncing all connected vCenter sources. This may take a moment.'
                  : `Syncing ${syncingSourceIds.length} source${syncingSourceIds.length === 1 ? '' : 's'}...`}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="table-shell">
        <div className="table-section-header">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Source Control</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Track connection health, VM coverage, and trigger syncs without leaving the page.
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {sources.length} connected source{sources.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-frame min-w-[980px]">
            <thead>
              <tr className="table-head-row">
                <th className="px-4 py-3 font-medium">Source Name</th>
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Discovered VMs</th>
                <th className="px-4 py-3 font-medium">Sync Interval</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Sync</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading sources...
                    </div>
                  </td>
                </tr>
              ) : sources.map((source) => (
                <tr key={source.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-muted-foreground">
                        <Server className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[13px] font-semibold text-foreground">
                        {source.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {source.endpoint}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {source.vmCount}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    Every {source.syncInterval}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-md border px-2 py-1 text-[10px] font-medium',
                        syncingAll || syncingSourceIds.includes(source.id)
                          ? 'border-sky-500/25 bg-sky-500/10 text-sky-200'
                          : source.status === 'Healthy'
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
                      )}
                    >
                      {syncingAll || syncingSourceIds.includes(source.id) ? 'Syncing...' : source.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {source.lastSyncAt}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-8 w-8"
                        aria-label={`Run sync for ${source.name}`}
                        disabled={syncingAll || syncingSourceIds.includes(source.id)}
                        onClick={() => void handleSyncSource(source)}
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', (syncingAll || syncingSourceIds.includes(source.id)) && 'animate-spin')} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-8 w-8"
                        aria-label={`Edit ${source.name}`}
                        disabled={syncingAll || syncingSourceIds.includes(source.id)}
                        onClick={() => openEditDialog(source)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-8 w-8"
                        aria-label={`Delete ${source.name}`}
                        disabled={syncingAll || syncingSourceIds.includes(source.id)}
                        onClick={() => setDeleteTarget(source)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>
              {editingSourceId ? 'Edit vCenter Source' : 'Add vCenter Source'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Source Name</Label>
                <Input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="vc-prod-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endpoint</Label>
                <Input
                  value={formData.endpoint}
                  onChange={(event) =>
                    setFormData((current) => {
                      return {
                        ...current,
                        endpoint: event.target.value,
                      };
                    })
                  }
                  placeholder="vcenter-prod.dc1.local"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sync Interval</Label>
                <Select
                  value={formData.syncInterval}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      syncInterval: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select sync interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNC_INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((current) => {
                      return {
                        ...current,
                        username: event.target.value,
                      };
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => {
                      return {
                        ...current,
                        password: event.target.value,
                      };
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div
                  className={cn(
                    'rounded-[12px] border px-4 py-3 text-sm',
                    isConnectionVerified
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isConnectionVerified ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {isConnectionVerified ? 'Connection verified' : 'Retest required'}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] opacity-90">
                    {isConnectionVerified
                      ? 'This endpoint and credential set passed Test Connect. The source is ready to save.'
                      : 'Run Test Connect with the current endpoint and credentials before saving this source.'}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-medium opacity-90">
                    <PlugZap className="h-3.5 w-3.5" />
                    <span>
                      {isConnectionVerified
                        ? 'Save is enabled for the current connection values.'
                        : 'Changing endpoint, username, or password will keep Save disabled until retested.'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Optional notes for the sync source"
                />
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => void handleTestConnection()}
                disabled={saving || testingConnection}
              >
                {testingConnection ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Test Connect
              </Button>

              <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  resetForm();
                }}
                disabled={saving || testingConnection}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving || testingConnection || !isConnectionVerified}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {editingSourceId ? 'Save changes' : 'Save source'}
              </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle>Delete vCenter Source</DialogTitle>
            <DialogDescription>
              Remove this source and its discovery records from the VM intake flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[14px] border border-border/70 bg-background/55 px-4 py-3">
              <div className="text-sm font-semibold text-foreground">
                {deleteTarget?.name}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {deleteTarget?.endpoint}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSource}>
                Delete source
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
