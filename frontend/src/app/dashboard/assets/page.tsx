'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, Database, FolderTree, HardDrive, LoaderCircle, Pencil, Plus, Search, Server, Shield, Trash2, Box } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { AssetFormDialog } from '@/components/LazyLoadedDialogs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssetsTableSkeleton } from '@/components/Skeletons';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';

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
  SERVER: 'data-label data-label-success',
  STORAGE: 'data-label data-label-neutral',
  SWITCH: 'data-label data-label-warning',
  SP: 'data-label data-label-neutral',
  NETWORK: 'data-label data-label-danger',
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

  const compareAssets = useCallback((left: Asset, right: Asset) => {
    const leftValue = (left[sortKey] ?? '').toString().toLowerCase();
    const rightValue = (right[sortKey] ?? '').toString().toLowerCase();

    if (leftValue < rightValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    return 0;
  }, [sortDirection, sortKey]);

  const sortAssetTree = useCallback(
    (items: Asset[]): Asset[] =>
      [...items]
        .sort(compareAssets)
        .map((asset) => ({
          ...asset,
          children: asset.children ? sortAssetTree(asset.children) : asset.children,
        })),
    [compareAssets],
  );

  const topLevelAssets = useMemo(() => {
    const baseAssets =
      deferredSearch.trim().length > 0 || activeTab !== 'ALL'
        ? filteredAssets
        : filteredAssets.filter((asset) => !asset.parentId);

    return sortAssetTree(baseAssets);
  }, [filteredAssets, deferredSearch, activeTab, sortAssetTree]);

  const countsByTab = useMemo<Record<'ALL' | AssetType, number>>(() => ({
    ALL: assets.length,
    SERVER: assets.filter((asset) => asset.type === 'SERVER').length,
    STORAGE: assets.filter((asset) => asset.type === 'STORAGE').length,
    SWITCH: assets.filter((asset) => asset.type === 'SWITCH').length,
    SP: assets.filter((asset) => asset.type === 'SP').length,
    NETWORK: assets.filter((asset) => asset.type === 'NETWORK').length,
  }), [assets]);

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
          className="table-row group cursor-pointer"
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
                      if (next.has(asset.id)) {
                        next.delete(asset.id);
                      } else {
                        next.add(asset.id);
                      }
                      return next;
                    });
                  }}
                  className="rounded-xl p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground">
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
                  className="rounded-xl border border-border/70 bg-card px-2 py-2 text-muted-foreground opacity-100 transition-all hover:border-primary/20 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                >
                  {loadingEditId === asset.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setAssetPendingDelete(asset)}
                  disabled={deletingId === asset.id}
                  className="rounded-xl border border-border/70 bg-card px-2 py-2 text-muted-foreground opacity-100 transition-all hover:border-destructive/20 hover:text-destructive disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
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
      {loading ? (
        <AssetsTableSkeleton />
      ) : (
        <div className="workspace-page">
          <section className="space-y-2">
            <AppBreadcrumbs
              items={[
                { label: 'Workspace', href: '/dashboard' },
                { label: 'Assets' },
              ]}
            />
            <div>
              <p className="workspace-subtle">Hardware Inventory</p>
              <h2 className="workspace-heading mt-1">Assets</h2>
            </div>
          </section>

          <section className="table-shell">
            <div className="toolbar-strip">
              <div>
                <h3 className="app-panel-title">Asset Register</h3>
                <p className="app-panel-copy">Structured inventory with hierarchy, rack placement, hardware model, and serial tracking.</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="toolbar-input-wrap">
                  <Search className="toolbar-input-icon" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search asset, model, serial, or IP"
                    className="pl-10"
                  />
                </div>

                {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                  <Button
                    onClick={openCreateDialog}
                    size="lg"
                  >
                    <Plus className="h-4 w-4" />
                    Add Asset
                  </Button>
                )}
              </div>
            </div>

            <div className="border-b border-border/80 px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`filter-chip ${activeTab === tab.value
                      ? 'filter-chip-active'
                      : ''
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      {countsByTab[tab.value]}
                    </span>
                  </button>
                ))}
                <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1.5 text-[10px] text-muted-foreground">
                  Visible rows
                  <span className="font-semibold text-foreground">{topLevelAssets.length}</span>
                </div>
              </div>
            </div>

            <div className="max-h-[600px] overflow-auto">
              <table className="table-frame min-w-[860px]">
                <thead>
                  <tr className="table-head-row">
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
                      <td colSpan={7} className="px-6 py-12">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-muted/50">
                            <Box className="h-8 w-8 text-muted-foreground" />
                          </div>
                          {searchTerm || activeTab !== 'ALL' ? (
                            <>
                              <h3 className="text-base font-semibold text-foreground">No assets found</h3>
                              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                No assets matched your current filters. Try adjusting your search or filter criteria.
                              </p>
                              <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                  setSearchTerm('');
                                  setActiveTab('ALL');
                                }}
                              >
                                Clear Filters
                              </Button>
                            </>
                          ) : (
                            <>
                              <h3 className="text-base font-semibold text-foreground">No assets yet</h3>
                              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                Get started by adding your first infrastructure asset to the inventory.
                              </p>
                              {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                                <Button onClick={openCreateDialog} className="mt-4">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Your First Asset
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : topLevelAssets.map((asset) => renderAssetRow(asset))}
                </tbody>
              </table>
            </div>

            {!loading && topLevelAssets.length > 0 && (
              <div className="border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground">
                Showing {topLevelAssets.length} of {filteredAssets.length} matching assets
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

          <Dialog open={!!assetPendingDelete} onOpenChange={(open) => !open && setAssetPendingDelete(null)}>
            <DialogContent className="max-w-md bg-card p-0">
              <DialogHeader className="border-b border-border/70 px-5 py-4">
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
        </div>
      )}
    </>
  );
}
