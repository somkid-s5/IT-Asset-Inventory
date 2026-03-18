'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown, Database, LoaderCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatabaseFormDialog } from '@/components/DatabaseFormDialog';
import { ENVIRONMENT_FILTERS, type DatabaseEnvironment, type DatabaseInventoryItem } from '@/lib/database-inventory';
import api from '@/services/api';
import { toast } from 'sonner';

type SortKey = 'name' | 'engine' | 'environment' | 'host' | 'ipAddress';
type SortDirection = 'asc' | 'desc';

export default function DbPage() {
  const router = useRouter();
  const [databases, setDatabases] = useState<DatabaseInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeEnvironment, setActiveEnvironment] = useState<'ALL' | DatabaseEnvironment>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const stats = useMemo(() => {
    const totalAccounts = filteredDatabases.reduce((count, database) => count + database.accountsCount, 0);
    const productionCount = filteredDatabases.filter((database) => database.environment === 'PROD').length;
    const engineCount = new Set(filteredDatabases.map((database) => database.engine)).size;

    return {
      databases: filteredDatabases.length,
      accounts: totalAccounts,
      production: productionCount,
      engines: engineCount,
    };
  }, [filteredDatabases]);

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

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="workspace-subtle">Data Layer</p>
            <h2 className="workspace-heading mt-2">Database Inventory</h2>
            <p className="mt-2 text-sm text-muted-foreground">Compact database overview. Open a record to inspect full connection and account details.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="toolbar-input-wrap">
              <Search className="toolbar-input-icon" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search database, host, IP, or user"
                className="pl-10"
              />
            </div>

            <Button size="lg" className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Database
            </Button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-kicker">Databases</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.databases}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Database Accounts</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.accounts}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Production DB</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.production}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-kicker">Engines</div>
            <div className="mt-2 text-lg font-semibold text-foreground">{stats.engines}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {ENVIRONMENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveEnvironment(filter.value)}
              className={`filter-chip ${
                activeEnvironment === filter.value
                  ? 'filter-chip-active'
                  : ''
              }`}
            >
              {filter.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-muted-foreground">{filteredDatabases.length} shown</div>
        </div>
      </section>

      <section className="table-shell">
        <div className="overflow-x-auto">
          <table className="table-frame min-w-[860px]">
            <thead>
              <tr className="table-head-row">
                <th className="px-3 py-3 font-medium">
                  <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    DB Name
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">
                  <button onClick={() => toggleSort('engine')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Engine
                    {renderSortIcon('engine')}
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">
                  <button onClick={() => toggleSort('environment')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Environment
                    {renderSortIcon('environment')}
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">
                  <button onClick={() => toggleSort('host')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    Host
                    {renderSortIcon('host')}
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">
                  <button onClick={() => toggleSort('ipAddress')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    IP
                    {renderSortIcon('ipAddress')}
                  </button>
                </th>
                <th className="px-3 py-3 font-medium">Accounts</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin text-foreground" />
                      <span className="text-sm">Loading databases...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDatabases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No databases matched your filters.
                  </td>
                </tr>
              ) : (
                filteredDatabases.map((database) => (
                  <tr
                    key={database.id}
                    className="table-row cursor-pointer"
                    onClick={() => router.push(`/dashboard/db/${database.id}`)}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground">
                          <Database className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-foreground">{database.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{database.version}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{database.engine}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground">
                        {database.environment}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{database.host}</td>
                    <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{database.ipAddress}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{database.accountsCount}</td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{database.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <DatabaseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={loadDatabases} />
    </div>
  );
}
