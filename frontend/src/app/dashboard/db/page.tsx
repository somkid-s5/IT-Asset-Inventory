'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Box, ChevronsUpDown, Code2, Database, FlaskConical, LoaderCircle, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      return <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />;
    }

    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : <ArrowDown className="ml-2 h-3.5 w-3.5" />;
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
      <Card className="rounded-xl border border-border bg-card shadow-sm shadow-black/[0.03] overflow-hidden">
        <div className="border-b border-border/70 bg-card px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {ENVIRONMENT_TABS.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeEnvironment === filter.value;

                return (
                  <Button
                    key={filter.value}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-8 gap-1.5 px-3 text-xs font-semibold ${isActive ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
                    onClick={() => setActiveEnvironment(filter.value)}
                  >
                    <Icon className={`h-3.5 w-3.5 ${filter.iconClassName}`} />
                    <span>{filter.label}</span>
                    <Badge variant="neutral" className="ml-1 h-5 px-1.5 font-mono text-[10px]">
                      {countsByEnvironment[filter.value]}
                    </Badge>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  type="text"
                  className="h-8 w-[240px] pl-9 text-xs transition-shadow focus-visible:ring-1 sm:w-[320px]"
                  placeholder="Search by database name, engine, host, or IP..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <Button size="sm" className="h-8 gap-1.5 px-3" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Database
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted sticky top-0 z-10 shadow-[0_1px_0_hsl(var(--border))]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border">
                  <Button variant="ghost" onClick={() => toggleSort('name')} className="-ml-3 h-8 data-[state=open]:bg-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
                    DB Name
                    {renderSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border">
                  <Button variant="ghost" onClick={() => toggleSort('engine')} className="-ml-3 h-8 data-[state=open]:bg-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
                    Engine
                    {renderSortIcon('engine')}
                  </Button>
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border">
                  <Button variant="ghost" onClick={() => toggleSort('version')} className="-ml-3 h-8 data-[state=open]:bg-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
                    Version
                    {renderSortIcon('version')}
                  </Button>
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border">
                  <Button variant="ghost" onClick={() => toggleSort('environment')} className="-ml-3 h-8 data-[state=open]:bg-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
                    Environment
                    {renderSortIcon('environment')}
                  </Button>
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border">
                  <Button variant="ghost" onClick={() => toggleSort('host')} className="-ml-3 h-8 data-[state=open]:bg-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
                    Host
                    {renderSortIcon('host')}
                  </Button>
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border">
                  <Button variant="ghost" onClick={() => toggleSort('ipAddress')} className="-ml-3 h-8 data-[state=open]:bg-accent text-[11px] font-semibold uppercase tracking-[0.06em]">
                    IP
                    {renderSortIcon('ipAddress')}
                  </Button>
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border text-[11px] font-semibold uppercase tracking-[0.06em]">
                  Accounts
                </TableHead>
                <TableHead className="h-10 px-4 py-2 align-middle border-b border-border text-[11px] font-semibold uppercase tracking-[0.06em] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin text-foreground" />
                      <span className="text-sm">Loading databases...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDatabases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[200px] text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/70">
                        <Database className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">No databases found</h3>
                      <p className="mt-1 text-xs text-muted-foreground max-w-[250px]">
                        {searchTerm ? 'Adjust your search filters.' : 'There are no databases in this environment.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDatabases.map((database) => (
                  <TableRow
                    key={database.id}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/70"
                    onClick={() => router.push(`/dashboard/db/${database.id}`)}
                  >
                    <TableCell className="p-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground">
                          <Database className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate text-[12px] font-medium text-foreground">{database.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="p-3 align-middle text-[11px] text-muted-foreground">{database.engine}</TableCell>
                    <TableCell className="p-3 align-middle text-[11px] text-muted-foreground">{database.version || '--'}</TableCell>
                    <TableCell className="p-3 align-middle">
                      <Badge variant={database.environment === 'PROD' ? 'danger' : database.environment === 'UAT' ? 'warning' : 'neutral'} className="uppercase tracking-wider">
                        {database.environment}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3 align-middle text-[11px] text-muted-foreground font-mono">{database.host}</TableCell>
                    <TableCell className="p-3 align-middle font-mono text-[11px] text-muted-foreground">{database.ipAddress}</TableCell>
                    <TableCell className="p-3 align-middle text-[11px] text-muted-foreground pl-6">{database.accountsCount}</TableCell>
                    <TableCell className="p-3 align-middle text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={() => void handleEdit(database.id)}
                        >
                          {loadingEditId === database.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          disabled={deleteLoading && deleteTarget?.id === database.id}
                          onClick={() => setDeleteTarget(database)}
                        >
                          {deleteLoading && deleteTarget?.id === database.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && filteredDatabases.length > 0 && (
          <div className="bg-card px-4 py-2.5 border-t border-border/70 text-[11px] font-medium text-muted-foreground">
            Showing {filteredDatabases.length} databases
          </div>
        )}
      </Card>

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
