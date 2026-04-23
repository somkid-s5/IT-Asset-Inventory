'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { 
  ArrowDown, ArrowUp, ChevronsUpDown, Eye, KeyRound, 
  LoaderCircle, PencilLine, Plus, Search, Shield, 
  Trash2, Users, Columns, ChevronLeft, ChevronRight, 
  MoreHorizontal, Download 
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_POLICY_MESSAGE, isPasswordValid } from '@/lib/password-policy';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuCheckboxItem, 
  DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  flexRender,
  getCoreRowModel,
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
import { cn } from '@/lib/utils';

type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  avatarImage?: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

const roleOptions: Role[] = ['ADMIN', 'EDITOR', 'VIEWER'];
const ROLE_TABS: Array<{
  label: string;
  value: 'ALL' | Role;
  icon: typeof Users;
  iconClassName: string;
}> = [
    { label: 'All', value: 'ALL', icon: Users, iconClassName: 'text-primary' },
    { label: 'Admins', value: 'ADMIN', icon: Shield, iconClassName: 'text-emerald-500' },
    { label: 'Editors', value: 'EDITOR', icon: PencilLine, iconClassName: 'text-sky-500' },
    { label: 'Viewers', value: 'VIEWER', icon: Eye, iconClassName: 'text-amber-500' },
  ];

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export default function UsersPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<'ALL' | Role>('ALL');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // TanStack Table State
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayName', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  async function loadUsers() {
    try {
      setLoading(true);
      const response = await api.get<UserRecord[]>('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    void loadUsers();
  }, [router, user]);

  useEffect(() => {
    setHeader({
      title: 'User Management',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Users' },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const filteredData = useMemo(() => {
    if (activeRole === 'ALL') return users;
    return users.filter(u => u.role === activeRole);
  }, [users, activeRole]);

  const roleCounts = useMemo<Record<'ALL' | Role, number>>(() => ({
    ALL: users.length,
    ADMIN: users.filter((item) => item.role === 'ADMIN').length,
    EDITOR: users.filter((item) => item.role === 'EDITOR').length,
    VIEWER: users.filter((item) => item.role === 'VIEWER').length,
  }), [users]);

  const handleRoleChange = async (userId: string, nextRole: Role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: nextRole });
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)));
      toast.success('Role updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update role'));
      await loadUsers();
    }
  };

  const columns = useMemo<ColumnDef<UserRecord>[]>(() => [
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
          className="translate-y-[2px] border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'displayName',
      header: ({ column }) => <SortableHeader column={column} title="Display Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar seed={row.original.avatarSeed} imageUrl={row.original.avatarImage} label={row.original.displayName} className="h-8 w-8 rounded-lg shadow-sm" />
          <span className="font-semibold text-foreground">{row.original.displayName}</span>
        </div>
      )
    },
    {
      accessorKey: 'username',
      header: ({ column }) => <SortableHeader column={column} title="Username" />,
      cell: ({ row }) => {
        const isCurrentUser = row.original.id === user?.id;
        return (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono text-muted-foreground">@{row.original.username}</span>
            {isCurrentUser && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">You</Badge>}
          </div>
        );
      }
    },
    {
      accessorKey: 'role',
      header: "Permissions",
      cell: ({ row }) => {
        const isCurrentUser = row.original.id === user?.id;
        return (
          <Select 
            value={row.original.role} 
            onValueChange={(val) => handleRoleChange(row.original.id, val as Role)} 
            disabled={isCurrentUser}
          >
            <SelectTrigger className="h-7 w-[100px] text-[11px] bg-muted/30 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    },
    {
      accessorKey: 'createdAt',
      header: "Created At",
      cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground">{new Date(getValue() as string).toLocaleDateString('en-US')}</span>
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const u = row.original;
        const isCurrentUser = u.id === user?.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
              onClick={() => { setResetTarget(u); setResetPassword(''); setResetPasswordConfirm(''); }}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                   className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
                   onClick={() => setDeleteTarget(u)}
                   disabled={isCurrentUser}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ], [user]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) return toast.error(PASSWORD_POLICY_MESSAGE);
    
    setSubmitting(true);
    try {
      await api.post('/users', { username, displayName, password, role });
      toast.success('User created successfully');
      setUsername(''); setDisplayName(''); setPassword(''); setRole('VIEWER');
      setCreateOpen(false);
      void loadUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPassword !== resetPasswordConfirm) return toast.error('Passwords do not match');
    if (!isPasswordValid(resetPassword)) return toast.error(PASSWORD_POLICY_MESSAGE);

    setResetSubmitting(true);
    try {
      await api.patch(`/users/${resetTarget.id}/reset-password`, { password: resetPassword });
      toast.success('Password reset successfully');
      setResetPassword('');
      setResetTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reset password'));
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers(current => current.filter(item => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('User deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete user'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pt-0"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            System Access & User Directory
          </h2>
          <p className="text-xs text-muted-foreground/60">Manage staff accounts and security permissions</p>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={() => setCreateOpen(true)} className="h-9 shadow-lg shadow-primary/20">
             <Plus className="h-4 w-4 mr-2" />
             Add New User
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveRole(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
                  activeRole === tab.value 
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5", activeRole === tab.value ? tab.iconClassName : "text-muted-foreground/50")} />
                {tab.label}
                <Badge variant="neutral" className="ml-1 h-4 px-1 font-mono text-[9px] bg-muted/50">
                  {roleCounts[tab.value]}
                </Badge>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search name or @username..."
                value={(table.getColumn('displayName')?.getFilterValue() as string) ?? ''}
                onChange={(e) => table.getColumn('displayName')?.setFilterValue(e.target.value)}
                className="h-9 pl-9 w-64 bg-card border-border/50 focus-visible:ring-primary/20"
              />
            </div>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow 
                    key={row.id} 
                    className="group border-border/40 hover:bg-muted/30 transition-colors data-[state=selected]:bg-muted"
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="py-3 px-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                     No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10">
          <div className="flex-1 text-xs text-muted-foreground">
            Selected {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} items
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">Rows per page</p>
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
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-display-name">Display Name</Label>
              <Input id="create-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-username">Username</Label>
              <Input id="create-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Password</Label>
              <Input id="create-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="text-[11px] text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="bg-card sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              Account: <span className="font-semibold">{resetTarget?.displayName}</span> (@{resetTarget?.username})
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? 'Resetting...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete account <span className="font-bold text-foreground">{deleteTarget?.displayName}</span>?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteSubmitting}>
              {deleteSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function SortableHeader({ column, title }: { column: any, title: string }) {
  return (
    <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 hover:text-foreground transition-colors group">
      {title}
      {column.getIsSorted() === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> : <ChevronsUpDown className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100" />}
    </button>
  );
}
