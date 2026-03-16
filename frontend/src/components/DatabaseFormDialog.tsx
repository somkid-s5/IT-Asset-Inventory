'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DatabaseAccountFormValue, DatabaseInventoryDetail, DatabaseInventoryPayload } from '@/lib/database-inventory';
import { joinCommaSeparated, splitCommaSeparated } from '@/lib/database-inventory';

interface DatabaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseToEdit?: DatabaseInventoryDetail | null;
  onSuccess: () => void;
}

const EMPTY_ACCOUNT: DatabaseAccountFormValue = {
  username: '',
  password: '',
  role: '',
  privileges: '',
  note: '',
};

const DEFAULT_FORM = {
  name: '',
  engine: '',
  version: '',
  environment: '',
  host: '',
  ipAddress: '',
  port: '',
  serviceName: '',
  owner: '',
  backupPolicy: '',
  replication: '',
  linkedApps: '',
  maintenanceWindow: '',
  status: '',
  note: '',
};

export function DatabaseFormDialog({ open, onOpenChange, databaseToEdit, onSuccess }: DatabaseFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [accounts, setAccounts] = useState<DatabaseAccountFormValue[]>([{ ...EMPTY_ACCOUNT }]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!databaseToEdit) {
      setFormData(DEFAULT_FORM);
      setAccounts([{ ...EMPTY_ACCOUNT }]);
      return;
    }

    setFormData({
      name: databaseToEdit.name ?? '',
      engine: databaseToEdit.engine ?? '',
      version: databaseToEdit.version ?? '',
      environment: databaseToEdit.environment ?? '',
      host: databaseToEdit.host ?? '',
      ipAddress: databaseToEdit.ipAddress ?? '',
      port: databaseToEdit.port ?? '',
      serviceName: databaseToEdit.serviceName ?? '',
      owner: databaseToEdit.owner ?? '',
      backupPolicy: databaseToEdit.backupPolicy ?? '',
      replication: databaseToEdit.replication ?? '',
      linkedApps: joinCommaSeparated(databaseToEdit.linkedApps),
      maintenanceWindow: databaseToEdit.maintenanceWindow ?? '',
      status: databaseToEdit.status ?? '',
      note: databaseToEdit.note ?? '',
    });
    setAccounts(
      databaseToEdit.accounts.length > 0
        ? databaseToEdit.accounts.map((account) => ({
            username: account.username,
            password: account.password,
            role: account.role ?? '',
            privileges: joinCommaSeparated(account.privileges),
            note: account.note ?? '',
          }))
        : [{ ...EMPTY_ACCOUNT }],
    );
  }, [databaseToEdit, open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validAccounts = accounts.filter((account) => account.username.trim());
    if (validAccounts.length === 0) {
      toast.error('Add at least one database account');
      return;
    }

    const payload: DatabaseInventoryPayload = {
      name: formData.name.trim(),
      engine: formData.engine.trim(),
      version: formData.version.trim() || undefined,
      environment: formData.environment.trim() || undefined,
      host: formData.host.trim(),
      ipAddress: formData.ipAddress.trim(),
      port: formData.port.trim() || undefined,
      serviceName: formData.serviceName.trim() || undefined,
      owner: formData.owner.trim() || undefined,
      backupPolicy: formData.backupPolicy.trim() || undefined,
      replication: formData.replication.trim() || undefined,
      linkedApps: splitCommaSeparated(formData.linkedApps),
      maintenanceWindow: formData.maintenanceWindow.trim() || undefined,
      status: formData.status.trim() || undefined,
      note: formData.note.trim() || undefined,
      accounts: validAccounts.map((account) => ({
        username: account.username.trim(),
        password: account.password,
        role: account.role.trim(),
        privileges: splitCommaSeparated(account.privileges),
        note: account.note.trim() || undefined,
      })),
    };

    setLoading(true);
    try {
      if (databaseToEdit) {
        await api.patch(`/databases/${databaseToEdit.id}`, payload);
        toast.success('Database updated');
      } else {
        await api.post('/databases', payload);
        toast.success('Database created');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to save database';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-card sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{databaseToEdit ? 'Edit Database' : 'Create Database'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="db-name">DB Name</Label>
              <Input id="db-name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-engine">Engine</Label>
              <Input id="db-engine" value={formData.engine} onChange={(event) => setFormData((current) => ({ ...current, engine: event.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-version">Version</Label>
              <Input id="db-version" value={formData.version} onChange={(event) => setFormData((current) => ({ ...current, version: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-environment">Environment</Label>
              <Input id="db-environment" value={formData.environment} onChange={(event) => setFormData((current) => ({ ...current, environment: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-host">Host</Label>
              <Input id="db-host" value={formData.host} onChange={(event) => setFormData((current) => ({ ...current, host: event.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-ip">IP Address</Label>
              <Input id="db-ip" value={formData.ipAddress} onChange={(event) => setFormData((current) => ({ ...current, ipAddress: event.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-port">Port</Label>
              <Input id="db-port" value={formData.port} onChange={(event) => setFormData((current) => ({ ...current, port: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-service-name">Service Name</Label>
              <Input id="db-service-name" value={formData.serviceName} onChange={(event) => setFormData((current) => ({ ...current, serviceName: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-owner">Owner</Label>
              <Input id="db-owner" value={formData.owner} onChange={(event) => setFormData((current) => ({ ...current, owner: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-status">Status</Label>
              <Input id="db-status" value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="db-linked-apps">Linked Apps</Label>
              <Input id="db-linked-apps" value={formData.linkedApps} onChange={(event) => setFormData((current) => ({ ...current, linkedApps: event.target.value }))} placeholder="AssetOps API, Audit Worker" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-backup">Backup Policy</Label>
              <Input id="db-backup" value={formData.backupPolicy} onChange={(event) => setFormData((current) => ({ ...current, backupPolicy: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-replication">Replication</Label>
              <Input id="db-replication" value={formData.replication} onChange={(event) => setFormData((current) => ({ ...current, replication: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db-maintenance">Maintenance Window</Label>
              <Input id="db-maintenance" value={formData.maintenanceWindow} onChange={(event) => setFormData((current) => ({ ...current, maintenanceWindow: event.target.value }))} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="db-note">Note</Label>
              <Input id="db-note" value={formData.note} onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Database Accounts</h3>
                <p className="text-[11px] text-muted-foreground">Set username, password, role, and privileges for each account.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAccounts((current) => [...current, { ...EMPTY_ACCOUNT }])}>
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>

            <div className="space-y-3">
              {accounts.map((account, index) => (
                <div key={`account-${index}`} className="rounded-xl border border-border bg-background p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-medium text-foreground">Account {index + 1}</div>
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Username</Label>
                      <Input value={account.username} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, username: event.target.value } : item))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input type="password" value={account.password} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, password: event.target.value } : item))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <Input value={account.role} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item))} placeholder="DBA, Application, Reporting" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Privileges</Label>
                      <Input value={account.privileges} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, privileges: event.target.value } : item))} placeholder="SELECT, INSERT, UPDATE" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Note</Label>
                      <Input value={account.note} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : databaseToEdit ? 'Save changes' : 'Create database'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
