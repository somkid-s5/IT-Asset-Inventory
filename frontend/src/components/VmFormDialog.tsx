'use client';

import { FormEvent, useEffect, useState, useCallback } from 'react';
import { Monitor, Plus, Trash2, Lock, Unlock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [lockedFields, setLockedFields] = useState<string[]>(() => {
    return vmToEdit?.managedFields || [];
  });

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
    setLockedFields(vmToEdit?.managedFields || []);
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
        managedFields: lockedFields,
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
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            {vmToEdit ? 'Edit Virtual Machine' : discoveryVm && submitMode === 'promote' ? 'Complete VM Setup' : discoveryVm ? 'VM Details' : 'Create New VM'}
          </DialogTitle>
          <DialogDescription>
            {vmToEdit ? 'Modify the existing virtual machine configuration.' : 'Enter virtual machine specifications and resource allocations.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="surface-panel p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Source Sync Information</h3>
                <p className="text-[11px] text-muted-foreground">This data comes directly from vCenter and is read-only.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                vCenter Source
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="vm-name">VM Name</Label>
                <Input
                  id="vm-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, name: e.target.value }));
                    if (!lockedFields.includes('name')) {
                      setLockedFields(prev => [...prev, 'name']);
                    }
                  }}
                  readOnly={!lockedFields.includes('name')}
                  className={cn(!lockedFields.includes('name') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-moid">MoID</Label>
                <Input id="vm-moid" value={formData.moid} readOnly className="pointer-events-none opacity-80 bg-muted/20" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-vcenter">vCenter Server</Label>
                <Input id="vm-vcenter" value={formData.vcenterName} readOnly className="pointer-events-none opacity-80 bg-muted/20" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-state">Power Status</Label>
                <Select
                  value={formData.powerState}
                  onValueChange={(value) => {
                    setFormData(c => ({ ...c, powerState: value }));
                    if (!lockedFields.includes('powerState')) {
                      setLockedFields(prev => [...prev, 'powerState']);
                    }
                  }}
                  disabled={!lockedFields.includes('powerState')}
                >
                  <SelectTrigger id="vm-state" className={cn("w-full h-10", !lockedFields.includes('powerState') && "pointer-events-none opacity-80 bg-muted/20")}>
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
                <Input
                  id="vm-cluster"
                  value={formData.cluster}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, cluster: e.target.value }));
                    if (!lockedFields.includes('cluster')) {
                      setLockedFields(prev => [...prev, 'cluster']);
                    }
                  }}
                  readOnly={!lockedFields.includes('cluster')}
                  className={cn(!lockedFields.includes('cluster') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-host">Host</Label>
                <Input
                  id="vm-host"
                  value={formData.host}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, host: e.target.value }));
                    if (!lockedFields.includes('host')) {
                      setLockedFields(prev => [...prev, 'host']);
                    }
                  }}
                  readOnly={!lockedFields.includes('host')}
                  className={cn(!lockedFields.includes('host') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-computer-name">Computer Name</Label>
                <Input
                  id="vm-computer-name"
                  value={formData.computerName}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, computerName: e.target.value }));
                    if (!lockedFields.includes('computerName')) {
                      setLockedFields(prev => [...prev, 'computerName']);
                    }
                  }}
                  readOnly={!lockedFields.includes('computerName')}
                  className={cn(!lockedFields.includes('computerName') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-os">Guest OS</Label>
                <Input
                  id="vm-os"
                  value={formData.guestOs}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, guestOs: e.target.value }));
                    if (!lockedFields.includes('guestOs')) {
                      setLockedFields(prev => [...prev, 'guestOs']);
                    }
                  }}
                  readOnly={!lockedFields.includes('guestOs')}
                  className={cn(!lockedFields.includes('guestOs') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-ip">Primary IP</Label>
                <Input
                  id="vm-ip"
                  value={formData.primaryIp}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, primaryIp: e.target.value }));
                    if (!lockedFields.includes('primaryIp')) {
                      setLockedFields(prev => [...prev, 'primaryIp']);
                    }
                  }}
                  readOnly={!lockedFields.includes('primaryIp')}
                  className={cn(!lockedFields.includes('primaryIp') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-cpu">CPU (Cores)</Label>
                <Input
                  id="vm-cpu"
                  value={formData.cpuCores}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, cpuCores: e.target.value }));
                    if (!lockedFields.includes('cpuCores')) {
                      setLockedFields(prev => [...prev, 'cpuCores']);
                    }
                  }}
                  readOnly={!lockedFields.includes('cpuCores')}
                  className={cn(!lockedFields.includes('cpuCores') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-memory">Memory (GB)</Label>
                <Input
                  id="vm-memory"
                  value={formData.memoryGb}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, memoryGb: e.target.value }));
                    if (!lockedFields.includes('memoryGb')) {
                      setLockedFields(prev => [...prev, 'memoryGb']);
                    }
                  }}
                  readOnly={!lockedFields.includes('memoryGb')}
                  className={cn(!lockedFields.includes('memoryGb') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-storage">Storage (GB)</Label>
                <Input
                  id="vm-storage"
                  value={formData.storageGb}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, storageGb: e.target.value }));
                    if (!lockedFields.includes('storageGb')) {
                      setLockedFields(prev => [...prev, 'storageGb']);
                    }
                  }}
                  readOnly={!lockedFields.includes('storageGb')}
                  className={cn(!lockedFields.includes('storageGb') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-network">Network Label</Label>
                <Input
                  id="vm-network"
                  value={formData.networkLabel}
                  onChange={(e) => {
                    setFormData(c => ({ ...c, networkLabel: e.target.value }));
                    if (!lockedFields.includes('networkLabel')) {
                      setLockedFields(prev => [...prev, 'networkLabel']);
                    }
                  }}
                  readOnly={!lockedFields.includes('networkLabel')}
                  className={cn(!lockedFields.includes('networkLabel') && "pointer-events-none opacity-80 bg-muted/20")}
                />
              </div>
            </div>
          </section>

          {/* Drift Protection (Field Locks) Section */}
          <section className="surface-panel p-4 space-y-4 border-2 border-primary/20 bg-primary/[0.01]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                   <Shield className="h-4 w-4 text-primary animate-pulse" /> Sync Drift Protection & Field Locks
                </h3>
                <p className="text-[11px] text-muted-foreground">Select fields that should NOT be overwritten by vCenter sync runs.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground flex items-center gap-1 font-bold">
                <Lock className="h-3 w-3" /> Manual Control
              </span>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 pt-2">
               {[
                 { key: 'name', label: 'VM Name' },
                 { key: 'primaryIp', label: 'Primary IP' },
                 { key: 'cpuCores', label: 'CPU Cores' },
                 { key: 'memoryGb', label: 'Memory RAM' },
                 { key: 'storageGb', label: 'Storage GB' },
                 { key: 'networkLabel', label: 'Network Label' },
                 { key: 'powerState', label: 'Power Status' },
                 { key: 'host', label: 'ESXi Host' },
                 { key: 'cluster', label: 'VCenter Cluster' },
               ].map((field) => {
                 const isLocked = lockedFields.includes(field.key);
                 return (
                   <label
                     key={field.key}
                     className={cn(
                       "flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all hover:bg-muted/40",
                       isLocked ? "border-primary/40 bg-primary/[0.02]" : "border-border/60 bg-background/20"
                     )}
                   >
                     <input
                       type="checkbox"
                       checked={isLocked}
                       onChange={() => {
                         setLockedFields(prev =>
                           prev.includes(field.key)
                             ? prev.filter(f => f !== field.key)
                             : [...prev, field.key]
                         );
                       }}
                       className="rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                     />
                     <div className="min-w-0">
                        <div className="text-xs font-bold truncate text-foreground">{field.label}</div>
                        <div className="text-[9px] text-muted-foreground tracking-tight font-medium uppercase flex items-center gap-1">
                           {isLocked ? (
                             <><Lock className="h-2.5 w-2.5 text-primary" /> Protected</>
                           ) : (
                             <><Unlock className="h-2.5 w-2.5 text-muted-foreground" /> Auto-Sync</>
                           )}
                        </div>
                     </div>
                   </label>
                 );
               })}
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">AssetOps Context (Business Info)</h3>
                <p className="text-[11px] text-muted-foreground">This section is managed by IT staff for tracking and ownership.</p>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                Internal Management
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label required>System Name / Service</Label>
                <Input
                  id="vm-system-name"
                  value={formData.systemName}
                  onChange={(event) => setFormData((current) => ({ ...current, systemName: event.target.value }))}
                  placeholder="e.g. Payment System, API Gateway"
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Environment</Label>
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
                <Label required>Service Role</Label>
                <Select
                  value={formData.serviceRole}
                  onValueChange={(value) => setFormData((current) => ({ ...current, serviceRole: value }))}
                >
                  <SelectTrigger id="vm-service-role" className="w-full">
                    <SelectValue placeholder="Select role" />
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
                <Label optional>Business Purpose</Label>
                <textarea
                  id="vm-description"
                  value={formData.description}
                  onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-[0_14px_35px_-28px_rgba(0,0,0,0.45)] outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Describe the business purpose of this VM"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label optional>Operational Notes</Label>
                <textarea
                  id="vm-notes"
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-[0_14px_35px_-28px_rgba(0,0,0,0.45)] outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Additional operational notes"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label optional>Tags</Label>
                <Input
                  id="vm-tags"
                  value={formData.tags}
                  onChange={(event) => setFormData((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="e.g. api, linux, runtime (comma separated)"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Guest Accounts</h3>
                <p className="text-[11px] text-muted-foreground">Add one or more OS-level accounts for this virtual machine.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAccounts((current) => [...current, { ...EMPTY_ACCOUNT }])}>
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>

            <div className="space-y-3">
              {accounts.map((account, index) => (
                <div key={`vm-account-${index}`} className="surface-panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account #{index + 1}</div>
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
                      <Label required>Username</Label>
                      <Input value={account.username} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, username: event.target.value } : item)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Password</Label>
                      <Input type="password" value={account.password} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, password: event.target.value } : item)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label optional>Method</Label>
                      <Select
                        value={account.accessMethod}
                        onValueChange={(value) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, accessMethod: value } : item)))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SSH">SSH</SelectItem>
                          <SelectItem value="RDP">RDP</SelectItem>
                          <SelectItem value="CONSOLE">Console</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label optional>Role</Label>
                      <Input value={account.role} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, role: event.target.value } : item)))} placeholder="e.g. OS Admin, Service Account" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
                      <Label optional>Notes</Label>
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
              {loading ? 'Saving...' : vmToEdit ? 'Save Changes' : submitMode === 'promote' ? 'Promote to Inventory' : 'Save Draft'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
