'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, HardDrive, Plus, Shield, Trash2, UserRound } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

type AssetType = 'SERVER' | 'STORAGE' | 'SWITCH' | 'SP' | 'NETWORK';

interface AccessUserFormValue {
  username: string;
  password: string;
}

interface AccessPointFormValue {
  type: string;
  manageType: string;
  address: string;
  users: AccessUserFormValue[];
}

interface MetadataPair {
  key: string;
  value: string;
}

interface AssetCredential {
  id?: string;
  username: string;
  password?: string;
  type?: string | null;
}

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
}

interface AssetFormAsset {
  id: string;
  name: string;
  assetId?: string | null;
  type: AssetType;
  osVersion?: string | null;
  rack?: string | null;
  location?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  manageType?: string | null;
  customMetadata?: Record<string, unknown> | null;
  ipAllocations?: AssetIpAllocation[];
  credentials?: AssetCredential[];
}

interface ParentAssetOption {
  id: string;
  name: string;
  type: string;
}

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetToEdit?: AssetFormAsset;
  onSuccess: () => void;
  availableParents: ParentAssetOption[];
}

const EMPTY_USER: AccessUserFormValue = {
  username: '',
  password: '',
};

const EMPTY_ACCESS_POINT: AccessPointFormValue = {
  type: '',
  manageType: '',
  address: '',
  users: [{ ...EMPTY_USER }],
};

const DEFAULT_FORM_STATE = {
  name: '',
  assetId: '',
  type: 'SERVER' as AssetType,
  osVersion: '',
  rack: '',
  location: 'DC',
  brandModel: '',
  sn: '',
};

const typeOptions: { value: AssetType; label: string }[] = [
  { value: 'SERVER', label: 'Server' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'SWITCH', label: 'Switch' },
  { value: 'SP', label: 'Service Processor' },
  { value: 'NETWORK', label: 'Network' },
];

