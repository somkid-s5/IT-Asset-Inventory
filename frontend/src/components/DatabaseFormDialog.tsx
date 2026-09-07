"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import api from "@/services/api";
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
import { MultiCheckbox } from "@/components/ui/multi-checkbox";
import type {
  DatabaseAccountFormValue,
  DatabaseInventoryDetail,
  DatabaseHostOptions,
  DatabaseInventoryPayload,
  DatabaseLinkedAppFormValue,
} from "@/lib/database-inventory";
import {
  joinCommaSeparated,
  parseLinkedApps,
  serializeLinkedApps,
  splitCommaSeparated,
} from "@/lib/database-inventory";

interface DatabaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseToEdit?: DatabaseInventoryDetail | null;
  onSuccess: () => void;
}

const EMPTY_ACCOUNT: DatabaseAccountFormValue = {
  username: "",
  password: "",
  role: "",
  privileges: "",
  note: "",
  scope: "INSTANCE",
  logicalDatabaseIds: [],
};

const EMPTY_LINKED_APP: DatabaseLinkedAppFormValue = {
  ipAddress: "",
  description: "",
};

const DEFAULT_FORM = {
  name: "",
  environment: "PROD",
  engine: "",
  version: "",
  host: "",
  ipAddress: "",
  port: "",
  serviceName: "",
  owner: "",
  status: "ACTIVE",
  note: "",
  backupPolicy: "",
  replication: "",
  maintenanceWindow: "",
};

const COMPACT_INPUT_CLASS = "h-9 rounded-[10px] px-3 text-sm";
const COMPACT_SELECT_TRIGGER_CLASS = "w-full rounded-[10px] px-3 text-sm";
const DATABASE_ENGINE_OPTIONS = [
  "Oracle",
  "PostgreSQL",
  "MySQL",
  "MariaDB",
  "SQL Server",
  "MongoDB",
  "DB2",
];
const DATABASE_ENVIRONMENT_OPTIONS = ["PROD", "UAT", "TEST"];
type DatabaseHostMode = "TEXT" | "ASSET" | "VM";
const EMPTY_HOST_OPTIONS: DatabaseHostOptions = { assets: [], vms: [] };

