'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, LoaderCircle, Plus, Trash2 } from 'lucide-react';
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
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
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

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((item) => item.role === 'ADMIN').length,
      editors: users.filter((item) => item.role === 'EDITOR').length,
      viewers: users.filter((item) => item.role === 'VIEWER').length,
    };
  }, [users]);

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
    <div className="space-y-4 pb-8">
      <section className="surface-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Access Control</p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">User Accounts</h2>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
              Create workspace accounts, assign roles, and keep at least one admin active in the system.
            </p>
          </div>
          <Button
            type="button"
            className="bg-foreground text-background hover:bg-foreground/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create user
          </Button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Total Users</div>
            <div className="mt-1 text-base font-semibold text-foreground">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Admins</div>
            <div className="mt-1 text-base font-semibold text-foreground">{stats.admins}</div>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Editors</div>
            <div className="mt-1 text-base font-semibold text-foreground">{stats.editors}</div>
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Viewers</div>
            <div className="mt-1 text-base font-semibold text-foreground">{stats.viewers}</div>
          </div>
        </div>
      </section>

      <section>
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Workspace Users</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Manage who can view, edit, or administer the system.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-3 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => {
                  const isCurrentUser = item.id === user?.id;

                  return (
                    <tr key={item.id} className="border-b border-border/80 transition-colors hover:bg-accent/60 last:border-b-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar seed={item.avatarSeed} imageUrl={item.avatarImage} label={item.displayName} className="h-8 w-8" />
                          <div>
                            <div className="text-[12px] font-medium text-foreground">{item.displayName}</div>
                            <div className="text-[11px] text-muted-foreground">@{item.username}{isCurrentUser ? ' - Current account' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Select value={item.role} onValueChange={(value) => void handleRoleChange(item.id, value as Role)} disabled={isCurrentUser}>
                          <SelectTrigger className="h-9 w-[118px]">
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
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8"
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
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-display-name">Display name</Label>
              <Input
                id="create-display-name"
                autoComplete="name"
                placeholder="Enter full name"
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
                placeholder="Enter username"
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
              <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create user'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="border-border bg-card sm:max-w-md">
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
              <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90" disabled={resetSubmitting}>
                {resetSubmitting ? 'Resetting...' : 'Reset password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="border-border bg-card sm:max-w-md">
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
