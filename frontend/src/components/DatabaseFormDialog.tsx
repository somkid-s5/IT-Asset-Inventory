'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Database, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  DatabaseAccountFormValue,
  DatabaseInventoryDetail,
  DatabaseInventoryPayload,
  DatabaseLinkedAppFormValue,
} from '@/lib/database-inventory';
import { joinCommaSeparated, parseLinkedApps, serializeLinkedApps, splitCommaSeparated } from '@/lib/database-inventory';

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

const EMPTY_LINKED_APP: DatabaseLinkedAppFormValue = {
  ipAddress: '',
  description: '',
};

const DEFAULT_FORM = {
  name: '',
  environment: '',
  engine: '',
  version: '',
  host: '',
  ipAddress: '',
  port: '',
  serviceName: '',
  owner: '',
  status: '',
  note: '',
};

const COMPACT_INPUT_CLASS = 'h-9 rounded-[10px] px-3 text-sm';
const COMPACT_SELECT_TRIGGER_CLASS = 'w-full rounded-[10px] px-3 text-sm';
const DATABASE_ENGINE_OPTIONS = ['Oracle', 'PostgreSQL', 'MySQL', 'MariaDB', 'SQL Server', 'MongoDB', 'DB2'];
const DATABASE_ENVIRONMENT_OPTIONS = ['PROD', 'UAT', 'TEST', 'DEV', 'DR'];

