'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ChevronsUpDown, Eye, KeyRound, LoaderCircle, PencilLine, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
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

type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';
type SortKey = 'displayName' | 'username' | 'role' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

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
    { label: 'Admins', value: 'ADMIN', icon: Shield, iconClassName: 'text-emerald-400' },
    { label: 'Editors', value: 'EDITOR', icon: PencilLine, iconClassName: 'text-sky-400' },
    { label: 'Viewers', value: 'VIEWER', icon: Eye, iconClassName: 'text-amber-400' },
  ];

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message as string;
  }

  return fallback;
}

export default function UsersPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRole, setActiveRole] = useState<'ALL' | Role>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('displayName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  async function loadUsers() {
    try {
      const response = await api.get<UserRecord[]>('/users');
      setUsers(response.data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role !== 'ADMIN') {
      router.replace('/dashboard/assets');
      return;
    }

    void loadUsers();
  }, [router, user]);

  useEffect(() => {
    setHeader({
      title: 'User Accounts',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'User Accounts' },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader]);

  const roleCounts = useMemo<Record<'ALL' | Role, number>>(
    () => ({
      ALL: users.length,
      ADMIN: users.filter((item) => item.role === 'ADMIN').length,
      EDITOR: users.filter((item) => item.role === 'EDITOR').length,
      VIEWER: users.filter((item) => item.role === 'VIEWER').length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return [...users]
      .filter((item) => {
        const matchesRole = activeRole === 'ALL' || item.role === activeRole;
        const matchesSearch =
          query.length === 0 ||
          item.displayName.toLowerCase().includes(query) ||
          item.username.toLowerCase().includes(query) ||
          item.role.toLowerCase().includes(query);

        return matchesRole && matchesSearch;
      })
      .sort((left, right) => {
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
  }, [activeRole, searchTerm, sortDirection, sortKey, users]);

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

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();

    if (!isPasswordValid(password)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/users', { username, displayName, password, role });
      toast.success('User created successfully');
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('VIEWER');
      setCreateOpen(false);
      await loadUsers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: Role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: nextRole });
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)));
      toast.success('Role updated');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update role'));
      await loadUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteSubmitting(true);

    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('User removed');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete user'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!resetTarget) {
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordValid(resetPassword)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setResetSubmitting(true);

    try {
      await api.patch(`/users/${resetTarget.id}/reset-password`, { password: resetPassword });
      toast.success('Password reset successfully');
      setResetPassword('');
      setResetTarget(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to reset password'));
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-foreground" />
          <p className="text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <section>
        <div className="table-shell">
          <div className="toolbar-strip">
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {ROLE_TABS.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveRole(tab.value)}
                    className={`filter-chip ${activeRole === tab.value ? 'filter-chip-active' : ''}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${tab.iconClassName}`} />
                    <span>{tab.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      {roleCounts[tab.value]}
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
                  placeholder="Search by name, username, or role"
                  className="pl-10"
                />
              </div>

              <Button type="button" size="lg" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create User
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-frame min-w-[760px]">
              <thead>
                <tr className="table-head-row">
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('displayName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Name
                      {renderSortIcon('displayName')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('username')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Username
                      {renderSortIcon('username')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('role')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Role
                      {renderSortIcon('role')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Created
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('updatedAt')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      Updated
                      {renderSortIcon('updatedAt')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No users matched your filters.
                    </td>
                  </tr>
                ) : filteredUsers.map((item) => {
                  const isCurrentUser = item.id === user?.id;

                  return (
                    <tr key={item.id} className="table-row">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <UserAvatar seed={item.avatarSeed} imageUrl={item.avatarImage} label={item.displayName} className="h-7 w-7" />
                          <div className="text-[12px] text-foreground">{item.displayName}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[11px] text-muted-foreground">
                          @{item.username}
                          {isCurrentUser ? ' - Current account' : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Select value={item.role} onValueChange={(value) => void handleRoleChange(item.id, value as Role)} disabled={isCurrentUser}>
                          <SelectTrigger
                            size="sm"
                            className="h-5.5 min-h-0 w-[78px] rounded-md border-border/60 bg-background/40 px-1.5 py-0 text-[10px] shadow-none [&>svg]:size-3"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setResetTarget(item);
                              setResetPassword('');
                              setResetPasswordConfirm('');
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDeleteTarget(item)}
                            disabled={isCurrentUser}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-display-name">Display name</Label>
              <Input
                id="create-display-name"
                autoComplete="name"
                placeholder="Full name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create user'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Reset password for <span className="font-medium text-foreground">{resetTarget?.displayName}</span>{' '}
              <span className="text-[11px]">@{resetTarget?.username}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-confirm">Confirm new password</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={resetPasswordConfirm}
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setResetTarget(null)} disabled={resetSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? 'Resetting...' : 'Reset password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{deleteTarget?.displayName}</span>{' '}
              <span className="text-[11px]">@{deleteTarget?.username}</span> from this workspace?
            </div>
            <p className="text-xs text-muted-foreground">This action removes the account from the system. The user will no longer be able to sign in.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteUser()}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete user'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
