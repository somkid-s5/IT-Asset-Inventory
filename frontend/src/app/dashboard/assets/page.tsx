'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Database, FolderTree, HardDrive, LoaderCircle, Pencil, Plus, Search, Server, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { AssetFormDialog } from '@/components/AssetFormDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type AssetType = 'SERVER' | 'STORAGE' | 'SWITCH' | 'SP' | 'NETWORK';

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
}

interface Asset {
  id: string;
  assetId?: string | null;
  name: string;
  type: AssetType;
  ipAllocations?: AssetIpAllocation[];
  rack?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  children?: Asset[];
}

type SortKey = 'assetId' | 'name' | 'type' | 'rack' | 'brandModel' | 'sn';
type SortDirection = 'asc' | 'desc';

const TABS: { label: string; value: 'ALL' | AssetType }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Servers', value: 'SERVER' },
  { label: 'Storage', value: 'STORAGE' },
  { label: 'Switches', value: 'SWITCH' },
];

const typeStyles: Record<AssetType, string> = {
  SERVER: 'bg-muted text-foreground',
  STORAGE: 'bg-muted text-foreground',
  SWITCH: 'bg-muted text-foreground',
  SP: 'bg-muted text-foreground',
  NETWORK: 'bg-muted text-foreground',
};

function getAssetIcon(type: AssetType) {
  const className = 'h-3.5 w-3.5';
  switch (type) {
    case 'STORAGE':
      return <Database className={className} />;
    case 'SWITCH':
      return <Shield className={className} />;
    case 'SP':
      return <HardDrive className={className} />;
    case 'NETWORK':
      return <FolderTree className={className} />;
    default:
      return <Server className={className} />;
  }
}

