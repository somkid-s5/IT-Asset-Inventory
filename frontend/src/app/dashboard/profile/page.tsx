'use client';

import { ChangeEvent, FormEvent, useRef, useState } from 'react';
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
      toast.error('Please upload an image file');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error('Avatar image must be 1 MB or smaller');
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
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
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
      toast.success('Password updated successfully');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="page-breadcrumb">
                <span>Workspace</span>
                <span className="page-breadcrumb-separator">/</span>
                <span>My Account</span>
              </div>
              <p className="workspace-subtle mt-3">My Account</p>
              <h2 className="workspace-heading">Profile And Security</h2>
              <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
                Review your current access level and change your own password without asking an admin.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <UserAvatar
                  seed={avatarSeed}
                  imageUrl={avatarImage}
                  label={displayName || user?.displayName || 'Infra Pilot'}
                  className="h-8 w-8"
                />
                <span className="font-semibold text-foreground">{displayName || user?.displayName || 'Account'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">Username <span className="font-semibold text-foreground">@{user?.username ?? '--'}</span></span>
              <span className="inline-flex items-center gap-1.5">Role <span className="font-semibold text-foreground">{user?.role ?? '--'}</span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="surface-panel p-4">
          <div className="flex items-center gap-2">
            <div className="icon-chip h-8 w-8 p-0 text-foreground">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Profile</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4 border-b border-border pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Avatar</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="muted-panel flex flex-wrap items-center gap-3 px-4 py-4">
                <UserAvatar
                  seed={avatarSeed}
                  imageUrl={avatarImage}
                  label={displayName || user?.displayName || 'Infra Pilot'}
                  className="h-12 w-12"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAvatarImage(null);
                    setAvatarSeed(createClientAvatarSeed());
                  }}
                >
                  Randomize avatar
                </Button>
                {avatarImage ? (
                  <Button type="button" variant="ghost" onClick={() => setAvatarImage(null)}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">Upload JPG, PNG, or WebP up to 1 MB. If no image is set, a DiceBear avatar will be used.</p>
            </div>

            <Button type="submit" variant="outline" disabled={profileSaving}>
              {profileSaving ? 'Saving profile...' : 'Save profile'}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <div className="icon-chip h-8 w-8 p-0 text-foreground">
              <KeyRound className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Change Password</h3>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
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
              <Label htmlFor="newPassword">New password</Label>
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
              <Label htmlFor="confirmPassword">Confirm new password</Label>
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
              {saving ? 'Updating password...' : 'Update password'}
            </Button>
          </form>
        </div>

        <div className="surface-panel p-4">
          <div className="flex items-center gap-2">
            <div className="icon-chip h-8 w-8 p-0 text-foreground">
              <Shield className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Security Notes</h3>
          </div>

          <div className="mt-4 space-y-2">
            <div className="muted-panel px-3 py-3 text-xs leading-5 text-muted-foreground">
              {PASSWORD_POLICY_MESSAGE}
            </div>
            <div className="muted-panel px-3 py-3 text-xs leading-5 text-muted-foreground">
              If you forget your password, an admin can reset it from the <span className="font-medium text-foreground">Users</span> page.
            </div>
            <div className="muted-panel px-3 py-3 text-xs leading-5 text-muted-foreground">
              Role changes still require an admin and are intentionally separated from personal profile settings.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