export function AssetFormDialog({
  open,
  onOpenChange,
  assetToEdit,
  onSuccess,
  availableParents: _availableParents,
}: AssetFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [accessPoints, setAccessPoints] = useState<AccessPointFormValue[]>([{ ...EMPTY_ACCESS_POINT }]);
  const [metadataPairs, setMetadataPairs] = useState<MetadataPair[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!assetToEdit) {
      setFormData(DEFAULT_FORM_STATE);
      setAccessPoints([{ ...EMPTY_ACCESS_POINT }]);
      setMetadataPairs([]);
      return;
    }

    const groupedMap = new Map<string, AccessPointFormValue>();

    (assetToEdit.ipAllocations ?? []).forEach((ip, index) => {
      const key = `${ip.type ?? 'general'}-${ip.address}-${index}`;
      groupedMap.set(key, {
        type: ip.type ?? '',
        manageType: assetToEdit.manageType ?? '',
        address: ip.address,
        users: [],
      });
    });

    (assetToEdit.credentials ?? []).forEach((credential, index) => {
      const matchedEntry = Array.from(groupedMap.entries()).find(([key, value]) => {
        const sameType = (value.type || '').toLowerCase() === (credential.type || '').toLowerCase();
        return sameType && value.users.length === 0;
      });

      if (matchedEntry) {
        matchedEntry[1].users.push({
          username: credential.username,
          password: credential.password ?? '',
        });
        return;
      }

      groupedMap.set(`credential-${credential.type ?? 'general'}-${index}`, {
        type: credential.type ?? '',
        manageType: assetToEdit.manageType ?? '',
        address: '',
        users: [
          {
            username: credential.username,
            password: credential.password ?? '',
          },
        ],
      });
    });

    const resolvedAccessPoints =
      groupedMap.size > 0
        ? Array.from(groupedMap.values()).map((item) => ({
            ...item,
            users: item.users.length > 0 ? item.users : [{ ...EMPTY_USER }],
          }))
        : [{ ...EMPTY_ACCESS_POINT }];

    setFormData({
      name: assetToEdit.name || '',
      assetId: assetToEdit.assetId || '',
      type: assetToEdit.type || 'SERVER',
      osVersion: assetToEdit.osVersion || '',
      rack: assetToEdit.rack || '',
      location: assetToEdit.location || 'DC',
      brandModel: assetToEdit.brandModel || '',
      sn: assetToEdit.sn || '',
    });

    setAccessPoints(resolvedAccessPoints);
    setMetadataPairs(
      assetToEdit.customMetadata
        ? Object.entries(assetToEdit.customMetadata).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [],
    );
  }, [assetToEdit, open]);

  const updateAccessPoint = (index: number, field: keyof Omit<AccessPointFormValue, 'users'>, value: string) => {
    setAccessPoints((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const updateAccessUser = (
    accessIndex: number,
    userIndex: number,
    field: keyof AccessUserFormValue,
    value: string,
  ) => {
    setAccessPoints((current) =>
      current.map((item, itemIndex) =>
        itemIndex === accessIndex
          ? {
              ...item,
              users: item.users.map((user, currentUserIndex) =>
                currentUserIndex === userIndex ? { ...user, [field]: value } : user,
              ),
            }
          : item,
      ),
    );
  };

  const updateMetadataField = (index: number, field: keyof MetadataPair, value: string) => {
    setMetadataPairs((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const customMetadata = metadataPairs.reduce<Record<string, string>>((result, pair) => {
        if (pair.key.trim() && pair.value.trim()) {
          result[pair.key.trim().toLowerCase().replace(/\s+/g, '_')] = pair.value.trim();
        }
        return result;
      }, {});

      const finalIps = accessPoints
        .filter((item) => item.address.trim())
        .map((item) => ({
          address: item.address.trim(),
          type: item.type.trim() || item.manageType.trim() || undefined,
        }));

      const finalCredentials = accessPoints.flatMap((item) =>
        item.users
          .filter((user) => user.username.trim())
          .map((user) => ({
            username: user.username.trim(),
            password: user.password,
            type: item.type.trim() || item.manageType.trim() || undefined,
          })),
      );

      const payload = {
        ...formData,
        assetId: formData.assetId.trim() || undefined,
        rack: formData.rack.trim() || undefined,
        location: formData.location.trim() || undefined,
        brandModel: formData.brandModel.trim() || undefined,
        sn: formData.sn.trim() || undefined,
        osVersion: formData.osVersion.trim() || undefined,
        ips: finalIps,
        credentials: finalCredentials,
        customMetadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
      };

      if (assetToEdit) {
        await api.patch(`/assets/${assetToEdit.id}`, payload);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', payload);
        toast.success('Asset created successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to save asset';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/70 bg-white/92 p-0 shadow-[0_40px_120px_-50px_rgba(15,23,42,0.5)] backdrop-blur-2xl sm:max-w-4xl dark:border-white/10 dark:bg-card/95">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HardDrive className="h-4 w-4" />
            </span>
            <span>{assetToEdit ? 'Edit Asset' : 'Create New Asset'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Identity</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Asset Name / Hostname</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="TRD-APIControlDom"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Asset ID</Label>
                  <Input
                    value={formData.assetId}
                    onChange={(event) => setFormData({ ...formData, assetId: event.target.value })}
                    placeholder="6303-0001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as AssetType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Brand / Model</Label>
                  <Input
                    value={formData.brandModel}
                    onChange={(event) => setFormData({ ...formData, brandModel: event.target.value })}
                    placeholder="HPE StoreFabric SN3600B"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Serial Number</Label>
                  <Input
                    value={formData.sn}
                    onChange={(event) => setFormData({ ...formData, sn: event.target.value })}
                    placeholder="CZC014WXEG"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Placement</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                    placeholder="DC"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rack</Label>
                  <Input
                    value={formData.rack}
                    onChange={(event) => setFormData({ ...formData, rack: event.target.value })}
                    placeholder="1C-04"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>OS / Firmware</Label>
                  <Input
                    value={formData.osVersion}
                    onChange={(event) => setFormData({ ...formData, osVersion: event.target.value })}
                    placeholder="VMware ESXi 8.0.3"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/65 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Access Points
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One row per access context, with multiple users inside the same row.
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => setAccessPoints((current) => [...current, { ...EMPTY_ACCESS_POINT }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Row
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {accessPoints.map((point, index) => (
                <div key={`${point.type}-${index}`} className="rounded-xl border border-border/70 bg-card/60 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Shield className="h-4 w-4 text-primary" />
                      Access row {index + 1}
                    </div>
                    {accessPoints.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setAccessPoints((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Access Type</Label>
                      <Input
                        value={point.type}
                        onChange={(event) => updateAccessPoint(index, 'type', event.target.value)}
                        placeholder="IPMI / Host"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Manage Type</Label>
                      <Input
                        value={point.manageType}
                        onChange={(event) => updateAccessPoint(index, 'manageType', event.target.value)}
                        placeholder="WEB / SSH"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>IP Address</Label>
                      <Input
                        value={point.address}
                        onChange={(event) => updateAccessPoint(index, 'address', event.target.value)}
                        placeholder="192.168.41.151"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-border/70 bg-background/70 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <UserRound className="h-3.5 w-3.5 text-primary" />
                        User accounts
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() =>
                          setAccessPoints((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, users: [...item.users, { ...EMPTY_USER }] } : item,
                            ),
                          )
                        }
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add User
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {point.users.map((user, userIndex) => (
                        <div key={`${index}-${userIndex}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                          <Input
                            value={user.username}
                            onChange={(event) => updateAccessUser(index, userIndex, 'username', event.target.value)}
                            placeholder="Username"
                          />
                          <Input
                            type="password"
                            value={user.password}
                            onChange={(event) => updateAccessUser(index, userIndex, 'password', event.target.value)}
                            placeholder="Password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() =>
                              setAccessPoints((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        users:
                                          item.users.length > 1
                                            ? item.users.filter((_, currentUserIndex) => currentUserIndex !== userIndex)
                                            : [{ ...EMPTY_USER }],
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-background/65 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Extra Specs
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Optional metadata like RAM, CPU, or warranty.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMetadataPairs((current) => [...current, { key: '', value: '' }])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Spec
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {metadataPairs.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/80 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                  No extra specifications yet.
                </div>
              )}

              {metadataPairs.map((pair, index) => (
                <div key={`${pair.key}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]">
                  <Input
                    value={pair.key}
                    onChange={(event) => updateMetadataField(index, 'key', event.target.value)}
                    placeholder="Key"
                  />
                  <Input
                    value={pair.value}
                    onChange={(event) => updateMetadataField(index, 'value', event.target.value)}
                    placeholder="Value"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setMetadataPairs((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? (
                <>
                  <Database className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : assetToEdit ? (
                'Save Asset Changes'
              ) : (
                'Create Asset'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
