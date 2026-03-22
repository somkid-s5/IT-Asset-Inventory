'use client';

import { FormEvent, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VM_CRITICALITY_OPTIONS, VM_ENVIRONMENT_FILTERS, VM_LIFECYCLE_FILTERS, type VmDiscoveryItem, type VmInventoryDetail } from '@/lib/vm-inventory';

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
  systemName: '',
  moid: '',
  vcenterName: '',
  vcenterVersion: '',
  powerState: 'RUNNING',
  cluster: '',
  host: '',
  guestOs: '',
  primaryIp: '',
  cpuCores: '',
  memoryGb: '',
  storageGb: '',
  networkLabel: '',
  environment: 'PROD',
  owner: '',
  businessUnit: '',
  slaTier: '',
  serviceRole: '',
  criticality: 'STANDARD',
  description: '',
  notes: '',
  lifecycleState: 'DRAFT',
  tags: '',
};

function buildFormData(vmToEdit?: VmInventoryDetail | null, discoveryVm?: VmDiscoveryItem | null) {
  if (vmToEdit) {
    return {
      name: vmToEdit.name,
      systemName: vmToEdit.systemName,
      moid: vmToEdit.moid,
      vcenterName: vmToEdit.vcenterName,
      vcenterVersion: vmToEdit.vcenterVersion,
      powerState: vmToEdit.powerState,
      cluster: vmToEdit.cluster,
      host: vmToEdit.host,
      guestOs: vmToEdit.guestOs,
      primaryIp: vmToEdit.primaryIp,
      cpuCores: String(vmToEdit.cpuCores),
      memoryGb: String(vmToEdit.memoryGb),
      storageGb: String(vmToEdit.storageGb),
      networkLabel: vmToEdit.networkLabel,
      environment: vmToEdit.environment,
      owner: vmToEdit.owner,
      businessUnit: vmToEdit.businessUnit,
      slaTier: vmToEdit.slaTier,
      serviceRole: vmToEdit.serviceRole,
      criticality: vmToEdit.criticality,
      description: vmToEdit.description,
      notes: vmToEdit.notes,
      lifecycleState: vmToEdit.lifecycleState,
      tags: vmToEdit.tags.join(', '),
    };
  }

  if (discoveryVm) {
    return {
      name: discoveryVm.name,
      systemName: discoveryVm.systemName ?? '',
      moid: discoveryVm.moid,
      vcenterName: discoveryVm.sourceName,
      vcenterVersion: discoveryVm.sourceVersion,
      powerState: discoveryVm.powerState,
      cluster: discoveryVm.cluster,
      host: discoveryVm.host,
      guestOs: discoveryVm.guestOs,
      primaryIp: discoveryVm.primaryIp,
      cpuCores: String(discoveryVm.cpuCores),
      memoryGb: String(discoveryVm.memoryGb),
      storageGb: String(discoveryVm.storageGb),
      networkLabel: discoveryVm.networkLabel,
      environment: discoveryVm.suggestedEnvironment ?? 'PROD',
      owner: discoveryVm.suggestedOwner ?? '',
      businessUnit: '',
      slaTier: '',
      serviceRole: discoveryVm.suggestedServiceRole ?? '',
      criticality: discoveryVm.suggestedCriticality ?? 'STANDARD',
      description: discoveryVm.note ?? '',
      notes: '',
      lifecycleState: 'DRAFT',
      tags: discoveryVm.tags.join(', '),
    };
  }

  return DEFAULT_FORM;
}

function buildAccounts(vmToEdit?: VmInventoryDetail | null) {
  if (!vmToEdit) {
    return [{ ...EMPTY_ACCOUNT }];
  }

  return vmToEdit.guestAccounts.length > 0
    ? vmToEdit.guestAccounts.map((account) => ({
        username: account.username,
        password: account.password,
        accessMethod: account.accessMethod,
        role: account.role,
        note: account.note ?? '',
      }))
    : [{ ...EMPTY_ACCOUNT }];
}

export function VmFormDialog({ open, onOpenChange, vmToEdit, discoveryVm }: VmFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => buildFormData(vmToEdit, discoveryVm));
  const [accounts, setAccounts] = useState<VmAccountFormValue[]>(() => buildAccounts(vmToEdit));

  const lifecycleLabel = VM_LIFECYCLE_FILTERS.find((item) => item.value === formData.lifecycleState)?.label ?? 'Draft';

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setAccounts([{ ...EMPTY_ACCOUNT }]);
  };

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
            Source Sync stays read-only from vCenter, while AssetOps Context is owned and maintained by the team.
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
                <Input id="vm-name" value={formData.name} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-moid">MoID</Label>
                <Input id="vm-moid" value={formData.moid} readOnly className="pointer-events-none" placeholder="vm-123" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-vcenter">vCenter</Label>
                <Input id="vm-vcenter" value={formData.vcenterName} readOnly className="pointer-events-none" placeholder="vc-prod-01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-vcenter-version">vCenter Version</Label>
                <Input id="vm-vcenter-version" value={formData.vcenterVersion} readOnly className="pointer-events-none" placeholder="8.0.2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-state">Power State</Label>
                <Select
                  value={formData.powerState}
                  onValueChange={() => undefined}
                  disabled
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
                <Input id="vm-cluster" value={formData.cluster} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-host">Host</Label>
                <Input id="vm-host" value={formData.host} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-os">Guest OS</Label>
                <Input id="vm-os" value={formData.guestOs} readOnly className="pointer-events-none" placeholder="Ubuntu 22.04 LTS" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-ip">Primary IP</Label>
                <Input id="vm-ip" value={formData.primaryIp} readOnly className="pointer-events-none" placeholder="10.30.10.41" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-cpu">CPU Cores</Label>
                <Input id="vm-cpu" value={formData.cpuCores} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-memory">Memory (GB)</Label>
                <Input id="vm-memory" value={formData.memoryGb} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-storage">Storage (GB)</Label>
                <Input id="vm-storage" value={formData.storageGb} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-network">Network</Label>
                <Input id="vm-network" value={formData.networkLabel} readOnly className="pointer-events-none" />
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
                <Label htmlFor="vm-system-name">System Name</Label>
                <Input
                  id="vm-system-name"
                  value={formData.systemName}
                  onChange={(event) => setFormData((current) => ({ ...current, systemName: event.target.value }))}
                  placeholder="Trade API Platform"
                />
              </div>
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
              <div className="space-y-1.5">
                <Label htmlFor="vm-service-role">Service Role</Label>
                <Input
                  id="vm-service-role"
                  value={formData.serviceRole}
                  onChange={(event) => setFormData((current) => ({ ...current, serviceRole: event.target.value }))}
                  placeholder="API Runtime"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-criticality">Criticality</Label>
                <Select
                  value={formData.criticality}
                  onValueChange={(value) => setFormData((current) => ({ ...current, criticality: value as typeof formData.criticality }))}
                >
                  <SelectTrigger id="vm-criticality" className="w-full">
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    {VM_CRITICALITY_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label htmlFor="vm-description">Service Purpose</Label>
                <textarea
                  id="vm-description"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-[0_14px_35px_-28px_rgba(0,0,0,0.45)] outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="What business system or service this VM supports"
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
