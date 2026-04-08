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
    { label: 'ทั้งหมด', value: 'ALL', icon: Users, iconClassName: 'text-primary' },
    { label: 'ผู้ดูแลระบบ', value: 'ADMIN', icon: Shield, iconClassName: 'text-emerald-400' },
    { label: 'บรรณาธิการ', value: 'EDITOR', icon: PencilLine, iconClassName: 'text-sky-400' },
    { label: 'ผู้ชม', value: 'VIEWER', icon: Eye, iconClassName: 'text-amber-400' },
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
      toast.error(getErrorMessage(error, 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้'));
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
      title: 'บัญชีผู้ใช้',
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'บัญชีผู้ใช้' },
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
      toast.success('สร้างผู้ใช้สำเร็จ');
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('VIEWER');
      setCreateOpen(false);
      await loadUsers();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'ไม่สามารถสร้างผู้ใช้ได้'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: Role) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: nextRole });
      setUsers((current) => current.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)));
      toast.success('อัปเดตบทบาทสำเร็จ');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'ไม่สามารถอัปเดตบทบาทได้'));
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
      toast.success('ลบผู้ใช้สำเร็จ');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'ไม่สามารถลบผู้ใช้ได้'));
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
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!isPasswordValid(resetPassword)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setResetSubmitting(true);

    try {
      await api.patch(`/users/${resetTarget.id}/reset-password`, { password: resetPassword });
      toast.success('รีเซ็ตรหัสผ่านสำเร็จ');
      setResetPassword('');
      setResetTarget(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'ไม่สามารถรีเซ็ตรหัสผ่านได้'));
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-foreground" />
          <p className="text-sm">กำลังโหลดข้อมูลผู้ใช้...</p>
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
                  placeholder="ค้นหาตามชื่อ ชื่อผู้ใช้ หรือบทบาท"
                  className="pl-10"
                />
              </div>

              <Button type="button" size="lg" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                สร้างผู้ใช้
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-frame min-w-[760px]">
              <thead>
                <tr className="table-head-row">
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('displayName')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      ชื่อที่แสดง
                      {renderSortIcon('displayName')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('username')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      ชื่อผู้ใช้
                      {renderSortIcon('username')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('role')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      บทบาท
                      {renderSortIcon('role')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      สร้างเมื่อ
                      {renderSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    <button onClick={() => toggleSort('updatedAt')} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                      อัปเดตเมื่อ
                      {renderSortIcon('updatedAt')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium text-right">การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      ไม่มีผู้ใช้ที่ตรงกับตัวกรองของคุณ
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
                          {isCurrentUser ? ' - บัญชีปัจจุบัน' : ''}
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
            <DialogTitle>สร้างผู้ใช้</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-display-name" required>ชื่อที่แสดง</Label>
              <Input
                id="create-display-name"
                autoComplete="name"
                placeholder="ชื่อเต็ม"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-username" required>ชื่อผู้ใช้</Label>
              <Input
                id="create-username"
                autoComplete="username"
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password" required>รหัสผ่าน</Label>
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
              <Label required>บทบาท</Label>
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
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              รีเซ็ตรหัสผ่านสำหรับ <span className="font-medium text-foreground">{resetTarget?.displayName}</span>{' '}
              <span className="text-[11px]">@{resetTarget?.username}</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password" required>รหัสผ่านใหม่</Label>
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
              <Label htmlFor="reset-password-confirm" required>ยืนยันรหัสผ่านใหม่</Label>
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
                ยกเลิก
              </Button>
              <Button type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? 'กำลังรีเซ็ต...' : 'รีเซ็ตรหัสผ่าน'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลบผู้ใช้</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              ลบ <span className="font-medium text-foreground">{deleteTarget?.displayName}</span>{' '}
              <span className="text-[11px]">@{deleteTarget?.username}</span> ออกจากพื้นที่ทำงานนี้?
            </div>
            <p className="text-xs text-muted-foreground">การนี้ลบบัญชีออกจากระบบ ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้อีกต่อไป</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteSubmitting}>
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDeleteUser()}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'กำลังลบ...' : 'ลบผู้ใช้'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
