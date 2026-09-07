"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import { Monitor, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VM_ENVIRONMENT_FILTERS,
  VM_SERVICE_ROLE_OPTIONS,
  type VmDiscoveryItem,
  type VmInventoryDetail,
} from "@/lib/vm-inventory";
import {
  promoteVmDiscovery,
  updateVmDiscovery,
  updateVmInventory,
} from "@/services/vm";
import api from "@/services/api";
import type { Application } from "@/lib/application";

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
  submitMode?: "save" | "promote";
  onPromoted?: (inventory: VmInventoryDetail) => void | Promise<void>;
  onSuccess?: () => void | Promise<void>;
}

const EMPTY_ACCOUNT: VmAccountFormValue = {
  username: "",
  password: "",
  accessMethod: "SSH",
  role: "",
  note: "",
};

const DEFAULT_FORM = {
  name: "",
  systemName: "",
  moid: "",
  vcenterName: "",
  powerState: "RUNNING",
  cluster: "",
  host: "",
  computerName: "",
  guestOs: "",
  primaryIp: "",
  cpuCores: "",
  memoryGb: "",
  storageGb: "",
  networkLabel: "",
  environment: "",
  owner: "",
  businessUnit: "",
  slaTier: "",
  serviceRole: "",
  criticality: "STANDARD",
  description: "",
  notes: "",
  lifecycleState: "DRAFT",
  tags: "",
};

function buildFormData(
  vmToEdit?: VmInventoryDetail | null,
  discoveryVm?: VmDiscoveryItem | null,
) {
  if (vmToEdit) {
    return {
      name: vmToEdit.name,
      systemName: vmToEdit.systemName,
      moid: vmToEdit.moid,
      vcenterName: vmToEdit.vcenterName,
      powerState: vmToEdit.powerState,
      cluster: vmToEdit.cluster,
      host: vmToEdit.host,
      computerName: vmToEdit.computerName ?? "",
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
      tags: vmToEdit.tags.join(", "),
    };
  }

  if (discoveryVm) {
    return {
      name: discoveryVm.name,
      systemName: discoveryVm.systemName ?? "",
      moid: discoveryVm.moid,
      vcenterName: discoveryVm.sourceName,
      powerState: discoveryVm.powerState,
      cluster: discoveryVm.cluster,
      host: discoveryVm.host,
      computerName: discoveryVm.computerName ?? "",
      guestOs: discoveryVm.guestOs,
      primaryIp: discoveryVm.primaryIp,
      cpuCores: String(discoveryVm.cpuCores),
      memoryGb: String(discoveryVm.memoryGb),
      storageGb: String(discoveryVm.storageGb),
      networkLabel: discoveryVm.networkLabel,
      environment: discoveryVm.environment ?? "",
      owner: discoveryVm.owner ?? discoveryVm.suggestedOwner ?? "",
      businessUnit: discoveryVm.businessUnit ?? "",
      slaTier: discoveryVm.slaTier ?? "",
      serviceRole:
        discoveryVm.serviceRole ?? discoveryVm.suggestedServiceRole ?? "",
      criticality:
        discoveryVm.criticality ??
        discoveryVm.suggestedCriticality ??
        "STANDARD",
      description: discoveryVm.description ?? discoveryVm.note ?? "",
      notes: discoveryVm.notes ?? "",
      lifecycleState: "DRAFT",
      tags: discoveryVm.tags.join(", "),
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
        password: account.password ?? "",
        accessMethod: account.accessMethod,
        role: account.role,
        note: account.note ?? "",
      }))
    : [{ ...EMPTY_ACCOUNT }];
}

