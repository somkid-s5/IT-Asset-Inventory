'use client';

import { useEffect, useState, useMemo } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, PlugZap, CheckCircle2, Clock3, 
  LoaderCircle, Pencil, Plus, RefreshCw, Server, 
  Trash2, Search, ChevronLeft, ChevronRight, ArrowLeft, Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { VmVCenterSource } from '@/lib/vm-inventory';
import { createVmSource, deleteVmSource, getVmSources, syncAllVmSources, syncVmSource, testVmSourceConnection, updateVmSource } from '@/services/vm';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  flexRender, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, getFilteredRowModel, useReactTable,
  ColumnDef, SortingState
} from '@tanstack/react-table';

const DEFAULT_SOURCE_FORM = {
  name: '', endpoint: '', username: '', password: '', syncInterval: '15 min', notes: '',
};
const SYNC_INTERVAL_OPTIONS = ['5 min', '15 min', '30 min', '1 hour', '6 hours'];

export default function VmSourcesPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();

  const { data: sources = [], isLoading, refetch } = useQuery({
    queryKey: ['vm-sources'],
    queryFn: async () => {
      return await getVmSources();
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VmVCenterSource | null>(null);
  const [formData, setFormData] = useState(DEFAULT_SOURCE_FORM);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingSourceIds, setSyncingSourceIds] = useState<string[]>([]);
  const [lastSuccessfulTestKey, setLastSuccessfulTestKey] = useState<string | null>(null);

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const syncMeta = `Synced ${sources[0]?.lastSyncAt ?? '--'} from ${sources.length} sources`;
  const getConnectionTestKey = (data: typeof DEFAULT_SOURCE_FORM) => JSON.stringify({ endpoint: data.endpoint.trim(), username: data.username.trim(), password: data.password });
  const currentConnectionTestKey = getConnectionTestKey(formData);
  const isConnectionVerified = lastSuccessfulTestKey === currentConnectionTestKey;

  useEffect(() => {
    setHeader({
      title: 'vCenter Sources',
      breadcrumbs: [{ label: 'Workspace', href: '/dashboard' }, { label: 'Compute' }, { label: 'vCenter Sources' }],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const resetForm = () => { setFormData(DEFAULT_SOURCE_FORM); setEditingSourceId(null); setLastSuccessfulTestKey(null); };
  const openAddDialog = () => { resetForm(); setAddOpen(true); };
  const openEditDialog = (source: VmVCenterSource) => {
    setEditingSourceId(source.id);
    setFormData({ name: source.name, endpoint: source.endpoint, username: '', password: '', syncInterval: source.syncInterval, notes: source.notes ?? '' });
    setLastSuccessfulTestKey(null);
    setAddOpen(true);
  };

  const handleSave = async () => {
    if (lastSuccessfulTestKey !== getConnectionTestKey(formData)) return toast.error('Please test connection before saving');
    setSaving(true);
    try {
      if (editingSourceId) { await updateVmSource(editingSourceId, formData); toast.success('vCenter source updated'); } 
      else { await createVmSource(formData); toast.success('vCenter source created'); }
      setAddOpen(false); resetForm(); void refetch();
    } catch { toast.error('Failed to save source'); } finally { setSaving(false); }
  };

  const handleTestConnection = async () => {
    if (!formData.endpoint.trim()) return toast.error('Endpoint is required for testing');
    setTestingConnection(true);
    try {
      const result = await testVmSourceConnection({ endpoint: formData.endpoint, username: formData.username, password: formData.password });
      if (result.success) { setLastSuccessfulTestKey(getConnectionTestKey(formData)); toast.success(result.message); } 
      else { setLastSuccessfulTestKey(null); toast.error(result.message); }
    } catch { setLastSuccessfulTestKey(null); toast.error('Connection test failed'); } finally { setTestingConnection(false); }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const result = await syncAllVmSources();
      result.success ? toast.success(result.message) : toast.error(result.message);
      void refetch();
    } catch { toast.error('Sync failed'); } finally { setSyncingAll(false); }
  };

  const handleSyncSource = async (source: VmVCenterSource) => {
    setSyncingSourceIds(c => [...c, source.id]);
    try {
      const result = await syncVmSource(source.id);
      result.success ? toast.success(result.message) : toast.error(result.message);
      void refetch();
    } catch { toast.error(`Sync failed for ${source.name}`); } finally { setSyncingSourceIds(c => c.filter(id => id !== source.id)); }
  };

  const handleDeleteSource = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVmSource(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null); void refetch();
    } catch { toast.error('Failed to delete source'); }
  };

  const columns = useMemo<ColumnDef<VmVCenterSource>[]>(() => [
    {
      accessorKey: 'name',
      header: "vCenter Source Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground">
            <Server className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'endpoint', header: "Endpoint", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    { accessorKey: 'vmCount', header: "VM Count", cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as number}</span> },
    { accessorKey: 'syncInterval', header: "Sync Interval", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">Every {getValue() as string}</span> },
    {
      accessorKey: 'status',
      header: "Status",
      cell: ({ row }) => {
        const s = row.original;
        const isSyncing = syncingAll || syncingSourceIds.includes(s.id);
        const bg = isSyncing ? 'bg-sky-500/10 border-sky-500/25 text-sky-500' : s.status === 'Healthy' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500' : 'bg-amber-500/10 border-amber-500/25 text-amber-500';
        return <Badge variant="outline" className={cn("uppercase", bg)}>{isSyncing ? 'Syncing...' : s.status}</Badge>;
      }
    },
    { accessorKey: 'lastSyncAt', header: "Last Sync", cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span> },
    {
      id: 'actions',
      cell: ({ row }) => {
        const source = row.original;
        const isSyncing = syncingAll || syncingSourceIds.includes(source.id);
        return (
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={isSyncing} onClick={() => void handleSyncSource(source)}>
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin text-primary")} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={isSyncing} onClick={() => openEditDialog(source)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isSyncing} onClick={() => setDeleteTarget(source)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ], [syncingAll, syncingSourceIds]);

  const table = useReactTable({
    data: sources, columns, state: { sorting, globalFilter },
    onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Workflow className="h-3.5 w-3.5" />
            Infrastructure Integration Sources
          </h2>
          <p className="text-xs text-muted-foreground/60">Configure and monitor vCenter API connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={() => router.push('/dashboard/virtual-machines')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to VMs
          </Button>
          <Button variant="outline" size="sm" className="h-9 shadow-sm bg-card" onClick={openAddDialog} disabled={syncingAll || isLoading}>
            <Plus className="h-4 w-4 mr-2" />Add vCenter
          </Button>
          <Button size="sm" className="h-9 shadow-lg shadow-primary/20" onClick={handleSyncAll} disabled={syncingAll || isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', syncingAll && 'animate-spin')} />
            {syncingAll ? 'Syncing...' : 'Sync All Sources'}
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 py-1.5 px-3 rounded-lg border border-border/50">
             <Clock3 className="h-3.5 w-3.5" />
             {syncMeta}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search sources..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 pl-9 w-64 bg-card border-border/50 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-4">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin mx-auto mb-2" />Loading...</TableCell></TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} className="group border-border/40 hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No sources found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-card p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="border-b border-border/70 px-6 py-5 bg-muted/20">
            <DialogTitle>{editingSourceId ? 'Edit vCenter Source' : 'Add vCenter Source'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label required>Source Name</Label><Input value={formData.name} onChange={(e) => setFormData(c => ({...c, name: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label required>Endpoint</Label><Input value={formData.endpoint} onChange={(e) => setFormData(c => ({...c, endpoint: e.target.value}))} /></div>
              <div className="space-y-1.5">
                <Label optional>Sync Interval</Label>
                <Select value={formData.syncInterval} onValueChange={(val) => setFormData(c => ({...c, syncInterval: val}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SYNC_INTERVAL_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label required>Username</Label><Input value={formData.username} onChange={(e) => setFormData(c => ({...c, username: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label required>Password</Label><Input type="password" value={formData.password} onChange={(e) => setFormData(c => ({...c, password: e.target.value}))} /></div>
              
              <div className="md:col-span-2">
                <div className={cn('rounded-xl border px-4 py-3 text-sm', isConnectionVerified ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-amber-500/30 bg-amber-500/5 text-amber-500')}>
                  <div className="flex items-center gap-2 font-medium">
                    {isConnectionVerified ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {isConnectionVerified ? 'Connection Verified' : 'Connection Test Required'}
                  </div>
                  <p className="mt-1 text-xs opacity-80">{isConnectionVerified ? 'Ready to save' : 'Please test the connection with current credentials before saving'}</p>
                </div>
              </div>
              
              <div className="md:col-span-2 space-y-1.5">
                <Label optional>Notes</Label>
                <textarea value={formData.notes} onChange={(e) => setFormData(c => ({...c, notes: e.target.value}))} className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50" />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="secondary" onClick={handleTestConnection} disabled={saving || testingConnection}>
                {testingConnection ? <LoaderCircle className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}Test
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setAddOpen(false); resetForm(); }} disabled={saving || testingConnection}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || testingConnection || !isConnectionVerified}>
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}Save
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader><DialogTitle className="text-destructive">Delete Source</DialogTitle></DialogHeader>
          <div className="py-4"><p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="font-bold text-foreground">{deleteTarget?.name}</span>?</p></div>
          <div className="flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
             <Button variant="destructive" onClick={handleDeleteSource}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
