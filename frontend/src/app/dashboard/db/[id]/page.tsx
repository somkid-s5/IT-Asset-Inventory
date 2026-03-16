'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Copy, Database, Eye, EyeOff, HardDrive, LoaderCircle, Pencil, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { DatabaseFormDialog } from '@/components/DatabaseFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DatabaseInventoryDetail } from '@/lib/database-inventory';

export default function DatabaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [database, setDatabase] = useState<DatabaseInventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadDatabase(id: string) {
    try {
      const response = await api.get<DatabaseInventoryDetail>(`/databases/${id}`);
      setDatabase(response.data);
    } catch {
      toast.error('Failed to load database details');
      router.push('/dashboard/db');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof params.id === 'string') {
      void loadDatabase(params.id);
    }
  }, [params.id, router]);

  const databaseStats = useMemo(() => {
    if (!database) {
      return { accounts: 0, linkedApps: 0 };
    }

    return {
      accounts: database.accounts.length,
      linkedApps: database.linkedApps.length,
    };
  }, [database]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-foreground" />
        <p className="text-sm">Loading database details...</p>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="space-y-4 pb-8">
        <button
          onClick={() => router.push('/dashboard/db')}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Database Inventory
        </button>
        <div className="surface-panel p-4 text-sm text-muted-foreground">Database record not found.</div>
      </div>
    );
  }

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const hostNote = database.port ? `${database.ipAddress}:${database.port}` : database.ipAddress;

  const properties = [
    { label: 'Engine', value: database.engine || '--', note: database.version || '--', icon: <Database className="h-4 w-4" /> },
    { label: 'Environment', value: database.environment || '--', note: database.status || '--', icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: 'Host', value: database.host || '--', note: hostNote || '--', icon: <Server className="h-4 w-4" /> },
    { label: 'Owner', value: database.owner || '--', note: database.serviceName || '--', icon: <HardDrive className="h-4 w-4" /> },
  ];

  const getRoleBadgeClassName = (role?: string | null) => {
    const normalizedRole = (role ?? '').toLowerCase();

    if (normalizedRole.includes('dba')) {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    if (normalizedRole.includes('report')) {
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    }

    if (normalizedRole.includes('app')) {
      return 'border-violet-500/25 bg-violet-500/10 text-violet-300';
    }

    if (normalizedRole.includes('dev')) {
      return 'border-sky-500/25 bg-sky-500/10 text-sky-300';
    }

    return 'border-border bg-muted text-foreground';
  };

  const getPrivilegeBadgeClassName = (privilege: string) => {
    const normalizedPrivilege = privilege.toLowerCase();

    if (normalizedPrivilege.includes('delete') || normalizedPrivilege.includes('all')) {
      return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
    }

    if (normalizedPrivilege.includes('insert') || normalizedPrivilege.includes('update') || normalizedPrivilege.includes('write')) {
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    }

    return 'border-sky-500/25 bg-sky-500/10 text-sky-300';
  };

  return (
    <div className="space-y-4 pb-8">
      <button
        onClick={() => router.push('/dashboard/db')}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Database Inventory
      </button>

      <section className="surface-panel p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                  <Database className="h-5 w-5" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{database.name}</h1>
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {database.environment}
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {database.status}
                    </span>
                  </div>

                  <p className="text-[12px] text-muted-foreground">{database.note}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Accounts</div>
                <div className="mt-1 text-base font-semibold text-foreground">{databaseStats.accounts}</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Linked Apps</div>
                <div className="mt-1 text-base font-semibold text-foreground">{databaseStats.linkedApps}</div>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Backup</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{database.backupPolicy}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">Database Details</h2>
          </div>

          <div className="grid gap-x-8 gap-y-3 lg:grid-cols-4">
            {properties.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5">
                <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
                <div className="space-y-0.5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold text-foreground">{item.value}</div>
                  <div className="text-[11px] text-muted-foreground">{item.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="surface-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Database Accounts</h3>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/50 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-3 py-3 font-medium">Username</th>
                    <th className="px-3 py-3 font-medium">Password</th>
                    <th className="px-3 py-3 font-medium">Role</th>
                    <th className="px-3 py-3 font-medium">Privileges</th>
                    <th className="px-3 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {database.accounts.map((account) => {
                    const revealed = Boolean(revealedPasswords[account.id]);

                    return (
                      <tr key={account.id} className="border-b border-border/80 transition-colors hover:bg-accent/40 last:border-b-0">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <span className="font-mono text-[13px] font-semibold text-foreground">{account.username}</span>
                            <button
                              type="button"
                              onClick={() => void copyValue(account.username, 'Username')}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[13px] font-semibold tracking-[0.18em] text-foreground">
                              {revealed ? account.password : '************'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setRevealedPasswords((current) => ({ ...current, [account.id]: !revealed }))}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void copyValue(account.password, 'Password')}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium ${getRoleBadgeClassName(account.role)}`}>
                            {account.role || '--'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {account.privileges.map((privilege) => (
                              <span
                                key={privilege}
                                className={`rounded-md border px-2 py-1 text-[10px] font-medium ${getPrivilegeBadgeClassName(privilege)}`}
                              >
                                {privilege}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{account.note || '--'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <DatabaseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        databaseToEdit={database}
        onSuccess={() => {
          if (typeof params.id === 'string') {
            void loadDatabase(params.id);
          }
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Delete database</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{database.name}</span> and all linked accounts?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setDeleteLoading(true);
                  try {
                    await api.delete(`/databases/${database.id}`);
                    toast.success('Database deleted');
                    router.push('/dashboard/db');
                  } catch {
                    toast.error('Failed to delete database');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