export function VmFormDialog({
  open,
  onOpenChange,
  vmToEdit,
  discoveryVm,
  submitMode = "save",
  onPromoted,
  onSuccess,
}: VmFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() =>
    buildFormData(vmToEdit, discoveryVm),
  );
  const [accounts, setAccounts] = useState<VmAccountFormValue[]>(() =>
    buildAccounts(vmToEdit),
  );
  const [availableComponents, setAvailableComponents] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [primaryComponentId, setPrimaryComponentId] = useState(
    () =>
      vmToEdit?.components?.find(
        (component) => component.relationType === "PRIMARY",
      )?.id ?? "",
  );
  const [sharedComponentIds, setSharedComponentIds] = useState<string[]>(
    () =>
      vmToEdit?.components
        ?.filter((component) => component.relationType !== "PRIMARY")
        .map((component) => component.id) ?? [],
  );
  const { confirmDiscard } = useUnsavedChanges(open, {
    formData,
    accounts,
    primaryComponentId,
    sharedComponentIds,
  });
  const requestClose = () => {
    if (loading || !confirmDiscard()) return;
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    api
      .get<Application[]>("/applications")
      .then(({ data }) => {
        setAvailableComponents(
          data.flatMap((app) =>
            app.environments.flatMap((env) =>
              env.components.map((component) => ({
                id: component.id,
                label: `${app.name} · ${env.name} · ${component.name}`,
              })),
            ),
          ),
        );
      })
      .catch(() => setAvailableComponents([]));
  }, [open]);

  const resetForm = useCallback(() => {
    setFormData(buildFormData(vmToEdit, discoveryVm));
    setAccounts(
      vmToEdit
        ? buildAccounts(vmToEdit)
        : discoveryVm?.guestAccounts?.length
          ? discoveryVm.guestAccounts.map((account) => ({
              username: account.username,
              password: account.password ?? "",
              accessMethod: account.accessMethod,
              role: account.role,
              note: account.note ?? "",
            }))
          : [{ ...EMPTY_ACCOUNT }],
    );
    setPrimaryComponentId(
      vmToEdit?.components?.find(
        (component) => component.relationType === "PRIMARY",
      )?.id ?? "",
    );
    setSharedComponentIds(
      vmToEdit?.components
        ?.filter((component) => component.relationType !== "PRIMARY")
        .map((component) => component.id) ?? [],
    );
  }, [vmToEdit, discoveryVm]);

  useEffect(() => {
    resetForm();
  }, [resetForm, open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validAccounts = accounts.filter((account) => account.username.trim());
    setLoading(true);
    try {
      const payload = {
        systemName: formData.systemName,
        environment: formData.environment
          ? (formData.environment as "PROD" | "TEST" | "UAT")
          : undefined,
        owner: formData.owner,
        businessUnit: formData.businessUnit,
        slaTier: formData.slaTier,
        serviceRole: formData.serviceRole,
        criticality: formData.criticality as
          "MISSION_CRITICAL" | "BUSINESS_CRITICAL" | "STANDARD",
        description: formData.description,
        notes: formData.notes,
        tags: formData.tags,
        guestAccounts: validAccounts,
        componentLinks: [
          ...(primaryComponentId
            ? [
                {
                  componentId: primaryComponentId,
                  relationType: "PRIMARY" as const,
                },
              ]
            : []),
          ...sharedComponentIds
            .filter((componentId) => componentId !== primaryComponentId)
            .map((componentId) => ({
              componentId,
              relationType: "SHARED" as const,
            })),
        ],
      };

      if (vmToEdit) {
        await updateVmInventory(vmToEdit.id, payload);
      } else if (discoveryVm && submitMode === "promote") {
        const inventory = await promoteVmDiscovery(discoveryVm.id, {
          ...payload,
          lifecycleState: "ACTIVE",
        });
        toast.success("VM promoted to active inventory");
        onOpenChange(false);
        await onPromoted?.(inventory);
        await onSuccess?.();
        return;
      } else if (discoveryVm) {
        await updateVmDiscovery(discoveryVm.id, payload);
      }

      toast.success(vmToEdit ? "VM updated" : "VM draft saved");
      onOpenChange(false);
      await onSuccess?.();
    } catch {
      toast.error("Failed to save VM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : requestClose()
      }
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-card sm:max-w-5xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            {vmToEdit
              ? "Edit Virtual Machine"
              : discoveryVm && submitMode === "promote"
                ? "Complete VM Setup"
                : discoveryVm
                  ? "VM Details"
                  : "Create New VM"}
          </DialogTitle>
          <DialogDescription>
            {vmToEdit
              ? "Modify the existing virtual machine configuration."
              : "Enter virtual machine specifications and resource allocations."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="surface-panel p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Source Sync Information
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Authoritative facts from vCenter. Human curation cannot
                  override these values.
                </p>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                vCenter Source · Auto-Sync
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["vm-name", "VM Name", formData.name],
                ["vm-moid", "MoID", formData.moid],
                ["vm-vcenter", "vCenter Server", formData.vcenterName],
                ["vm-state", "Power Status", formData.powerState],
                ["vm-cluster", "Cluster", formData.cluster],
                ["vm-host", "Host", formData.host],
                ["vm-computer-name", "Computer Name", formData.computerName],
                ["vm-os", "Guest OS", formData.guestOs],
                ["vm-ip", "Primary IP", formData.primaryIp],
                ["vm-cpu", "CPU (Cores)", formData.cpuCores],
                ["vm-memory", "Memory (GB)", formData.memoryGb],
                ["vm-storage", "Storage (GB)", formData.storageGb],
                ["vm-network", "Network Label", formData.networkLabel],
              ].map(([id, label, value]) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={String(id)}>{label}</Label>
                  <Input
                    id={String(id)}
                    value={String(value ?? "")}
                    readOnly
                    className="pointer-events-none bg-muted/20 opacity-80"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  AssetOps Context (Business Info)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  This section is managed by IT staff for tracking and
                  ownership.
                </p>
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
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      systemName: event.target.value,
                    }))
                  }
                  placeholder="e.g. Payment System, API Gateway"
                />
              </div>
              <div className="space-y-1.5">
                <Label required>Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      environment: value as typeof formData.environment,
                    }))
                  }
                >
                  <SelectTrigger id="vm-env" className="w-full">
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {VM_ENVIRONMENT_FILTERS.filter(
                      (item) => item.value !== "ALL",
                    ).map((item) => (
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
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      serviceRole: value,
                    }))
                  }
                >
                  <SelectTrigger id="vm-service-role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.serviceRole &&
                    !VM_SERVICE_ROLE_OPTIONS.includes(
                      formData.serviceRole as (typeof VM_SERVICE_ROLE_OPTIONS)[number],
                    ) ? (
                      <SelectItem value={formData.serviceRole}>
                        {formData.serviceRole}
                      </SelectItem>
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
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Describe the business purpose of this VM"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                <Label optional>Operational Notes</Label>
                <textarea
                  id="vm-notes"
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className="min-h-24 w-full rounded-[12px] border border-border bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow,border-color,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35"
                  placeholder="Additional operational notes"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label optional>Tags</Label>
                <Input
                  id="vm-tags"
                  value={formData.tags}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="e.g. api, linux, runtime (comma separated)"
                />
              </div>
            </div>
          </section>

          <section className="surface-panel p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Application relationships
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Choose one Primary service context and any additional Shared
                components. These links are curated and are never changed by
                vCenter sync.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label optional>Primary Application Component</Label>
                <Select
                  value={primaryComponentId || "none"}
                  onValueChange={(value) => {
                    const nextPrimary = value === "none" ? "" : value;
                    setPrimaryComponentId(nextPrimary);
                    if (nextPrimary) {
                      setSharedComponentIds((current) =>
                        current.filter(
                          (componentId) => componentId !== nextPrimary,
                        ),
                      );
                    }
                  }}
                >
                  <SelectTrigger aria-label="Primary Application Component">
                    <SelectValue placeholder="No primary component" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No primary component</SelectItem>
                    {availableComponents.map((component) => (
                      <SelectItem key={component.id} value={component.id}>
                        {component.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">
                  Shared Application Components
                </legend>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-[12px] border border-border bg-background/70 p-3">
                  {availableComponents
                    .filter((component) => component.id !== primaryComponentId)
                    .map((component) => (
                      <label
                        key={component.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sharedComponentIds.includes(component.id)}
                          onChange={(event) =>
                            setSharedComponentIds((current) =>
                              event.target.checked
                                ? [...current, component.id]
                                : current.filter((id) => id !== component.id),
                            )
                          }
                        />
                        <span>{component.label}</span>
                      </label>
                    ))}
                  {availableComponents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No Application Components available.
                    </p>
                  ) : null}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Guest Accounts
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Add one or more OS-level accounts for this virtual machine.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setAccounts((current) => [...current, { ...EMPTY_ACCOUNT }])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>

            <div className="space-y-3">
              {accounts.map((account, index) => (
                <div key={`vm-account-${index}`} className="surface-panel p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Account #{index + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setAccounts((current) =>
                          current.length === 1
                            ? current
                            : current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-1.5">
                      <Label required>Username</Label>
                      <Input
                        value={account.username}
                        onChange={(event) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, username: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Password</Label>
                      <Input
                        type="password"
                        value={account.password}
                        onChange={(event) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, password: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label optional>Method</Label>
                      <Select
                        value={account.accessMethod}
                        onValueChange={(value) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, accessMethod: value }
                                : item,
                            ),
                          )
                        }
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
                      <Input
                        value={account.role}
                        onChange={(event) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, role: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="e.g. OS Admin, Service Account"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
                      <Label optional>Notes</Label>
                      <Input
                        value={account.note}
                        onChange={(event) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, note: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={requestClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : vmToEdit
                  ? "Save Changes"
                  : submitMode === "promote"
                    ? "Promote to Inventory"
                    : "Save Draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
