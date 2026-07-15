'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import api from '@/services/api';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronsUpDown,
  Database, FolderTree, HardDrive, LoaderCircle,
  Pencil, Plus, Search, Server, Shield, Trash2,
  Box, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon,
  MoreHorizontal, Columns, AlertTriangle, Download, ArrowUp, ArrowDown, Bookmark
} from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { AssetFormDialog } from '@/components/LazyLoadedDialogs';
import { EmptyState } from '@/components/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';


import { DataTableSkeleton } from '@/components/Skeletons';
import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fadeInUp } from '@/lib/animations';

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
  location?: string | null;
  status?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  children?: Asset[];
  credentials?: { username: string; type: string }[];
  customMetadata?: Record<string, string>;
}

const TABS: { label: string; value: 'ALL' | AssetType; icon: typeof Box; iconClassName: string }[] = [
  { label: 'All', value: 'ALL', icon: Box, iconClassName: 'text-primary' },
  { label: 'Servers', value: 'SERVER', icon: Server, iconClassName: 'text-success' },
  { label: 'Storage', value: 'STORAGE', icon: Database, iconClassName: 'text-sky-500' },
  { label: 'Switches', value: 'SWITCH', icon: Shield, iconClassName: 'text-warning' },
];

function getAssetIcon(type: AssetType) {
  const className = 'h-4 w-4';
  switch (type) {
    case 'STORAGE': return <Database className={className} />;
    case 'SWITCH': return <Shield className={className} />;
    case 'SP': return <HardDrive className={className} />;
    case 'NETWORK': return <FolderTree className={className} />;
    default: return <Server className={className} />;
  }
}

