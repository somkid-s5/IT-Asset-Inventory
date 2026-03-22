'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
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
import { VM_VCENTER_SOURCES, type VmVCenterSource } from '@/lib/vm-inventory';

const DEFAULT_SOURCE_FORM = {
  name: '',
  endpoint: '',
  version: '8.0.2',
  username: '',
  password: '',
  syncInterval: '15 min',
  notes: '',
};

const SYNC_INTERVAL_OPTIONS = ['5 min', '15 min', '30 min', '1 hour', '6 hours'];

export default function VmSourcesPage() {
  const router = useRouter();
  const [sources, setSources] = useState<VmVCenterSource[]>(VM_VCENTER_SOURCES);
  const [addOpen, setAddOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VmVCenterSource | null>(null);
  const [formData, setFormData] = useState(DEFAULT_SOURCE_FORM);
  const [saving, setSaving] = useState(false);
  const stats = {
    lastSyncLabel: `${sources[0]?.lastSyncAt ?? '--'} from ${sources.length} sources`,
  };

  const resetForm = () => {
    setFormData(DEFAULT_SOURCE_FORM);
    setEditingSourceId(null);
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
      version: source.version,
      username: '',
      password: '',
      syncInterval: source.syncInterval,
      notes: '',
    });
    setAddOpen(true);
  };

  const handleSave = () => {
    setSaving(true);
    window.setTimeout(() => {
      if (editingSourceId) {
        setSources((current) =>
          current.map((source) =>
            source.id === editingSourceId
              ? {
                  ...source,
                  name: formData.name,
                  endpoint: formData.endpoint,
                  version: formData.version,
                  syncInterval: formData.syncInterval,
                }
              : source,
          ),
        );
        toast.success('vCenter source updated');
      } else {
        setSources((current) => [
          ...current,
          {
            id: formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
            name: formData.name,
            endpoint: formData.endpoint,
            version: formData.version,
            vmCount: 0,
            status: 'Healthy',
            syncInterval: formData.syncInterval,
            lastSyncAt: 'Just now',
          },
        ]);
        toast.success('vCenter source saved');
      }
      setAddOpen(false);
      resetForm();
      setSaving(false);
    }, 350);
  };

  const handleSyncAll = () => {
    toast.success('Sync started for all vCenter sources');
  };

  const handleSyncSource = (sourceName: string) => {
    toast.success(`Sync started for ${sourceName}`);
  };

  const handleDeleteSource = () => {
    if (!deleteTarget) {
      return;
    }

    setSources((current) =>
      current.filter((source) => source.id !== deleteTarget.id),
    );
    toast.success(`${deleteTarget.name} deleted`);
    setDeleteTarget(null);
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
                >
                  <Plus className="h-4 w-4" />
                  Add vCenter
                </Button>
                <Button size="lg" className="gap-2" onClick={handleSyncAll}>
                  <RefreshCw className="h-4 w-4" />
                  Sync All Sources
                </Button>
              </div>
            </div>
          </div>

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
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Discovered VMs</th>
                <th className="px-4 py-3 font-medium">Sync Interval</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Sync</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
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
                    vSphere {source.version}
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
                        source.status === 'Healthy'
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
                      )}
                    >
                      {source.status}
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
                        onClick={() => handleSyncSource(source.name)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-8 w-8"
                        aria-label={`Edit ${source.name}`}
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
                    setFormData((current) => ({
                      ...current,
                      endpoint: event.target.value,
                    }))
                  }
                  placeholder="vcenter-prod.dc1.local"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input
                  value={formData.version}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      version: event.target.value,
                    }))
                  }
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
                    setFormData((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
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

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {editingSourceId ? 'Save changes' : 'Save source'}
              </Button>
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
              Remove this source from the list. This is a mock action for now and
              only updates local page state.
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
