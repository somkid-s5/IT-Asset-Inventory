'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Box, ChevronsUpDown, Code2, Database, FlaskConical, LoaderCircle, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatabaseFormDialog } from '@/components/LazyLoadedDialogs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type DatabaseEnvironment, type DatabaseInventoryDetail, type DatabaseInventoryItem } from '@/lib/database-inventory';
import api from '@/services/api';
import { toast } from 'sonner';

type SortKey = 'name' | 'engine' | 'version' | 'environment' | 'host' | 'ipAddress';
type SortDirection = 'asc' | 'desc';

const ENVIRONMENT_TABS: Array<{
  label: string;
  value: 'ALL' | DatabaseEnvironment;
  icon: typeof Box;
  iconClassName: string;
}> = [
  { label: 'All', value: 'ALL', icon: Box, iconClassName: 'text-primary' },
  { label: 'Production', value: 'PROD', icon: ShieldCheck, iconClassName: 'text-emerald-400' },
  { label: 'Test', value: 'TEST', icon: FlaskConical, iconClassName: 'text-amber-400' },
  { label: 'Dev', value: 'DEV', icon: Code2, iconClassName: 'text-sky-400' },
];

export default function DbPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [databases, setDatabases] = useState<DatabaseInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEnvironment, setActiveEnvironment] = useState<'ALL' | DatabaseEnvironment>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [databaseToEdit, setDatabaseToEdit] = useState<DatabaseInventoryDetail | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DatabaseInventoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadDatabases() {
    try {
      const response = await api.get<DatabaseInventoryItem[]>('/databases');
      setDatabases(response.data);
    } catch {
      toast.error('Failed to load databases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDatabases();
  }, []);

  useEffect(() => {
    setHeader({
      title: 'Databases',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Databases' },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader]);

  const filteredDatabases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return databases.filter((database) => {
      const matchesEnvironment = activeEnvironment === 'ALL' || database.environment === activeEnvironment;
      const matchesSearch =
        query.length === 0 ||
        database.name.toLowerCase().includes(query) ||
        database.engine.toLowerCase().includes(query) ||
        database.host.toLowerCase().includes(query) ||
        database.ipAddress.toLowerCase().includes(query);

      return matchesEnvironment && matchesSearch;
    }).sort((left, right) => {
      const leftValue = String(left[sortKey] ?? '').toLowerCase();
      const rightValue = String(right[sortKey] ?? '').toLowerCase();

      if (leftValue < rightValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      return 0;
    });
  }, [activeEnvironment, databases, searchTerm, sortDirection, sortKey]);

  const countsByEnvironment = useMemo<Record<'ALL' | DatabaseEnvironment, number>>(
    () => ({
      ALL: databases.length,
      PROD: databases.filter((database) => database.environment === 'PROD').length,
      TEST: databases.filter((database) => database.environment === 'TEST').length,
      DEV: databases.filter((database) => database.environment === 'DEV').length,
    }),
    [databases],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const handleEdit = async (databaseId: string) => {
    setLoadingEditId(databaseId);
    try {
      const response = await api.get<DatabaseInventoryDetail>(`/databases/${databaseId}`);
      setDatabaseToEdit(response.data);
      setDialogOpen(true);
    } catch {
      toast.error('Failed to load database details');
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    try {
      await api.delete(`/databases/${deleteTarget.id}`);
      toast.success('Database deleted');
      setDeleteTarget(null);
      await loadDatabases();
    } catch {
      toast.error('Failed to delete database');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <section className="table-shell">
        <div className="toolbar-strip">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {ENVIRONMENT_TABS.map((filter) => {
              const Icon = filter.icon;

              return (
                <button
                  key={filter.value}
                  onClick={() => setActiveEnvironment(filter.value)}
                  className={`filter-chip ${activeEnvironment === filter.value ? 'filter-chip-active' : ''}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${filter.iconClassName}`} />
                  <span>{filter.label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                    {countsByEnvironment[filter.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="toolbar-input-wrap">
              <Search className="toolbar-input-icon" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by database name, engine, host, or IP address"
                className="pl-10"
              />
            </div>

            <Button size="lg" className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Database
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-frame min-w-[900px]">
            <thead>
              <tr className="table-head-row">
                <th className="px-2 py-2.5 font-medium">
                  <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    DB Name
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-2 py-2.5 font-medium">
                  <button onClick={() => toggleSort('engine')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Engine
                    {renderSortIcon('engine')}
                  </button>
                </th>
                <th className="px-2 py-2.5 font-medium">
                  <button onClick={() => toggleSort('version')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Version
                    {renderSortIcon('version')}
                  </button>
                </th>
                <th className="px-2 py-2.5 font-medium">
                  <button onClick={() => toggleSort('environment')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Environment
                    {renderSortIcon('environment')}
                  </button>
                </th>
                <th className="px-2 py-2.5 font-medium">
                  <button onClick={() => toggleSort('host')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Host
                    {renderSortIcon('host')}
                  </button>
                </th>
                <th className="px-2 py-2.5 font-medium">
                  <button onClick={() => toggleSort('ipAddress')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    IP
                    {renderSortIcon('ipAddress')}
                  </button>
                </th>
                <th className="px-2 py-2.5 font-medium">Accounts</th>
                <th className="px-2 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin text-foreground" />
                      <span className="text-sm">Loading databases...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDatabases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No databases matched your filters.
                  </td>
                </tr>
              ) : (
                filteredDatabases.map((database) => (
                  <tr
                    key={database.id}
                    className="table-row group cursor-pointer"
                    onClick={() => router.push(`/dashboard/db/${database.id}`)}
                  >
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground">
                          <Database className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-[12px] text-foreground">{database.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-muted-foreground">{database.engine}</td>
                    <td className="px-2 py-2.5 text-[11px] text-muted-foreground">{database.version || '--'}</td>
                    <td className="px-2 py-2.5">
                      <span className={`data-label ${database.environment === 'PROD' ? 'data-label-danger' : database.environment === 'UAT' ? 'data-label-warning' : 'data-label-neutral'}`}>
                        {database.environment}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-muted-foreground">{database.host}</td>
                    <td className="px-2 py-2.5 font-mono text-[11px] text-muted-foreground">{database.ipAddress}</td>
                    <td className="px-2 py-2.5 text-[11px] text-muted-foreground">{database.accountsCount}</td>
                    <td className="px-2 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => void handleEdit(database.id)}
                          className="rounded-lg border border-border/70 bg-card px-1.5 py-1.5 text-muted-foreground opacity-100 transition-all hover:border-primary/20 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          {loadingEditId === database.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(database)}
                          disabled={deleteLoading && deleteTarget?.id === database.id}
                          className="rounded-lg border border-border/70 bg-card px-1.5 py-1.5 text-muted-foreground opacity-100 transition-all hover:border-destructive/20 hover:text-destructive disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          {deleteLoading && deleteTarget?.id === database.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DatabaseFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDatabaseToEdit(null);
          }
        }}
        databaseToEdit={databaseToEdit}
        onSuccess={loadDatabases}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-card p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4">
            <DialogTitle className="text-base">Delete database</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span> and all linked accounts?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleteLoading}>
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
