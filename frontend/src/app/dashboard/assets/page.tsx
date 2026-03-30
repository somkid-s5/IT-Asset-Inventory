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
import { Badge } from '@/components/ui/badge';
import { AssetsTableSkeleton } from '@/components/Skeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

const typeBadgeVariants: Record<AssetType, "success" | "neutral" | "warning" | "danger" | "default"> = {
  SERVER: 'success',
  STORAGE: 'neutral',
  SWITCH: 'warning',
  SP: 'neutral',
  NETWORK: 'danger',
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
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="-ml-3 h-8 data-[state=open]:bg-accent">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Asset ID</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3.5 w-3.5" /> : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />}
        </Button>
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
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="-ml-3 h-8 data-[state=open]:bg-accent">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Asset Name</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3.5 w-3.5" /> : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />}
        </Button>
      ),
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground">
            {getAssetIcon(row.original.type)}
          </div>
          <span className="truncate text-[12px] font-medium text-foreground">{(getValue() as string)}</span>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="-ml-3 h-8 data-[state=open]:bg-accent">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Type</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3.5 w-3.5" /> : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />}
        </Button>
      ),
      cell: ({ row, getValue }) => (
        <Badge variant={typeBadgeVariants[getValue() as AssetType]} className="uppercase tracking-wider">
          {getValue() as string}
        </Badge>
      )
    },
    {
      accessorKey: 'rack',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="-ml-3 h-8 data-[state=open]:bg-accent">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Rack</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3.5 w-3.5" /> : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />}
        </Button>
      ),
      cell: ({ getValue }) => <span className="font-mono text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'brandModel',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="-ml-3 h-8 data-[state=open]:bg-accent">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">Brand / Model</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3.5 w-3.5" /> : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />}
        </Button>
      ),
      cell: ({ getValue }) => <span className="text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'sn',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()} className="-ml-3 h-8 data-[state=open]:bg-accent">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">SN</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3.5 w-3.5" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3.5 w-3.5" /> : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground/70" />}
        </Button>
      ),
      cell: ({ getValue }) => <span className="font-mono text-[12px] text-muted-foreground">{(getValue() as string) || '--'}</span>
    },
    {
      id: 'actions',
      header: () => <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-right">Actions</div>,
      cell: ({ row }) => {
        const asset = row.original;
        return (user?.role === 'ADMIN' || user?.role === 'EDITOR') ? (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              onClick={() => void openEditDialog(asset.id)}
            >
              {loadingEditId === asset.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              disabled={deletingId === asset.id}
              onClick={() => setAssetPendingDelete(asset)}
            >
              {deletingId === asset.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
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
          <section className="rounded-xl border border-border bg-card shadow-sm shadow-black/[0.03] overflow-hidden">
            <div className="border-b border-border/70 bg-card px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;
                    return (
                      <Button
                        key={tab.value}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-8 gap-1.5 px-3 text-xs font-semibold ${isActive ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent'}`}
                        onClick={() => setActiveTab(tab.value)}
                      >
                        <Icon className={`h-3.5 w-3.5 ${tab.iconClassName}`} />
                        <span>{tab.label}</span>
                        <Badge variant="neutral" className="ml-1 h-5 px-1.5 font-mono text-[10px]">
                          {countsByTab[tab.value]}
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
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>
                  {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                    <Button onClick={openCreateDialog} size="sm" className="h-8 gap-1.5 px-3">
                      <Plus className="h-3.5 w-3.5" />
                      Add Asset
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10 shadow-[0_1px_0_hsl(var(--border))]">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="h-10 px-4 py-2 align-middle border-b border-border">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Loading assets...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : topLevelAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-[200px] text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 border border-border/70">
                            <Box className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">No assets found</h3>
                          <p className="mt-1 text-xs text-muted-foreground max-w-[250px]">
                            {searchTerm ? 'Adjust your search filters.' : 'Get started by adding an asset.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="group cursor-pointer hover:bg-muted/50 transition-colors data-[state=selected]:bg-muted border-b border-border/70"
                        onClick={() => router.push(`/dashboard/assets/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="p-3 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && topLevelAssets.length > 0 && (
              <div className="bg-card px-4 py-2.5 border-t border-border/70 text-[11px] font-medium text-muted-foreground">
                Showing {table.getPrePaginationRowModel().rows.length} of {filteredAssets.length} assets
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