export default function AssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | AssetType>('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('assetId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const deferredSearch = useDeferredValue(searchTerm);

  async function loadAssets() {
    try {
      const response = await api.get<Asset[]>('/assets');
      setAssets(response.data);
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const query = deferredSearch.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      asset.name.toLowerCase().includes(query) ||
      asset.assetId?.toLowerCase().includes(query) ||
      asset.brandModel?.toLowerCase().includes(query) ||
      asset.sn?.toLowerCase().includes(query) ||
      asset.ipAllocations?.some((ip) => ip.address.toLowerCase().includes(query));

    return matchesSearch && (activeTab === 'ALL' || asset.type === activeTab);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, activeTab, sortKey, sortDirection, pageSize]);

  const compareAssets = (left: Asset, right: Asset) => {
    const leftValue = (left[sortKey] ?? '').toString().toLowerCase();
    const rightValue = (right[sortKey] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    return 0;
  };

  const sortAssetTree = (items: Asset[]): Asset[] =>
    [...items]
      .sort(compareAssets)
      .map((asset) => ({
        ...asset,
        children: asset.children ? sortAssetTree(asset.children) : asset.children,
      }));

  const topLevelAssets = useMemo(() => {
    const baseAssets =
      deferredSearch.trim().length > 0 || activeTab !== 'ALL'
        ? filteredAssets
        : filteredAssets.filter((asset) => !asset.parentId);

    return sortAssetTree(baseAssets);
  }, [filteredAssets, deferredSearch, activeTab, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(topLevelAssets.length / pageSize));
  const pagedAssets = topLevelAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreateDialog = () => {
    setEditingAsset(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = async (assetId: string) => {
    setLoadingEditId(assetId);
    try {
      const response = await api.get<Asset>(`/assets/${assetId}`);
      setEditingAsset(response.data);
      setDialogOpen(true);
    } catch {
      toast.error('Failed to load asset details for editing');
    } finally {
      setLoadingEditId(null);
    }
  };

  const confirmDeleteAsset = async () => {
    if (!assetPendingDelete) {
      return;
    }

    setDeletingId(assetPendingDelete.id);
    try {
      await api.delete(`/assets/${assetPendingDelete.id}`);
      toast.success('Asset deleted');
      setAssetPendingDelete(null);
      await loadAssets();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to delete asset';

      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

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

  const renderAssetRow = (asset: Asset, depth = 0): React.ReactNode => {
    const hasChildren = (asset.children?.length ?? 0) > 0 && deferredSearch.trim().length === 0 && activeTab === 'ALL';
    const expanded = expandedRows.has(asset.id);

    return (
      <React.Fragment key={asset.id}>
        <tr
          className="group cursor-pointer border-b border-border/80 transition-colors hover:bg-accent/60"
          onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
        >
          <td className="px-3 py-3">
            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 0.85}rem` }}>
              {hasChildren ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedRows((current) => {
                      const next = new Set(current);
                      next.has(asset.id) ? next.delete(asset.id) : next.add(asset.id);
                      return next;
                    });
                  }}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <div className="w-4" />
              )}
              <span className="font-mono text-[11px] text-muted-foreground">{asset.assetId || '--'}</span>
            </div>
          </td>
          <td className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                {getAssetIcon(asset.type)}
              </div>
              <span className="truncate text-[13px] font-medium text-foreground">{asset.name}</span>
            </div>
          </td>
          <td className="px-3 py-3">
            <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${typeStyles[asset.type]}`}>
              {asset.type}
            </span>
          </td>
          <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{asset.rack || '--'}</td>
          <td className="px-3 py-3 text-[12px] text-muted-foreground">{asset.brandModel || '--'}</td>
          <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{asset.sn || '--'}</td>
          <td className="px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
            {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => void openEditDialog(asset.id)}
                  className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {loadingEditId === asset.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setAssetPendingDelete(asset)}
                  disabled={deletingId === asset.id}
                  className="rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  {deletingId === asset.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </td>
        </tr>

        {hasChildren &&
          expanded &&
          asset.children
            ?.filter((child) => filteredAssets.some((filtered) => filtered.id === child.id))
            .map((child) => renderAssetRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <>
    <div className="space-y-3 pb-6">
      <section className="surface-panel p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Assets</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{assets.length} total records</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search assets"
                  className="h-8 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[12px] outline-none transition-all focus:border-foreground/20 focus:ring-2 focus:ring-foreground/5"
                />
              </div>

              {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                <button
                  onClick={openCreateDialog}
                  className="inline-flex h-8 items-center gap-2 rounded-lg bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Asset
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto text-[11px] text-muted-foreground">{topLevelAssets.length} shown</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('assetId')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Asset ID
                      {renderSortIcon('assetId')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Asset Name
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('type')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Type
                      {renderSortIcon('type')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('rack')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Rack
                      {renderSortIcon('rack')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('brandModel')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Brand / Model
                      {renderSortIcon('brandModel')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort('sn')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      SN
                      {renderSortIcon('sn')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin text-foreground" />
                        <span className="text-sm">Loading assets...</span>
                      </div>
                    </td>
                  </tr>
                ) : topLevelAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No assets matched your filters.
                    </td>
                  </tr>
                ) : (
                  pagedAssets.map((asset) => renderAssetRow(asset))
                )}
              </tbody>
            </table>
          </div>

          {!loading && topLevelAssets.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>
                  {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, topLevelAssets.length)} of {topLevelAssets.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <span>
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>

        <AssetFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          assetToEdit={editingAsset}
          onSuccess={loadAssets}
          availableParents={assets.map((asset) => ({ id: asset.id, name: asset.name, type: asset.type }))}
        />
      </div>

      <Dialog open={!!assetPendingDelete} onOpenChange={(open) => !open && setAssetPendingDelete(null)}>
        <DialogContent className="max-w-md border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Delete asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{assetPendingDelete?.name}</span> and all linked access data?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssetPendingDelete(null)} disabled={!!deletingId}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void confirmDeleteAsset()} disabled={!!deletingId}>
                {deletingId ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
