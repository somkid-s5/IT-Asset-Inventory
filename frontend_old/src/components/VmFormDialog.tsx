'use client';

import { FormEvent, useEffect, useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VM_ENVIRONMENT_FILTERS, VM_SERVICE_ROLE_OPTIONS, type VmDiscoveryItem, type VmInventoryDetail } from '@/lib/vm-inventory';
import { promoteVmDiscovery, updateVmDiscovery, updateVmInventory } from '@/services/vm';

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
  submitMode?: 'save' | 'promote';
  onPromoted?: (inventory: VmInventoryDetail) => void | Promise<void>;
  onSuccess?: () => void | Promise<void>;
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
  powerState: 'RUNNING',
  cluster: '',
  host: '',
  computerName: '',
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
      powerState: vmToEdit.powerState,
      cluster: vmToEdit.cluster,
      host: vmToEdit.host,
      computerName: vmToEdit.computerName ?? '',
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
      powerState: discoveryVm.powerState,
      cluster: discoveryVm.cluster,
      host: discoveryVm.host,
      computerName: discoveryVm.computerName ?? '',
      guestOs: discoveryVm.guestOs,
      primaryIp: discoveryVm.primaryIp,
      cpuCores: String(discoveryVm.cpuCores),
      memoryGb: String(discoveryVm.memoryGb),
      storageGb: String(discoveryVm.storageGb),
      networkLabel: discoveryVm.networkLabel,
      environment: discoveryVm.environment ?? discoveryVm.suggestedEnvironment ?? 'PROD',
      owner: discoveryVm.owner ?? discoveryVm.suggestedOwner ?? '',
      businessUnit: discoveryVm.businessUnit ?? '',
      slaTier: discoveryVm.slaTier ?? '',
      serviceRole: discoveryVm.serviceRole ?? discoveryVm.suggestedServiceRole ?? '',
      criticality: discoveryVm.criticality ?? discoveryVm.suggestedCriticality ?? 'STANDARD',
      description: discoveryVm.description ?? discoveryVm.note ?? '',
      notes: discoveryVm.notes ?? '',
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

export function VmFormDialog({
  open,
  onOpenChange,
  vmToEdit,
  discoveryVm,
  submitMode = 'save',
  onPromoted,
  onSuccess,
}: VmFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => buildFormData(vmToEdit, discoveryVm));
  const [accounts, setAccounts] = useState<VmAccountFormValue[]>(() => buildAccounts(vmToEdit));

  const resetForm = useCallback(() => {
    setFormData(buildFormData(vmToEdit, discoveryVm));
    setAccounts(
      vmToEdit
        ? buildAccounts(vmToEdit)
        : discoveryVm?.guestAccounts?.length
          ? discoveryVm.guestAccounts.map((account) => ({
              username: account.username,
              password: account.password,
              accessMethod: account.accessMethod,
              role: account.role,
              note: account.note ?? '',
            }))
          : [{ ...EMPTY_ACCOUNT }],
    );
  }, [vmToEdit, discoveryVm]);

  useEffect(() => {
    resetForm();
  }, [resetForm, open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validAccounts = accounts.filter((account) => account.username.trim());
    if (validAccounts.length === 0) {
      toast.error('Add at least one guest account');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        systemName: formData.systemName,
        environment: formData.environment as 'PROD' | 'TEST' | 'UAT',
        owner: formData.owner,
        businessUnit: formData.businessUnit,
        slaTier: formData.slaTier,
        serviceRole: formData.serviceRole,
        criticality: formData.criticality as 'MISSION_CRITICAL' | 'BUSINESS_CRITICAL' | 'STANDARD',
        description: formData.description,
        notes: formData.notes,
        lifecycleState: formData.lifecycleState as 'DRAFT' | 'ACTIVE' | 'DELETED_IN_VCENTER',
        tags: formData.tags,
        guestAccounts: validAccounts,
      };

      if (vmToEdit) {
        await updateVmInventory(vmToEdit.id, payload);
      } else if (discoveryVm && submitMode === 'promote') {
        const inventory = await promoteVmDiscovery(discoveryVm.id, {
          ...payload,
          lifecycleState: 'ACTIVE',
        });
        toast.success('VM promoted to active inventory');
        onOpenChange(false);
        await onPromoted?.(inventory);
        await onSuccess?.();
        return;
      } else if (discoveryVm) {
        await updateVmDiscovery(discoveryVm.id, payload);
      }

      toast.success(vmToEdit ? 'VM updated' : 'VM draft saved');
      onOpenChange(false);
      await onSuccess?.();
    } catch {
      toast.error('Failed to save VM');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-card sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{vmToEdit ? 'Edit VM Draft' : discoveryVm && submitMode === 'promote' ? 'Complete VM Setup' : discoveryVm ? 'Complete VM Draft' : 'Create VM Draft'}</DialogTitle>
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
                <Input id="vm-moid" value={formData.moid} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-vcenter">vCenter</Label>
                <Input id="vm-vcenter" value={formData.vcenterName} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-state">Power State</Label>
                <Input
                  id="vm-state"
                  value={formData.powerState === 'RUNNING' ? 'Running' : formData.powerState === 'STOPPED' ? 'Stopped' : 'Suspended'}
                  readOnly
                  className="pointer-events-none"
                />
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
                <Label htmlFor="vm-computer-name">Computer Name</Label>
                <Input id="vm-computer-name" value={formData.computerName} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-os">Guest OS</Label>
                <Input id="vm-os" value={formData.guestOs} readOnly className="pointer-events-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-ip">Primary IP</Label>
                <Input id="vm-ip" value={formData.primaryIp} readOnly className="pointer-events-none" />
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
                  placeholder="System name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-env">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData((current) => ({ ...current, environment: value as typeof formData.environment }))}
                >
                  <SelectTrigger id="vm-env" className="w-full">
                    <SelectValue placeholder="Select an environment" />
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
                <Label htmlFor="vm-service-role">Service Role</Label>
                <Select
                  value={formData.serviceRole}
                  onValueChange={(value) => setFormData((current) => ({ ...current, serviceRole: value }))}
                >
                  <SelectTrigger id="vm-service-role" className="w-full">
                    <SelectValue placeholder="Select a service role" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.serviceRole && !VM_SERVICE_ROLE_OPTIONS.includes(formData.serviceRole as (typeof VM_SERVICE_ROLE_OPTIONS)[number]) ? (
                      <SelectItem value={formData.serviceRole}>{formData.serviceRole}</SelectItem>
                    ) : null}
                    {VM_SERVICE_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
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
                  placeholder="Describe what this VM supports"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label htmlFor="vm-notes">Notes</Label>
                <textarea
                  id="vm-notes"
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-[0_14px_35px_-28px_rgba(0,0,0,0.45)] outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Add operational notes"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="vm-tags">Tags</Label>
                <Input
                  id="vm-tags"
                  value={formData.tags}
                  onChange={(event) => setFormData((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="e.g. api, linux, runtime"
                />
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
                          <SelectValue placeholder="Select an access method" />
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
                      <Input value={account.role} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, role: event.target.value } : item)))} placeholder="e.g. OS admin, service account" />
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
              {loading ? 'Saving...' : vmToEdit ? 'Save changes' : submitMode === 'promote' ? 'Save and move to Active Inventory' : 'Save draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
