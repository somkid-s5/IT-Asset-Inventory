'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { KeyRound, Shield } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PASSWORD_POLICY_MESSAGE, isPasswordValid } from '@/lib/password-policy';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function createClientAvatarSeed() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }

  return Math.random().toString(36).slice(2, 18);
}

const MAX_AVATAR_FILE_SIZE = 1024 * 1024;

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

export default function ProfilePage() {
  const { setHeader } = usePageHeader();
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatarSeed, setAvatarSeed] = useState(user?.avatarSeed ?? '');
  const [avatarImage, setAvatarImage] = useState<string | null>(user?.avatarImage ?? null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาอัปโหลดไฟล์รูปภาพ');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error('ขนาดรูปตัวแทนต้องไม่เกิน 1 MB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);

    try {
      const payload: {
        displayName: string;
        avatarSeed?: string;
        avatarImage?: string | null;
      } = {
        displayName,
        avatarImage,
      };

      if (avatarSeed.trim().length >= 6) {
        payload.avatarSeed = avatarSeed.trim();
      }

      const response = await api.patch('/auth/profile', payload);
      if (user) {
        updateUser({
          ...user,
          displayName: response.data.user.displayName,
          avatarSeed: response.data.user.avatarSeed,
          avatarImage: response.data.user.avatarImage,
        });
      }
      toast.success('อัปเดตโปรไฟล์สำเร็จ');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'ไม่สามารถอัปเดตโปรไฟล์ได้'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (!isPasswordValid(newPassword)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setSaving(true);

    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('อัปเดทรหัสผ่านสำเร็จ');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'ไม่สามารถอัปเดทรหัสผ่านได้'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setHeader({
      title: 'โปรไฟล์',
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'โปรไฟล์' },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [setHeader]);

  return (
    <div className="workspace-page">
      <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <UserAvatar
              seed={avatarSeed}
              imageUrl={avatarImage}
              label={displayName || user?.displayName || 'Infra Pilot'}
              className="h-8 w-8"
            />
            <span className="font-semibold text-foreground">{displayName || user?.displayName || 'บัญชี'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">ชื่อผู้ใช้ <span className="font-semibold text-foreground">@{user?.username ?? '--'}</span></span>
          <span className="inline-flex items-center gap-1.5">บทบาท <span className="font-semibold text-foreground">{user?.role ?? '--'}</span></span>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="surface-panel p-4">
          <div className="flex items-center gap-2">
            <div className="icon-chip h-8 w-8 p-0 text-foreground">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">โปรไฟล์</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4 border-b border-border pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" required>ชื่อที่แสดง</Label>
              <Input
                id="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label optional>รูปตัวแทน</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="muted-panel flex flex-wrap items-center gap-3 px-4 py-4">
                <UserAvatar
                  seed={avatarSeed}
                  imageUrl={avatarImage}
                  label={displayName || user?.displayName || 'อินฟรา ไพล็อต'}
                  className="h-12 w-12"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  อัปโหลดรูปภาพ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAvatarImage(null);
                    setAvatarSeed(createClientAvatarSeed());
                  }}
                >
                  สุ่มรูปตัวแทน
                </Button>
                {avatarImage ? (
                  <Button type="button" variant="ghost" onClick={() => setAvatarImage(null)}>
                    ลบออก
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">อัปโหลดรูป JPG, PNG, หรือ WebP ขนาดไม่เกิน 1 MB หากไม่มีรูปภาพ จะใช้รูปตัวแทน DiceBear แทน</p>
            </div>

            <Button type="submit" variant="outline" disabled={profileSaving}>
              {profileSaving ? 'กำลังบันทึกโปรไฟล์...' : 'บันทึกโปรไฟล์'}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <div className="icon-chip h-8 w-8 p-0 text-foreground">
              <KeyRound className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">เปลี่ยนรหัสผ่าน</h3>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" required>รหัสผ่านปัจจุบัน</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" required>รหัสผ่านใหม่</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" required>ยืนยันรหัสผ่านใหม่</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'กำลังอัปเดทรหัสผ่าน...' : 'อัปเดทรหัสผ่าน'}
            </Button>
          </form>
        </div>

        <div className="surface-panel p-4">
          <div className="flex items-center gap-2">
            <div className="icon-chip h-8 w-8 p-0 text-foreground">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">หมายเหตุความปลอดภัย</h3>
          </div>

          <div className="mt-4 space-y-2">
            <div className="muted-panel px-3 py-3 text-xs leading-5 text-muted-foreground">
              {PASSWORD_POLICY_MESSAGE}
            </div>
            <div className="muted-panel px-3 py-3 text-xs leading-5 text-muted-foreground">
              หากคุณลืมรหัสผ่าน ผู้ดูแลระบบสามารถรีเซ็ตให้ได้จากหน้า <span className="font-medium text-foreground">ผู้ใช้</span>
            </div>
            <div className="muted-panel px-3 py-3 text-xs leading-5 text-muted-foreground">
              การเปลี่ยนแปลงบทบาทยังคงต้องผ่านผู้ดูแลระบบ และแยกออกจากการตั้งค่าโปรไฟล์ส่วนตัวโดยตั้งใจ
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
