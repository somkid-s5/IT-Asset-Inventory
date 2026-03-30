'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
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
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';

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

const TABS: { label: string; value: 'ALL' | AssetType; icon: typeof Box; iconClassName: string }[] = [
  { label: 'All', value: 'ALL', icon: Box, iconClassName: 'text-primary' },
  { label: 'Servers', value: 'SERVER', icon: Server, iconClassName: 'text-emerald-400' },
  { label: 'Storage', value: 'STORAGE', icon: Database, iconClassName: 'text-sky-400' },
  { label: 'Switches', value: 'SWITCH', icon: Shield, iconClassName: 'text-amber-400' },
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
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | AssetType>('ALL');
  
  // Dialog functionality state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null);
  
  // Tanstack Table States
  const [sorting, setSorting] = useState<SortingState>([{ id: 'assetId', desc: false }]);
  const [expanded, setExpanded] = useState({});
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

  useEffect(() => {
    setHeader({
      title: 'Assets',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Assets' },
      ],
    });
    return () => {
      setHeader(null);
    };
  }, [setHeader]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
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
  }, [assets, deferredSearch, activeTab]);

  const topLevelAssets = useMemo(() => {
    return deferredSearch.trim().length > 0 || activeTab !== 'ALL'
      ? filteredAssets
      : filteredAssets.filter((asset) => !asset.parentId);
  }, [filteredAssets, deferredSearch, activeTab]);

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
    if (!assetPendingDelete) return;

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
          typeof (error as any).response?.data?.message === 'string'
          ? (error as any).response?.data?.message
          : 'Failed to delete asset';

      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      accessorKey: 'assetId',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          Asset ID
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
        </button>
      ),
      cell: ({ row, getValue }) => {
        const canExpand = row.getCanExpand();
        return (
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${row.depth * 0.85}rem` }}>
            {canExpand ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  row.toggleExpanded();
                }}
                className="rounded-lg p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <div className="w-4" />
            )}
            <span className="font-mono text-[11px] text-muted-foreground">{(getValue() as string) || '--'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          Asset Name
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
        </button>
      ),
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground">
            {getAssetIcon(row.original.type)}
          </div>
          <span className="truncate text-[12px] text-foreground">{(getValue() as string)}</span>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          Type
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
        </button>
      ),
      cell: ({ row, getValue }) => (
        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${typeStyles[getValue() as AssetType]}`}>
          {getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'rack',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          Rack
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
        </button>
      ),
      cell: ({ getValue }) => <span className="font-mono text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'brandModel',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          Brand / Model
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
        </button>
      ),
      cell: ({ getValue }) => <span className="text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'sn',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          SN
          {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />}
        </button>
      ),
      cell: ({ getValue }) => <span className="font-mono text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const asset = row.original;
        return (user?.role === 'ADMIN' || user?.role === 'EDITOR') ? (
          <div className="flex items-center justify-end gap-1 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => void openEditDialog(asset.id)}
              className="rounded-lg border border-border/70 bg-card p-1.5 text-muted-foreground opacity-100 transition-all hover:border-primary/20 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
            >
              {loadingEditId === asset.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setAssetPendingDelete(asset)}
              disabled={deletingId === asset.id}
              className="rounded-lg border border-border/70 bg-card p-1.5 text-muted-foreground opacity-100 transition-all hover:border-destructive/20 hover:text-destructive disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
            >
              {deletingId === asset.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : null;
      }
    }
  ], [user, loadingEditId, deletingId, openEditDialog, setAssetPendingDelete]);

  const table = useReactTable({
    data: topLevelAssets,
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getSubRows: (row) => (deferredSearch.trim().length === 0 && activeTab === 'ALL') ? row.children : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <>
      {loading ? (
        <AssetsTableSkeleton />
      ) : (
        <div className="workspace-page">
          <section className="table-shell">
            <div className="toolbar-strip">
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`filter-chip ${activeTab === tab.value ? 'filter-chip-active' : ''}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${tab.iconClassName}`} />
                      <span>{tab.label}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {countsByTab[tab.value]}
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
                    placeholder="Search by asset name, model, serial number, or IP address"
                    className="pl-10"
                  />
                </div>

                {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                  <Button onClick={openCreateDialog} size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-[600px] overflow-auto">
              <table className="table-frame min-w-[860px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="table-head-row">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className={`px-3 py-2.5 font-medium ${header.id === 'actions' ? 'text-right' : ''}`}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
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
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="table-row group cursor-pointer"
                        onClick={() => router.push(`/dashboard/assets/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2.5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && topLevelAssets.length > 0 && (
              <div className="border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground">
                Showing {table.getPrePaginationRowModel().rows.length} of {filteredAssets.length} matching assets
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