export default function AssetsPage() {
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') as AssetType | null;
  const [activeTab, setActiveTab] = useState<'ALL' | AssetType>(initialType && ['SERVER', 'STORAGE', 'SWITCH', 'SP', 'NETWORK'].includes(initialType) ? initialType : 'ALL');
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');

  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['assets', activeTab, searchTerm],
    queryFn: async () => {
      const response = await api.get<any>('/assets', { params: { q: searchTerm || undefined, type: activeTab === 'ALL' ? undefined : activeTab, limit: 200 } });
      return (Array.isArray(response.data) ? response.data : (response.data.data || [])) as Asset[];
    },
  });

  // Dialog functionality state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');

  // Tanstack Table States
  const [sorting, setSorting] = useState<SortingState>([{ id: 'assetId', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (activeTab !== 'ALL') params.set('type', activeTab);
    router.replace(params.size ? `/dashboard/assets?${params.toString()}` : '/dashboard/assets', { scroll: false });
  }, [activeTab, router, searchTerm]);

  const selectImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const [headerLine, ...lines] = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map((value) => value.trim());
    const rows = lines.map((line) => {
      const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    }).filter((row) => row.name);
    if (!rows.length) return toast.error('No valid rows found. The CSV needs name and type columns.');
    if (rows.length > 200) return toast.error('Import is limited to 200 rows at a time.');
    setImportRows(rows);
    setImportOpen(true);
    event.target.value = '';
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      const response = await api.post('/assets/bulk-import', { rows: importRows });
      if (response.data.errors?.length) {
        toast.error(response.data.errors.map((error: { message: string }) => error.message).join(' · '));
        return;
      }
      toast.success(`Imported ${response.data.created} asset records`);
      setImportOpen(false);
      setImportRows([]);
      void refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Import failed. Check the CSV values and try again.');
    } finally {
      setImporting(false);
    }
  };

  const saveCurrentView = () => {
    localStorage.setItem('asset-saved-view', JSON.stringify({ q: searchTerm, type: activeTab }));
    toast.success('Saved this Asset view on this device');
  };
  const loadSavedView = () => {
    const saved = localStorage.getItem('asset-saved-view');
    if (!saved) return toast.error('No saved Asset view yet');
    const view = JSON.parse(saved) as { q?: string; type?: AssetType };
    setSearchTerm(view.q ?? '');
    setActiveTab(view.type ?? 'ALL');
  };
  const applyBulkUpdate = async () => {
    const ids = table.getSelectedRowModel().rows.map((row) => row.original.id);
    if (!ids.length) return;
    if (!bulkStatus && !bulkOwner) return toast.error('Choose a status or enter an owner first');
    try {
      const response = await api.patch('/assets/bulk-update', { ids, status: bulkStatus || undefined, owner: bulkOwner || undefined });
      toast.success(`Updated ${response.data.updated} asset records`);
      setRowSelection({}); setBulkStatus(''); setBulkOwner(''); void refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Bulk update failed');
    }
  };

  useEffect(() => {
    setHeader({
      title: 'Assets',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Assets' },
      ],
    });
  }, [setHeader]);

  const filteredData = useMemo(() => {
    let result = assets;
    if (activeTab !== 'ALL') {
      result = assets.filter(a => a.type === activeTab);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => {
        const matchesName = a.name?.toLowerCase().includes(term);
        const matchesAssetId = a.assetId?.toLowerCase().includes(term);
        const matchesSn = a.sn?.toLowerCase().includes(term);
        const matchesType = a.type?.toLowerCase().includes(term);
        const matchesLocation = a.location?.toLowerCase().includes(term);
        const matchesRack = a.rack?.toLowerCase().includes(term);
        const matchesStatus = a.status?.toLowerCase().includes(term);
        const matchesBrandModel = a.brandModel?.toLowerCase().includes(term);
        const matchesIp = a.ipAllocations?.some(ip => ip.address?.toLowerCase().includes(term));

        return (
          matchesName ||
          matchesAssetId ||
          matchesSn ||
          matchesType ||
          matchesLocation ||
          matchesRack ||
          matchesStatus ||
          matchesBrandModel ||
          matchesIp
        );
      });
    }

    return result;
  }, [assets, activeTab, searchTerm]);

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'assetId',
      header: ({ column }) => <SortableHeader column={column} title="Asset ID" />,
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2" style={{ paddingLeft: `${row.depth * 1}rem` }}>
          {row.getCanExpand() ? (
            <button
              onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-transform"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", row.getIsExpanded() && "rotate-90")} />
            </button>
          ) : <div className="w-5" />}
          <span className="font-mono text-[11px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tabular-nums">
            {(getValue() as string) || '--'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="Asset Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground">
            {getAssetIcon(row.original.type)}
          </div>
          <span data-testid="asset-name" className="truncate font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: "Type",
      cell: ({ getValue }) => {
        const type = getValue() as AssetType;
        const labels: Record<AssetType, string> = { SERVER: 'Server', STORAGE: 'Storage', SWITCH: 'Switch', SP: 'SP', NETWORK: 'Network' };
        return <Badge variant="outline" className="font-medium bg-muted/20 text-[11px] px-1.5 py-0">{labels[type]}</Badge>;
      }
    },
    {
      accessorKey: 'environment',
      header: "Env",
      cell: ({ getValue }) => {
        const env = getValue() as string;
        if (!env) return <span className="text-xs text-muted-foreground opacity-50">--</span>;
        const variants: Record<string, string> = { PROD: 'bg-critical/10 text-critical border-critical/20', UAT: 'bg-warning/10 text-warning border-warning/20', DEV: 'bg-low/10 text-low border-low/20' };
        return <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0", variants[env] || "bg-low/10 text-low border-low/20")}>{env}</Badge>;
      }
    },
    {
      accessorKey: 'rack',
      header: "Rack",
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70 tabular-nums">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'sn',
      header: "Serial Number",
      cell: ({ getValue }) => <span className="font-mono text-[11px] opacity-70 tabular-nums">{(getValue() as string) || '--'}</span>
    },
    {
      accessorKey: 'status',
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue() as string;
        if (!status) return <span className="text-xs text-muted-foreground opacity-50">--</span>;

        const config: Record<string, { label: string; className: string }> = {
          ACTIVE: { label: 'Under MA', className: 'bg-success/10 text-success border-success/20' },
          INACTIVE: { label: 'MA Expired', className: 'bg-critical/10 text-critical border-critical/20' },
          MAINTENANCE: { label: 'Maintenance', className: 'bg-warning/10 text-warning border-warning/20' },
          DECOMMISSIONED: { label: 'Decommissioned', className: 'bg-low/10 text-low border-low/20' }
        };

        const item = config[status] || { label: status, className: 'bg-low/10 text-low border-low/20' };

        return (
          <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5 py-0", item.className)}>
            {item.label}
          </Badge>
        );
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original;
        return (user?.role === 'ADMIN' || user?.role === 'EDITOR') ? (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => openEditDialog(asset.id)}
              aria-label="Edit Asset"
            >
              {loadingEditId === asset.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Asset Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/dashboard/assets/${asset.id}`)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
                  onClick={() => setAssetPendingDelete(asset)}
                >
                  Delete Asset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null;
      }
    }
  ], [user, loadingEditId, router, setAssetPendingDelete]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.children,
  });

  const openEditDialog = async (id: string) => {
    setLoadingEditId(id);
    try {
      const res = await api.get(`/assets/${id}`);
      setEditingAsset(res.data);
      setDialogOpen(true);
    } finally {
      setLoadingEditId(null);
    }
  };

  const confirmDeleteAsset = async () => {
    if (!assetPendingDelete) return;
    setDeletingId(assetPendingDelete.id);
    try {
      await api.delete(`/assets/${assetPendingDelete.id}`);
      toast.success('Asset deleted successfully');
      setAssetPendingDelete(null);
      void refetch();
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const exportData = filteredData.map(asset => {
      const ips = asset.ipAllocations?.map(ip => ip.address).join('; ') || '';
      const credentials = asset.credentials?.map(c => c.username).join('; ') || '';
      const customMetadata = asset.customMetadata
        ? Object.entries(asset.customMetadata).map(([k, v]) => `${k}:${v}`).join('; ')
        : '';

      return {
        AssetID: asset.assetId || '',
        Name: asset.name,
        Type: asset.type,
        Location: asset.location || '',
        Rack: asset.rack || '',
        BrandModel: asset.brandModel || '',
        SerialNumber: asset.sn || '',
        Status: asset.status || '',
        IPs: ips,
        Credentials: credentials,
        CustomMetadata: customMetadata,
      };
    });

    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(exportData[0]).join(',');
    const csvRows = exportData.map(row =>
      Object.values(row).map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const BOM = "\uFEFF";
    const csvString = BOM + [headers, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    const fileName = `Assets_Export_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`;

    link.href = url;
    link.setAttribute('download', fileName);
    link.download = fileName; // Set both attribute and property

    document.body.appendChild(link);

    // Use a more standard event dispatching
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    link.dispatchEvent(event);

    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 200);

    toast.success('Exported all items in current view');
  };

  if (isLoading && assets.length === 0) return <DataTableSkeleton />;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2 text-balance">
            <HardDrive className="h-3.5 w-3.5" />
            Hardware & Infrastructure Inventory
          </h2>
          <p className="text-xs text-muted-foreground text-pretty">Manage your physical and network assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9" onClick={loadSavedView}><Bookmark className="mr-2 h-4 w-4" />Load view</Button>
          <Button variant="ghost" size="sm" className="h-9" onClick={saveCurrentView}><Bookmark className="mr-2 h-4 w-4" />Save view</Button>
          <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
            <>
            <input data-testid="file-import-input" ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void selectImportFile(event)} />
            <Button variant="outline" size="sm" className="h-9" onClick={() => fileInputRef.current?.click()}>
              <Download className="mr-2 h-4 w-4 rotate-180" />Import CSV
            </Button>
            <Button onClick={() => { setEditingAsset(undefined); setDialogOpen(true); }} className="h-9 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
            </>
          )}
        </div>
      </div>

      <div>
        {table.getSelectedRowModel().rows.length > 0 && (
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium">{table.getSelectedRowModel().rows.length} selected</span>
            <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Keep status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="MAINTENANCE">Maintenance</option><option value="DECOMMISSIONED">Decommissioned</option></select>
            <Input value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)} className="h-9 sm:max-w-52" placeholder="Set owner (optional)" />
            <Button size="sm" onClick={() => void applyBulkUpdate()}>Apply changes</Button>
          </div>
        )}
        <Card className="border-2 border-border gap-0 shadow-md bg-card overflow-hidden p-0 rounded-[24px]">
        <div className="p-4 border-b-2 border-border bg-muted/80 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                  activeTab === tab.value
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.value ? tab.iconClassName : "text-muted-foreground")} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 w-64 bg-card border-border/50 focus-visible:ring-primary/20"
              />
            </div>

            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 bg-card" aria-label="Toggle Columns">
                  <Columns className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllColumns().filter(c => c.getCanHide()).map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize cursor-pointer"
                    checked={column.getIsVisible()}
                    onCheckedChange={(val) => column.toggleVisibility(!!val)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {column.id === 'assetId' ? 'Asset ID' : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2 px-3 border-b-2 border-border">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    className="group border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/assets/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-1.5 px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-96 p-0 border-none bg-transparent">
                    <div className="flex items-center justify-center h-full">
                      <EmptyState
                        icon={HardDrive}
                        title="No assets found"
                        description={assets.length === 0
                          ? "You haven't added any infrastructure assets yet. Start by adding your first server or switch."
                          : "No assets match your current search or filter criteria."
                        }
                        action={assets.length === 0 ? {
                          label: "Add Your First Asset",
                          onClick: () => { setEditingAsset(undefined); setDialogOpen(true); }
                        } : undefined}
                        className="w-full max-w-md border-none bg-transparent"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
          <div className="flex-1 text-xs text-muted-foreground">
            Total {table.getFilteredRowModel().rows.length} items
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">Rows per page</p>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                className="h-8 w-16 rounded-md border border-border bg-card text-xs focus:ring-1 focus:ring-primary outline-none"
              >
                {[10, 20, 30, 40, 50].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-xs font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* Asset Form Dialog */}
      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assetToEdit={editingAsset}
        onSuccess={() => void refetch()}
        availableParents={assets.map(a => ({ id: a.id, name: a.name, type: a.type }))}
      />

      <Dialog open={importOpen} onOpenChange={(open) => !importing && setImportOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Review asset import</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{importRows.length} records will be created. Required columns: <code>name</code>, <code>type</code>. Optional: assetId, status, environment, owner, department, location, rack, brandModel, sn.</p>
          <div className="max-h-64 overflow-auto rounded-md border text-xs"><table className="w-full"><thead><tr className="bg-muted text-left"><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Asset ID</th></tr></thead><tbody>{importRows.slice(0, 20).map((row, index) => <tr key={index} className="border-t"><td className="p-2">{row.name}</td><td className="p-2">{row.type}</td><td className="p-2">{row.assetId || '—'}</td></tr>)}</tbody></table></div>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={importing} onClick={() => setImportOpen(false)}>Cancel</Button><Button disabled={importing} onClick={() => void confirmImport()}>{importing ? 'Importing…' : `Import ${importRows.length} records`}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!assetPendingDelete} onOpenChange={(open) => !open && setAssetPendingDelete(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[24px] border-none p-0 overflow-hidden">
          <Alert variant="destructive" className="rounded-none border-none py-6">
            <AlertTitle className="text-xl">Confirm Delete</AlertTitle>
            <AlertDescription className="text-sm opacity-90">
              You are about to delete asset <span className="font-bold underline">{assetPendingDelete?.name}</span>
            </AlertDescription>
          </Alert>

          <div className="p-6 pt-2 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This action cannot be undone and all related data will be permanently removed from the infrastructure database.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setAssetPendingDelete(null)} className="rounded-xl">Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteAsset} disabled={!!deletingId} className="rounded-xl shadow-lg shadow-destructive/20">
                {deletingId ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SortableHeader<TData, TValue>({ column, title }: { column: import('@tanstack/react-table').Column<TData, TValue>, title: string }) {
  return (
    <button
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="flex items-center gap-1 hover:text-foreground transition-colors group"
    >
      {title}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ChevronsUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
