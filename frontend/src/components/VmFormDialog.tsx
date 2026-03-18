'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VM_ENVIRONMENT_FILTERS, VM_LIFECYCLE_FILTERS, type VmDiscoveryItem, type VmInventoryDetail } from '@/lib/vm-inventory';

interface VmAccountFormValue {
  username: string;
  password: string;
  accessMethod: string;
  role: string;
  note: string;
}

interface VmFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vmToEdit?: VmInventoryDetail | null;
  discoveryVm?: VmDiscoveryItem | null;
}

const EMPTY_ACCOUNT: VmAccountFormValue = {
  username: '',
  password: '',
  accessMethod: 'SSH',
  role: '',
  note: '',
};

const DEFAULT_FORM = {
  name: '',
  moid: '',
  vcenterName: '',
  vcenterVersion: '',
  powerState: 'RUNNING',
  cluster: '',
  host: '',
  guestOs: '',
  primaryIp: '',
  environment: 'PROD',
  owner: '',
  businessUnit: '',
  slaTier: '',
  description: '',
  notes: '',
  lifecycleState: 'DRAFT',
  tags: '',
};

export function VmFormDialog({ open, onOpenChange, vmToEdit, discoveryVm }: VmFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [accounts, setAccounts] = useState<VmAccountFormValue[]>([{ ...EMPTY_ACCOUNT }]);

  const lifecycleLabel = VM_LIFECYCLE_FILTERS.find((item) => item.value === formData.lifecycleState)?.label ?? 'Draft';

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setAccounts([{ ...EMPTY_ACCOUNT }]);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!vmToEdit && !discoveryVm) {
      resetForm();
      return;
    }

    if (vmToEdit) {
      setFormData({
        name: vmToEdit.name,
        moid: vmToEdit.moid,
        vcenterName: vmToEdit.vcenterName,
        vcenterVersion: vmToEdit.vcenterVersion,
        powerState: vmToEdit.powerState,
        cluster: vmToEdit.cluster,
        host: vmToEdit.host,
        guestOs: vmToEdit.guestOs,
        primaryIp: vmToEdit.primaryIp,
        environment: vmToEdit.environment,
        owner: vmToEdit.owner,
        businessUnit: vmToEdit.businessUnit,
        slaTier: vmToEdit.slaTier,
        description: vmToEdit.description,
        notes: vmToEdit.notes,
        lifecycleState: vmToEdit!.lifecycleState,
        tags: vmToEdit.tags.join(', '),
      });
      setAccounts(
        vmToEdit.guestAccounts.length > 0
          ? vmToEdit.guestAccounts.map((account) => ({
              username: account.username,
              password: account.password,
              accessMethod: account.accessMethod,
              role: account.role,
              note: account.note ?? '',
            }))
          : [{ ...EMPTY_ACCOUNT }],
      );
      return;
    }

    setFormData({
      name: discoveryVm?.name ?? '',
      moid: discoveryVm?.moid ?? '',
      vcenterName: discoveryVm?.sourceName ?? '',
      vcenterVersion: discoveryVm?.sourceVersion ?? '',
      powerState: discoveryVm?.powerState ?? 'RUNNING',
      cluster: discoveryVm?.cluster ?? '',
      host: discoveryVm?.host ?? '',
      guestOs: discoveryVm?.guestOs ?? '',
      primaryIp: discoveryVm?.primaryIp ?? '',
      environment: discoveryVm?.suggestedEnvironment ?? 'PROD',
      owner: discoveryVm?.suggestedOwner ?? '',
      businessUnit: '',
      slaTier: '',
      description: discoveryVm?.note ?? '',
      notes: '',
      lifecycleState: 'DRAFT',
      tags: discoveryVm?.tags.join(', ') ?? '',
    });
    setAccounts([{ ...EMPTY_ACCOUNT }]);
  }, [discoveryVm, open, vmToEdit]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const validAccounts = accounts.filter((account) => account.username.trim());
    if (validAccounts.length === 0) {
      toast.error('Add at least one guest account');
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      toast.success(vmToEdit ? 'VM draft updated' : discoveryVm ? 'VM draft completed' : `VM draft captured as ${lifecycleLabel.toLowerCase()}`);
      onOpenChange(false);
      resetForm();
      setLoading(false);
    }, 350);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-card sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{vmToEdit ? 'Edit VM Draft' : discoveryVm ? 'Complete VM Draft' : 'Create VM Draft'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Prototype UX for syncing from vCenter while keeping AssetOps fields editable by the team.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="surface-panel p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Source Sync</h3>
                <p className="text-[11px] text-muted-foreground">These fields usually come from vCenter and should stay read-only after sync.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                vCenter source
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="vm-name">VM Name</Label>
                <Input id="vm-name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-moid">MoID</Label>
                <Input id="vm-moid" value={formData.moid} onChange={(event) => setFormData((current) => ({ ...current, moid: event.target.value }))} placeholder="vm-123" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-vcenter">vCenter</Label>
                <Input id="vm-vcenter" value={formData.vcenterName} onChange={(event) => setFormData((current) => ({ ...current, vcenterName: event.target.value }))} placeholder="vc-prod-01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-vcenter-version">vCenter Version</Label>
                <Input id="vm-vcenter-version" value={formData.vcenterVersion} onChange={(event) => setFormData((current) => ({ ...current, vcenterVersion: event.target.value }))} placeholder="8.0.2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-state">Power State</Label>
                <Select
                  value={formData.powerState}
                  onValueChange={(value) => setFormData((current) => ({ ...current, powerState: value }))}
                >
                  <SelectTrigger id="vm-state" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUNNING">Running</SelectItem>
                    <SelectItem value="STOPPED">Stopped</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-cluster">Cluster</Label>
                <Input id="vm-cluster" value={formData.cluster} onChange={(event) => setFormData((current) => ({ ...current, cluster: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-host">Host</Label>
                <Input id="vm-host" value={formData.host} onChange={(event) => setFormData((current) => ({ ...current, host: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-os">Guest OS</Label>
                <Input id="vm-os" value={formData.guestOs} onChange={(event) => setFormData((current) => ({ ...current, guestOs: event.target.value }))} placeholder="Ubuntu 22.04 LTS" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-ip">Primary IP</Label>
                <Input id="vm-ip" value={formData.primaryIp} onChange={(event) => setFormData((current) => ({ ...current, primaryIp: event.target.value }))} placeholder="10.30.10.41" />
              </div>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">AssetOps Context</h3>
                <p className="text-[11px] text-muted-foreground">These fields are manually owned by the team and should not be overwritten by vCenter sync.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                Manual context
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="vm-env">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData((current) => ({ ...current, environment: value as typeof formData.environment }))}
                >
                  <SelectTrigger id="vm-env" className="w-full">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {VM_ENVIRONMENT_FILTERS.filter((item) => item.value !== 'ALL').map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-owner">Owner</Label>
                <Input id="vm-owner" value={formData.owner} onChange={(event) => setFormData((current) => ({ ...current, owner: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-bu">Business Unit</Label>
                <Input id="vm-bu" value={formData.businessUnit} onChange={(event) => setFormData((current) => ({ ...current, businessUnit: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-sla">SLA Tier</Label>
                <Input id="vm-sla" value={formData.slaTier} onChange={(event) => setFormData((current) => ({ ...current, slaTier: event.target.value }))} placeholder="Tier 2" />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label htmlFor="vm-description">Description</Label>
                <textarea
                  id="vm-description"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-[0_14px_35px_-28px_rgba(0,0,0,0.45)] outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Why this VM exists and who owns the context"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label htmlFor="vm-notes">Notes</Label>
                <textarea
                  id="vm-notes"
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-[0_14px_35px_-28px_rgba(0,0,0,0.45)] outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Anything special the team should know"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="vm-tags">Tags</Label>
                <Input
                  id="vm-tags"
                  value={formData.tags}
                  onChange={(event) => setFormData((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="api, linux, runtime"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="vm-lifecycle">Lifecycle</Label>
                <Select
                  value={formData.lifecycleState}
                  onValueChange={(value) => setFormData((current) => ({ ...current, lifecycleState: value as typeof formData.lifecycleState }))}
                >
                  <SelectTrigger id="vm-lifecycle" className="w-full">
                    <SelectValue placeholder="Select lifecycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {VM_LIFECYCLE_FILTERS.filter((item) => item.value !== 'ALL').map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Guest Accounts</h3>
                <p className="text-[11px] text-muted-foreground">Multiple OS accounts can live under one VM record.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAccounts((current) => [...current, { ...EMPTY_ACCOUNT }])}>
                <Plus className="h-3.5 w-3.5" />
                Add account
              </Button>
            </div>

            <div className="space-y-3">
              {accounts.map((account, index) => (
                <div key={`vm-account-${index}`} className="surface-panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account {index + 1}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setAccounts((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1.5">
                      <Label>Username</Label>
                      <Input value={account.username} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, username: event.target.value } : item)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input type="password" value={account.password} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, password: event.target.value } : item)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Access</Label>
                      <Select
                        value={account.accessMethod}
                        onValueChange={(value) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, accessMethod: value } : item)))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select access" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SSH">SSH</SelectItem>
                          <SelectItem value="RDP">RDP</SelectItem>
                          <SelectItem value="CONSOLE">Console</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <Input value={account.role} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, role: event.target.value } : item)))} placeholder="OS admin, service account" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
                      <Label>Note</Label>
                      <Input value={account.note} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, note: event.target.value } : item)))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : vmToEdit ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