export function DatabaseFormDialog({ open, onOpenChange, databaseToEdit, onSuccess }: DatabaseFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [accounts, setAccounts] = useState<DatabaseAccountFormValue[]>([{ ...EMPTY_ACCOUNT }]);
  const [linkedApps, setLinkedApps] = useState<DatabaseLinkedAppFormValue[]>([{ ...EMPTY_LINKED_APP }]);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!databaseToEdit) {
      setFormData(DEFAULT_FORM);
      setAccounts([{ ...EMPTY_ACCOUNT }]);
      setLinkedApps([{ ...EMPTY_LINKED_APP }]);
      return;
    }

    setFormData({
      name: databaseToEdit.name ?? '',
      environment: databaseToEdit.environment ?? '',
      engine: databaseToEdit.engine ?? '',
      version: databaseToEdit.version ?? '',
      host: databaseToEdit.host ?? '',
      ipAddress: databaseToEdit.ipAddress ?? '',
      port: databaseToEdit.port ?? '',
      serviceName: databaseToEdit.serviceName ?? '',
      owner: databaseToEdit.owner ?? '',
      status: databaseToEdit.status ?? '',
      note: databaseToEdit.note ?? '',
    });
    setLinkedApps(
      databaseToEdit.linkedApps.length > 0 ? parseLinkedApps(databaseToEdit.linkedApps) : [{ ...EMPTY_LINKED_APP }],
    );
    setAccounts(
      databaseToEdit.accounts.length > 0
        ? databaseToEdit.accounts.map((account) => ({
          username: account.username,
          password: account.password ?? '',
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
      owner: '',
      backupPolicy: '',
      replication: '',
      linkedApps: serializeLinkedApps(linkedApps),
      maintenanceWindow: '',
      status: '',
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
    } catch (error: any) {
      console.error(error);
      const errRes = error?.response?.data;
      let message = 'Failed to save database';
      if (errRes?.message) {
        message = Array.isArray(errRes.message) ? errRes.message.join(', ') : errRes.message;
      } else if (errRes?.error) {
        message = errRes.error;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-card sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {databaseToEdit ? 'Update Database Details' : 'Register New Database'}
          </DialogTitle>
          <DialogDescription>
            {databaseToEdit ? 'Modify the existing database instance settings.' : 'Enter database connection and configuration details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Core Details</h3>
              <p className="text-[11px] text-muted-foreground">Basic information to identify the database in the system</p>
            </div>

            <div className="grid gap-3 md:grid-cols-12">
              <div className="space-y-1.5 md:col-span-12">
                <Label optional>Purpose / Description</Label>
                <Input
                  id="db-note"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.note}
                  onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
                  placeholder="e.g. Asset Registry, Reporting System, Core API"
                />
              </div>
              <div className="space-y-1.5 md:col-span-5">
                <Label required>Database Name</Label>
                <Input
                  id="db-name"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label required>Engine</Label>
                <Select value={formData.engine || undefined} onValueChange={(value) => setFormData((current) => ({ ...current, engine: value }))}>
                  <SelectTrigger id="db-engine" size="sm" className={COMPACT_SELECT_TRIGGER_CLASS}>
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
                <Label optional>Version</Label>
                <Input
                  id="db-version"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.version}
                  onChange={(event) => setFormData((current) => ({ ...current, version: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label required>Environment</Label>
                <Select value={formData.environment || undefined} onValueChange={(value) => setFormData((current) => ({ ...current, environment: value }))}>
                  <SelectTrigger id="db-environment" size="sm" className={COMPACT_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATABASE_ENVIRONMENT_OPTIONS.map((environment) => (
                      <SelectItem key={environment} value={environment}>
                        {environment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-12 pt-1">
                <h3 className="text-sm font-semibold text-foreground">Connection Parameters</h3>
                <p className="text-[11px] text-muted-foreground">Parameters used for database connectivity</p>
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label required>Host</Label>
                <Input
                  id="db-host"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.host}
                  onChange={(event) => setFormData((current) => ({ ...current, host: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label optional>IP Address</Label>
                <Input
                  id="db-ip"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.ipAddress}
                  onChange={(event) => setFormData((current) => ({ ...current, ipAddress: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label optional>Port</Label>
                <Input
                  id="db-port"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.port}
                  onChange={(event) => setFormData((current) => ({ ...current, port: event.target.value }))}
                  placeholder="e.g. 1521"
                />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label optional>Service Name</Label>
                <Input
                  id="db-service-name"
                  className={COMPACT_INPUT_CLASS}
                  value={formData.serviceName}
                  onChange={(event) => setFormData((current) => ({ ...current, serviceName: event.target.value }))}
                  placeholder="e.g. ORCLPROD"
                />
              </div>

              <div className="space-y-1 md:col-span-12 pt-1">
                <h3 className="text-sm font-semibold text-foreground">Linked Applications</h3>
                <p className="text-[11px] text-muted-foreground">IP addresses of application servers connecting to this database</p>
              </div>

              <div className="space-y-3 md:col-span-12">
                <div className="flex items-center justify-between">
                  <Label>Application Connections</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinkedApps((current) => [...current, { ...EMPTY_LINKED_APP }])}>
                    <Plus className="h-3.5 w-3.5" />
                    Add IP
                  </Button>
                </div>

                <div className="space-y-2">
                  {linkedApps.map((linkedApp, index) => (
                    <div key={`linked-app-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
                      <Input
                        className={COMPACT_INPUT_CLASS}
                        value={linkedApp.ipAddress}
                        onChange={(event) =>
                          setLinkedApps((current) =>
                            current.map((item, itemIndex) => itemIndex === index ? { ...item, ipAddress: event.target.value } : item),
                          )
                        }
                        placeholder="e.g. 10.10.20.15"
                      />
                      <Input
                        className={COMPACT_INPUT_CLASS}
                        value={linkedApp.description}
                        onChange={(event) =>
                          setLinkedApps((current) =>
                            current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item),
                          )
                        }
                        placeholder="e.g. AssetOps API, Reporting System"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          setLinkedApps((current) => (current.length === 1 ? [{ ...EMPTY_LINKED_APP }] : current.filter((_, itemIndex) => itemIndex !== index)))
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
                <h3 className="text-sm font-semibold text-foreground">Database Accounts</h3>
                <p className="text-[11px] text-muted-foreground">Define username, password, and roles for each account</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAccounts((current) => [...current, { ...EMPTY_ACCOUNT }])}>
                <Plus className="h-3.5 w-3.5" />
                Add Account
              </Button>
            </div>

            <div className="space-y-3">
              {accounts.map((account, index) => (
                <div key={`account-${index}`} className="rounded-[24px] border border-border/70 bg-background/62 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-medium text-foreground">Account #{index + 1}</div>
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
                      <Label required>Username</Label>
                      <Input className={COMPACT_INPUT_CLASS} value={account.username} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, username: event.target.value } : item))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label required>Password</Label>
                      <div className="relative">
                        <Input
                          className={COMPACT_INPUT_CLASS}
                          type={showPasswords[index] ? 'text' : 'password'}
                          value={account.password}
                          onChange={(event) =>
                            setAccounts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, password: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, [index]: !prev[index] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                        >
                          {showPasswords[index] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label optional>Role</Label>
                      <Input className={COMPACT_INPUT_CLASS} value={account.role} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value } : item))} placeholder="e.g. DBA, Application, Reporting" />
                    </div>
                    <div className="space-y-1.5">
                      <Label optional>Privileges</Label>
                      <Input className={COMPACT_INPUT_CLASS} value={account.privileges} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, privileges: event.target.value } : item))} placeholder="e.g. SELECT, INSERT, UPDATE" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label optional>Notes</Label>
                      <Input className={COMPACT_INPUT_CLASS} value={account.note} onChange={(event) => setAccounts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item))} />
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
              {loading ? 'Saving...' : databaseToEdit ? 'Save Changes' : 'Create Database'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