export function DatabaseFormDialog({
  open,
  onOpenChange,
  databaseToEdit,
  onSuccess,
}: DatabaseFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const { confirmDiscard } = useUnsavedChanges(open, formData);
  const requestClose = () => {
    if (loading || !confirmDiscard()) return;
    onOpenChange(false);
  };
  const [accounts, setAccounts] = useState<DatabaseAccountFormValue[]>([
    { ...EMPTY_ACCOUNT },
  ]);
  const [removedAccountIds, setRemovedAccountIds] = useState<string[]>([]);
  const [linkedApps, setLinkedApps] = useState<DatabaseLinkedAppFormValue[]>([
    { ...EMPTY_LINKED_APP },
  ]);
  const [logicalDatabases, setLogicalDatabases] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>(
    {},
  );
  const [hostMode, setHostMode] = useState<DatabaseHostMode>("TEXT");
  const [hostAssetId, setHostAssetId] = useState("");
  const [hostVmId, setHostVmId] = useState("");
  const [hostSearch, setHostSearch] = useState("");
  const [hostOptions, setHostOptions] =
    useState<DatabaseHostOptions>(EMPTY_HOST_OPTIONS);
  const [hostOptionsLoading, setHostOptionsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!databaseToEdit) {
      setFormData(DEFAULT_FORM);
      setAccounts([{ ...EMPTY_ACCOUNT }]);
      setRemovedAccountIds([]);
      setLinkedApps([{ ...EMPTY_LINKED_APP }]);
      setLogicalDatabases("");
      setHostMode("TEXT");
      setHostAssetId("");
      setHostVmId("");
      setHostSearch("");
      return;
    }

    setFormData({
      name: databaseToEdit.name ?? "",
      environment: databaseToEdit.environment ?? "",
      engine: databaseToEdit.engine ?? "",
      version: databaseToEdit.version ?? "",
      host: databaseToEdit.host ?? "",
      ipAddress: databaseToEdit.ipAddress ?? "",
      port: databaseToEdit.port ?? "",
      serviceName: databaseToEdit.serviceName ?? "",
      owner: databaseToEdit.owner ?? "",
      status: databaseToEdit.status ?? "ACTIVE",
      note: databaseToEdit.note ?? "",
      backupPolicy: databaseToEdit.backupPolicy ?? "",
      replication: databaseToEdit.replication ?? "",
      maintenanceWindow: databaseToEdit.maintenanceWindow ?? "",
    });
    setHostMode(
      databaseToEdit.hostAsset
        ? "ASSET"
        : databaseToEdit.hostVm
          ? "VM"
          : "TEXT",
    );
    setHostAssetId(databaseToEdit.hostAsset?.id ?? "");
    setHostVmId(databaseToEdit.hostVm?.id ?? "");
    setHostSearch("");
    setRemovedAccountIds([]);
    setLinkedApps(
      databaseToEdit.linkedApps.length > 0
        ? parseLinkedApps(databaseToEdit.linkedApps)
        : [{ ...EMPTY_LINKED_APP }],
    );
    setLogicalDatabases(
      joinCommaSeparated(
        databaseToEdit.logicalDatabases
          ?.filter((logical) => logical.status !== "ARCHIVED")
          .map((logical) => logical.name),
      ),
    );
    setAccounts(
      databaseToEdit.accounts.length > 0
        ? databaseToEdit.accounts.map((account) => ({
            id: account.id,
            username: account.username,
            password: "",
            role: account.role ?? "",
            privileges: joinCommaSeparated(account.privileges),
            note: account.note ?? "",
            scope:
              account.scope ??
              ((account.logicalDatabaseIds?.length ?? 0) > 0
                ? "LOGICAL_DATABASES"
                : "INSTANCE"),
            logicalDatabaseIds: account.logicalDatabaseIds ?? [],
          }))
        : [{ ...EMPTY_ACCOUNT }],
    );
  }, [databaseToEdit, open]);

  useEffect(() => {
    if (!open || hostMode === "TEXT") {
      setHostOptions(EMPTY_HOST_OPTIONS);
      setHostOptionsLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setHostOptionsLoading(true);
      void api
        .get<DatabaseHostOptions>("/databases/host-options", {
          params: hostSearch.trim() ? { q: hostSearch.trim() } : undefined,
        })
        .then((response) => {
          if (cancelled) return;
          const next = response.data;
          if (
            databaseToEdit?.hostAsset &&
            !next.assets.some(
              (asset) => asset.id === databaseToEdit.hostAsset?.id,
            )
          ) {
            next.assets = [...next.assets, databaseToEdit.hostAsset];
          }
          if (
            databaseToEdit?.hostVm &&
            !next.vms.some((vm) => vm.id === databaseToEdit.hostVm?.id)
          ) {
            next.vms = [...next.vms, databaseToEdit.hostVm];
          }
          setHostOptions(next);
        })
        .catch(() => {
          if (!cancelled) setHostOptions(EMPTY_HOST_OPTIONS);
        })
        .finally(() => {
          if (!cancelled) setHostOptionsLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [databaseToEdit, hostMode, hostSearch, open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (hostMode === "TEXT" && !formData.host.trim()) {
      toast.error("Enter a host name or choose a Host Asset / Host VM");
      return;
    }
    if (hostMode === "ASSET" && !hostAssetId) {
      toast.error("Choose a Host Asset");
      return;
    }
    if (hostMode === "VM" && !hostVmId) {
      toast.error("Choose a Host VM");
      return;
    }

    const validAccounts = accounts.filter((account) => account.username.trim());
    for (const account of validAccounts) {
      if (!account.id && !account.password) {
        toast.error(
          `Password is required for new account ${account.username.trim()}`,
        );
        return;
      }
      if (
        account.scope === "LOGICAL_DATABASES" &&
        (account.logicalDatabaseIds?.length ?? 0) === 0
      ) {
        toast.error(
          `Choose at least one Logical Database for account ${account.username.trim()}`,
        );
        return;
      }
    }

    const payload: DatabaseInventoryPayload = {
      name: formData.name.trim(),
      engine: formData.engine.trim(),
      version: formData.version.trim() || undefined,
      environment: formData.environment.trim() || undefined,
      host:
        hostMode === "TEXT"
          ? formData.host.trim()
          : databaseToEdit
            ? ""
            : undefined,
      hostAssetId:
        hostMode === "ASSET" ? hostAssetId : databaseToEdit ? "" : undefined,
      hostVmId: hostMode === "VM" ? hostVmId : databaseToEdit ? "" : undefined,
      ipAddress: formData.ipAddress.trim() || undefined,
      port: formData.port.trim() || undefined,
      serviceName: formData.serviceName.trim() || undefined,
      owner: formData.owner.trim() || undefined,
      backupPolicy: formData.backupPolicy.trim() || undefined,
      replication: formData.replication.trim() || undefined,
      linkedApps: serializeLinkedApps(linkedApps),
      maintenanceWindow: formData.maintenanceWindow.trim() || undefined,
      status: formData.status || undefined,
      note: formData.note.trim() || undefined,
      accounts:
        validAccounts.length > 0 || databaseToEdit
          ? validAccounts.map((account) => ({
              id: account.id,
              username: account.username.trim(),
              password: account.password || undefined,
              role: account.role.trim(),
              privileges: splitCommaSeparated(account.privileges),
              note: account.note.trim() || undefined,
              scope: account.scope,
              logicalDatabaseIds:
                account.scope === "LOGICAL_DATABASES"
                  ? (account.logicalDatabaseIds ?? [])
                  : [],
            }))
          : undefined,
      removedAccountIds:
        databaseToEdit && removedAccountIds.length > 0
          ? removedAccountIds
          : undefined,
      logicalDatabases: splitCommaSeparated(logicalDatabases),
    };

    setLoading(true);
    try {
      if (databaseToEdit) {
        await api.patch(`/databases/${databaseToEdit.id}`, payload);
        toast.success("Database updated");
      } else {
        await api.post("/databases", payload);
        toast.success("Database created");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const errRes = (
        error as {
          response?: { data?: { message?: string | string[]; error?: string } };
        }
      ).response?.data;
      let message = "Failed to save database";
      if (errRes?.message) {
        message = Array.isArray(errRes.message)
          ? errRes.message.join(", ")
          : errRes.message;
      } else if (errRes?.error) {
        message = errRes.error;
      }
      toast.error(message);
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
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-card border-border sm:max-w-4xl rounded-xl shadow-2xl p-0">
        <DialogHeader className="border-b border-border px-6 py-5 bg-muted">
          <DialogTitle className="text-lg font-semibold flex items-center gap-3 font-display">
            <Database className="h-5 w-5 text-primary" />
            {databaseToEdit
              ? "Update Database Details"
              : "Register New Database"}
          </DialogTitle>
          <DialogDescription>
            {databaseToEdit
              ? "Modify the existing database instance settings."
              : "Enter database connection and configuration details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5 pt-0">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Core Details
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Basic information to identify the database in the system
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1.5 md:col-span-12">
                <Label htmlFor="db-note" optional>
                  Purpose / Description
                </Label>
                <Input
                  id="db-note"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.note}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="e.g. Asset Registry, Reporting System, Core API"
                />
              </div>
              <div className="space-y-1.5 md:col-span-5">
                <Label htmlFor="db-name" required>
                  Database Name
                </Label>
                <Input
                  id="db-name"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="db-engine" required>
                  Engine
                </Label>
                <Select
                  value={formData.engine || undefined}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, engine: value }))
                  }
                >
                  <SelectTrigger
                    id="db-engine"
                    size="sm"
                    className={COMPACT_SELECT_TRIGGER_CLASS}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATABASE_ENGINE_OPTIONS.map((engine) => (
                      <SelectItem key={engine} value={engine}>
                        {engine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="db-version" optional>
                  Version
                </Label>
                <Input
                  id="db-version"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.version}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      version: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="db-environment" required>
                  Environment
                </Label>
                <Select
                  value={formData.environment || undefined}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      environment: value,
                    }))
                  }
                >
                  <SelectTrigger
                    id="db-environment"
                    size="sm"
                    className={COMPACT_SELECT_TRIGGER_CLASS}
                  >
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {databaseToEdit?.environment &&
                    !DATABASE_ENVIRONMENT_OPTIONS.includes(
                      databaseToEdit.environment,
                    ) ? (
                      <SelectItem value={databaseToEdit.environment} disabled>
                        {databaseToEdit.environment} (Legacy)
                      </SelectItem>
                    ) : null}
                    {DATABASE_ENVIRONMENT_OPTIONS.map((environment) => (
                      <SelectItem key={environment} value={environment}>
                        {environment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-12 pt-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Connection Parameters
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Parameters used for database connectivity
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="db-host-mode" required>
                  Host Identity
                </Label>
                <Select
                  value={hostMode}
                  onValueChange={(value) => {
                    const nextMode = value as DatabaseHostMode;
                    setHostMode(nextMode);
                    setHostSearch("");
                    if (nextMode !== "ASSET") setHostAssetId("");
                    if (nextMode !== "VM") setHostVmId("");
                  }}
                >
                  <SelectTrigger
                    id="db-host-mode"
                    size="sm"
                    className={COMPACT_SELECT_TRIGGER_CLASS}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">Host name</SelectItem>
                    <SelectItem value="ASSET">Physical Asset</SelectItem>
                    <SelectItem value="VM">Virtual Machine</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hostMode === "TEXT" ? (
                <div className="space-y-1.5 md:col-span-5">
                  <Label htmlFor="db-host" required>
                    Host Name
                  </Label>
                  <Input
                    id="db-host"
                    className={COMPACT_INPUT_CLASS}
                    value={formData.host}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        host: event.target.value,
                      }))
                    }
                    placeholder="e.g. db-prod-01.example.local"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 md:col-span-3">
                    <Label htmlFor="db-host-search" optional>
                      Find Host
                    </Label>
                    <Input
                      id="db-host-search"
                      className={COMPACT_INPUT_CLASS}
                      value={hostSearch}
                      onChange={(event) => setHostSearch(event.target.value)}
                      placeholder={
                        hostMode === "ASSET"
                          ? "Name or Asset ID"
                          : "Name, system name, or IP"
                      }
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-5">
                    <Label htmlFor="db-host-reference" required>
                      {hostMode === "ASSET" ? "Host Asset" : "Host VM"}
                    </Label>
                    <Select
                      value={
                        hostMode === "ASSET"
                          ? hostAssetId || undefined
                          : hostVmId || undefined
                      }
                      onValueChange={(value) => {
                        if (hostMode === "ASSET") setHostAssetId(value);
                        else setHostVmId(value);
                      }}
                    >
                      <SelectTrigger
                        id="db-host-reference"
                        size="sm"
                        className={COMPACT_SELECT_TRIGGER_CLASS}
                      >
                        <SelectValue
                          placeholder={
                            hostOptionsLoading
                              ? "Loading hosts..."
                              : "Select host"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {hostMode === "ASSET"
                          ? hostOptions.assets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.name}
                                {asset.assetId ? ` · ${asset.assetId}` : ""}
                                {asset.location ? ` · ${asset.location}` : ""}
                              </SelectItem>
                            ))
                          : hostOptions.vms.map((vm) => (
                              <SelectItem key={vm.id} value={vm.id}>
                                {vm.name}
                                {vm.systemName ? ` · ${vm.systemName}` : ""}
                                {vm.primaryIp ? ` · ${vm.primaryIp}` : ""}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    {!hostOptionsLoading &&
                    ((hostMode === "ASSET" &&
                      hostOptions.assets.length === 0) ||
                      (hostMode === "VM" && hostOptions.vms.length === 0)) ? (
                      <p className="text-[11px] text-muted-foreground">
                        No matching host records found.
                      </p>
                    ) : null}
                  </div>
                </>
              )}
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="db-ip" optional>
                  IP Address
                </Label>
                <Input
                  id="db-ip"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.ipAddress}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      ipAddress: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="db-port" optional>
                  Port
                </Label>
                <Input
                  id="db-port"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.port}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      port: event.target.value,
                    }))
                  }
                  placeholder="e.g. 1521"
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="db-service-name" optional>
                  Service Name
                </Label>
                <Input
                  id="db-service-name"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.serviceName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      serviceName: event.target.value,
                    }))
                  }
                  placeholder="e.g. ORCLPROD"
                />
              </div>

              <div className="space-y-1 md:col-span-12 pt-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Backup & Operations
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Define backup, replication, and maintenance policies
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="db-status">Status</Label>
                <Select
                  value={formData.status || undefined}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger
                    id="db-status"
                    size="sm"
                    className={COMPACT_SELECT_TRIGGER_CLASS}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="db-owner" optional>
                  Owner
                </Label>
                <Input
                  id="db-owner"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.owner}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      owner: event.target.value,
                    }))
                  }
                  placeholder="e.g. DBA Team"
                />
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="db-backup-policy" optional>
                  Backup Policy
                </Label>
                <Input
                  id="db-backup-policy"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.backupPolicy}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      backupPolicy: event.target.value,
                    }))
                  }
                  placeholder="e.g. Daily Incremental"
                />
              </div>

              <div className="space-y-1.5 md:col-span-6">
                <Label htmlFor="db-replication" optional>
                  Replication Status
                </Label>
                <Input
                  id="db-replication"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.replication}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      replication: event.target.value,
                    }))
                  }
                  placeholder="e.g. Active-Passive Mirror"
                />
              </div>

              <div className="space-y-1.5 md:col-span-6">
                <Label htmlFor="db-maintenance-window" optional>
                  Maintenance Window
                </Label>
                <Input
                  id="db-maintenance-window"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.maintenanceWindow}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      maintenanceWindow: event.target.value,
                    }))
                  }
                  placeholder="e.g. Sun 02:00 - 04:00 AM"
                />
              </div>

              <div className="space-y-1 md:col-span-12 pt-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Logical Databases & Application Topology
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Logical Databases are the canonical relationship point for
                  Application Components. Client IP metadata is recorded
                  separately below.
                </p>
              </div>

              <div className="space-y-1 md:col-span-12">
                <Label htmlFor="db-logical-databases" optional>
                  Logical Databases
                </Label>
                <Input
                  id="db-logical-databases"
                  className={COMPACT_INPUT_CLASS}
                  value={logicalDatabases}
                  onChange={(event) => setLogicalDatabases(event.target.value)}
                  placeholder="e.g. billing, reporting (comma separated)"
                />
                <p className="text-[11px] text-muted-foreground">
                  Record database names separately from the instance so
                  Application Components can reference them.
                </p>
              </div>

              <div className="space-y-3 md:col-span-12">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Operational Client IP Metadata</Label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Legacy connection metadata only; this does not create
                      Application topology relationships.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLinkedApps((current) => [
                        ...current,
                        { ...EMPTY_LINKED_APP },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add IP
                  </Button>
                </div>

                <div className="space-y-2">
                  {linkedApps.map((linkedApp, index) => (
                    <div
                      key={`linked-app-${index}`}
                      className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]"
                    >
                      <Input
                        className={COMPACT_INPUT_CLASS}
                        value={linkedApp.ipAddress}
                        onChange={(event) =>
                          setLinkedApps((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, ipAddress: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="e.g. 10.10.20.15"
                      />
                      <Input
                        className={COMPACT_INPUT_CLASS}
                        value={linkedApp.description}
                        onChange={(event) =>
                          setLinkedApps((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, description: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="e.g. AssetOps API, Reporting System"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setLinkedApps((current) =>
                            current.length === 1
                              ? [{ ...EMPTY_LINKED_APP }]
                              : current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="muted-panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Database Accounts
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Define username, password, and roles for each account
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
                <div
                  key={account.id ?? `account-${index}`}
                  className="rounded-[24px] border border-border/70 bg-background/62 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-medium text-foreground">
                      Account #{index + 1}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        const removedId = accounts[index]?.id;
                        if (removedId) {
                          setRemovedAccountIds((current) =>
                            current.includes(removedId)
                              ? current
                              : [...current, removedId],
                          );
                        }
                        setAccounts((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        );
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`db-account-username-${index}`} required>
                        Username
                      </Label>
                      <Input
                        id={`db-account-username-${index}`}
                        className={COMPACT_INPUT_CLASS}
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
                      <Label
                        htmlFor={`db-account-password-${index}`}
                        required={!account.id}
                        optional={Boolean(account.id)}
                      >
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id={`db-account-password-${index}`}
                          className={COMPACT_INPUT_CLASS}
                          type={showPasswords[index] ? "text" : "password"}
                          value={account.password}
                          placeholder={
                            account.id
                              ? "Leave blank to keep current password"
                              : "Enter password"
                          }
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
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              [index]: !prev[index],
                            }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords[index] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`db-account-role-${index}`} optional>
                        Role
                      </Label>
                      <Input
                        id={`db-account-role-${index}`}
                        className={COMPACT_INPUT_CLASS}
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
                        placeholder="e.g. DBA, Application, Reporting"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`db-account-scope-${index}`}>Scope</Label>
                      <Select
                        value={account.scope}
                        onValueChange={(value) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    scope:
                                      value as DatabaseAccountFormValue["scope"],
                                    logicalDatabaseIds:
                                      value === "INSTANCE"
                                        ? []
                                        : item.logicalDatabaseIds,
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <SelectTrigger
                          id={`db-account-scope-${index}`}
                          size="sm"
                          className={COMPACT_SELECT_TRIGGER_CLASS}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INSTANCE">
                            Whole Instance
                          </SelectItem>
                          {databaseToEdit ? (
                            <SelectItem value="LOGICAL_DATABASES">
                              Selected Logical Databases
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                      {!databaseToEdit ? (
                        <p className="text-[11px] text-muted-foreground">
                          Save the Instance first before scoping an account to
                          Logical Databases.
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`db-account-privileges-${index}`}
                        optional
                      >
                        Privileges
                      </Label>
                      <Input
                        id={`db-account-privileges-${index}`}
                        className={COMPACT_INPUT_CLASS}
                        value={account.privileges}
                        onChange={(event) =>
                          setAccounts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, privileges: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="e.g. SELECT, INSERT, UPDATE"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor={`db-account-note-${index}`} optional>
                        Notes
                      </Label>
                      <Input
                        id={`db-account-note-${index}`}
                        className={COMPACT_INPUT_CLASS}
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
                    {account.scope === "LOGICAL_DATABASES" ? (
                      <div className="md:col-span-2">
                        {databaseToEdit?.logicalDatabases?.length ? (
                          <MultiCheckbox
                            label="Logical database scope"
                            options={databaseToEdit.logicalDatabases.map(
                              (logical) => ({
                                id: logical.id,
                                label: logical.name,
                              }),
                            )}
                            value={account.logicalDatabaseIds ?? []}
                            onChange={(logicalDatabaseIds) =>
                              setAccounts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, logicalDatabaseIds }
                                    : item,
                                ),
                              )
                            }
                          />
                        ) : (
                          <p className="text-[11px] text-warning">
                            Create at least one Logical Database before using
                            this scope.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
                : databaseToEdit
                  ? "Save Changes"
                  : "Create Database"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
