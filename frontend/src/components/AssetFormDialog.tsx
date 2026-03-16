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
  nodeLabel: string;
  type: string;
  manageType: string;
  version: string;
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
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
}

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
}

interface AssetFormAsset {
  id: string;
  name: string;
  assetId?: string | null;
  type: AssetType;
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
  nodeLabel: '',
  type: '',
  manageType: '',
  version: '',
  address: '',
  users: [{ ...EMPTY_USER }],
};

const DEFAULT_FORM_STATE = {
  name: '',
  assetId: '',
  type: 'SERVER' as AssetType,
  rack: '',
  location: '',
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

const accessTypeOptions = ['Host', 'Management'];

const manageTypeOptions = ['WEB', 'SSH'];

function getSelectOptions(baseOptions: string[], currentValue: string) {
  if (currentValue && !baseOptions.includes(currentValue)) {
    return [currentValue, ...baseOptions];
  }

  return baseOptions;
}

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
  const [assetMode, setAssetMode] = useState<'single' | 'multi'>('single');
  const [nodeLabels, setNodeLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!assetToEdit) {
      setFormData(DEFAULT_FORM_STATE);
      setAccessPoints([{ ...EMPTY_ACCESS_POINT }]);
      setMetadataPairs([]);
      setAssetMode('single');
      setNodeLabels([]);
      return;
    }

    const groupedMap = new Map<string, AccessPointFormValue>();
    const makeAccessKey = (
      nodeLabel?: string | null,
      type?: string | null,
      manageType?: string | null,
      version?: string | null,
      address?: string | null,
    ) =>
      [
        nodeLabel?.trim().toLowerCase() || 'primary',
        type?.trim().toLowerCase() || 'general',
        manageType?.trim().toLowerCase() || 'direct',
        version?.trim().toLowerCase() || 'no-version',
        address?.trim().toLowerCase() || 'no-address',
      ].join('::');

    (assetToEdit.ipAllocations ?? []).forEach((ip, index) => {
      const key =
        makeAccessKey(ip.nodeLabel, ip.type, ip.manageType, ip.version, ip.address) ||
        `${ip.type ?? 'general'}-${ip.address}-${index}`;
      groupedMap.set(key, {
        nodeLabel: ip.nodeLabel ?? '',
        type: ip.type ?? '',
        manageType: ip.manageType ?? assetToEdit.manageType ?? '',
        version: ip.version ?? '',
        address: ip.address,
        users: [],
      });
    });

    (assetToEdit.credentials ?? []).forEach((credential, index) => {
      const key = makeAccessKey(credential.nodeLabel, credential.type, credential.manageType, credential.version, null);
      const matchedEntry = groupedMap.get(key) ?? Array.from(groupedMap.values()).find(
        (value) =>
          (value.nodeLabel || '').toLowerCase() === (credential.nodeLabel || '').toLowerCase() &&
          (value.type || '').toLowerCase() === (credential.type || '').toLowerCase() &&
          (value.manageType || '').toLowerCase() === (credential.manageType || '').toLowerCase() &&
          (value.version || '').toLowerCase() === (credential.version || '').toLowerCase(),
      );

      if (matchedEntry) {
        matchedEntry.manageType = matchedEntry.manageType || credential.manageType || '';
        matchedEntry.version = matchedEntry.version || credential.version || '';
        matchedEntry.users.push({
          username: credential.username,
          password: credential.password ?? '',
        });
        return;
      }

      groupedMap.set(key || `credential-${credential.type ?? 'general'}-${index}`, {
        nodeLabel: credential.nodeLabel ?? '',
        type: credential.type ?? '',
        manageType: credential.manageType ?? assetToEdit.manageType ?? '',
        version: credential.version ?? '',
        address: '',
        users: [{ username: credential.username, password: credential.password ?? '' }],
      });
    });

    setFormData({
      name: assetToEdit.name || '',
      assetId: assetToEdit.assetId || '',
      type: assetToEdit.type || 'SERVER',
      rack: assetToEdit.rack || '',
      location: assetToEdit.location || '',
      brandModel: assetToEdit.brandModel || '',
      sn: assetToEdit.sn || '',
    });

    setAccessPoints(
      groupedMap.size > 0
        ? Array.from(groupedMap.values()).map((item) => ({
            ...item,
            users: item.users.length > 0 ? item.users : [{ ...EMPTY_USER }],
          }))
        : [{ ...EMPTY_ACCESS_POINT }],
    );

    const existingNodeLabels = Array.from(
      new Set(
        [
          ...(assetToEdit.ipAllocations ?? []).map((item) => item.nodeLabel?.trim()).filter(Boolean),
          ...(assetToEdit.credentials ?? []).map((item) => item.nodeLabel?.trim()).filter(Boolean),
        ] as string[],
      ),
    );
    setAssetMode(existingNodeLabels.length > 0 ? 'multi' : 'single');
    setNodeLabels(existingNodeLabels);

    setMetadataPairs(
      assetToEdit.customMetadata
        ? Object.entries(assetToEdit.customMetadata).map(([key, value]) => ({
            key,
            value: String(value),
          }))
        : [],
    );
  }, [assetToEdit, open]);

  useEffect(() => {
    if (assetMode === 'single') {
      setAccessPoints((current) => current.map((item) => ({ ...item, nodeLabel: '' })));
    } else if (assetMode === 'multi' && nodeLabels.length === 0) {
      setNodeLabels(['Node A']);
      setAccessPoints((current) =>
        current.map((item, index) => ({ ...item, nodeLabel: item.nodeLabel || (index === 0 ? 'Node A' : '') })),
      );
    }
  }, [assetMode, nodeLabels.length]);

  const updateAccessPoint = (index: number, field: keyof Omit<AccessPointFormValue, 'users'>, value: string) => {
    setAccessPoints((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const updateAccessUser = (accessIndex: number, userIndex: number, field: keyof AccessUserFormValue, value: string) => {
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
          type: item.type.trim() || undefined,
          nodeLabel: assetMode === 'multi' ? item.nodeLabel.trim() || undefined : undefined,
          manageType: item.manageType.trim() || undefined,
          version: item.version.trim() || undefined,
        }));

      const finalCredentials = accessPoints.flatMap((item) =>
        item.users
          .filter((user) => user.username.trim())
          .map((user) => ({
            username: user.username.trim(),
            password: user.password,
            type: item.type.trim() || undefined,
            nodeLabel: assetMode === 'multi' ? item.nodeLabel.trim() || undefined : undefined,
            manageType: item.manageType.trim() || undefined,
            version: item.version.trim() || undefined,
          })),
      );

      const payload = {
        ...formData,
        assetId: formData.assetId.trim() || undefined,
        rack: formData.rack.trim() || undefined,
        location: formData.location.trim() || undefined,
        brandModel: formData.brandModel.trim() || undefined,
        sn: formData.sn.trim() || undefined,
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

  const addNodeLabel = () => {
    const nextLabel = `Node ${String.fromCharCode(65 + nodeLabels.length)}`;
    setNodeLabels((current) => [...current, nextLabel]);
  };

  const removeNodeLabel = (indexToRemove: number) => {
    const labelToRemove = nodeLabels[indexToRemove];
    if (!labelToRemove) {
      return;
    }

    setNodeLabels((current) => current.filter((_, index) => index !== indexToRemove));
    setAccessPoints((current) => {
      const remaining = current.filter((item) => item.nodeLabel !== labelToRemove);
      return remaining.length > 0 ? remaining : [{ ...EMPTY_ACCESS_POINT }];
    });
  };

  const renameNodeLabel = (indexToRename: number, nextLabel: string) => {
    const previousLabel = nodeLabels[indexToRename];
    if (!previousLabel) {
      return;
    }

    const sanitized = nextLabel.replace(/^\s+/, '');
    const duplicateIndex = nodeLabels.findIndex(
      (label, index) => index !== indexToRename && label.toLowerCase() === sanitized.trim().toLowerCase(),
    );

    if (!sanitized || duplicateIndex !== -1) {
      return;
    }

    setNodeLabels((current) => current.map((label, index) => (index === indexToRename ? sanitized : label)));
    setAccessPoints((current) =>
      current.map((item) => (item.nodeLabel === previousLabel ? { ...item, nodeLabel: sanitized } : item)),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={assetToEdit?.id ?? 'new-asset'}
        className="max-h-[92vh] overflow-y-auto border-border bg-card p-0 sm:max-w-4xl"
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-3 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
              <HardDrive className="h-4 w-4" />
            </span>
            <span>{assetToEdit ? 'Edit Asset' : 'Create New Asset'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5 px-5 py-5">
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-medium text-muted-foreground">Identity</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Asset Name / Hostname</Label>
                  <Input
                    required
                    autoComplete="off"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="Enter asset name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Asset ID</Label>
                  <Input
                    autoComplete="off"
                    value={formData.assetId}
                    onChange={(event) => setFormData({ ...formData, assetId: event.target.value })}
                    placeholder="Enter asset ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as AssetType })}>
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
                    autoComplete="off"
                    value={formData.brandModel}
                    onChange={(event) => setFormData({ ...formData, brandModel: event.target.value })}
                    placeholder="Enter brand or model"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Serial Number</Label>
                  <Input
                    autoComplete="off"
                    value={formData.sn}
                    onChange={(event) => setFormData({ ...formData, sn: event.target.value })}
                    placeholder="Enter serial number"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[11px] font-medium text-muted-foreground">Placement</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    autoComplete="off"
                    value={formData.location}
                    onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                    placeholder="Enter location"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rack</Label>
                  <Input
                    autoComplete="off"
                    value={formData.rack}
                    onChange={(event) => setFormData({ ...formData, rack: event.target.value })}
                    placeholder="Enter rack"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Access Points</p>
                <p className="mt-1 text-xs text-muted-foreground">One row per context, with multiple users inside the same row.</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={assetMode} onValueChange={(value) => setAssetMode(value as 'single' | 'multi')}>
                  <SelectTrigger className="h-8 w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Asset</SelectItem>
                    <SelectItem value="multi">Multi-node Asset</SelectItem>
                  </SelectContent>
                </Select>
                {assetMode === 'multi' && (
                  <Button type="button" variant="outline" size="sm" onClick={addNodeLabel}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Node
                  </Button>
                )}
                <Button type="button" size="sm" onClick={() => setAccessPoints((current) => [...current, { ...EMPTY_ACCESS_POINT, nodeLabel: assetMode === 'multi' ? nodeLabels[0] || 'Node A' : '' }])}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Row
                </Button>
              </div>
            </div>

            {assetMode === 'multi' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {nodeLabels.map((label, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1"
                  >
                    <Input
                      value={label}
                      onChange={(event) => renameNodeLabel(index, event.target.value)}
                      className="h-6 min-w-[88px] border-0 bg-transparent px-1 text-[11px] font-medium text-foreground shadow-none focus-visible:ring-0"
                      aria-label="Node name"
                    />
                    {nodeLabels.length > 1 && (
                      <button
                        type="button"
                        className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                        onClick={() => removeNodeLabel(index)}
                        aria-label={`Remove ${label}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {accessPoints.map((point, index) => (
                <div key={`${point.type}-${index}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Shield className="h-4 w-4 text-muted-foreground" />
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

                  <div className={`grid gap-3 ${assetMode === 'multi' ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
                    {assetMode === 'multi' && (
                      <div className="space-y-1.5">
                        <Label>Node</Label>
                        <Select value={point.nodeLabel || undefined} onValueChange={(value) => updateAccessPoint(index, 'nodeLabel', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select node" />
                          </SelectTrigger>
                          <SelectContent>
                            {nodeLabels.map((label) => (
                              <SelectItem key={label} value={label}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Access Type</Label>
                      <Select value={point.type || undefined} onValueChange={(value) => updateAccessPoint(index, 'type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access type" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(accessTypeOptions, point.type).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Access Method</Label>
                      <Select
                        value={point.manageType || undefined}
                        onValueChange={(value) => updateAccessPoint(index, 'manageType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select access method" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(manageTypeOptions, point.manageType).map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>IP Address</Label>
                      <Input
                        autoComplete="off"
                        value={point.address}
                        onChange={(event) => updateAccessPoint(index, 'address', event.target.value)}
                        placeholder="Enter IP address"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Version / Firmware</Label>
                      <Input
                        autoComplete="off"
                        value={point.version}
                        onChange={(event) => updateAccessPoint(index, 'version', event.target.value)}
                        placeholder="Enter version or firmware"
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border bg-background p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
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
                            autoComplete="off"
                            value={user.username}
                            onChange={(event) => updateAccessUser(index, userIndex, 'username', event.target.value)}
                            placeholder="Enter username"
                          />
                          <Input
                            type="password"
                            autoComplete="new-password"
                            value={user.password}
                            onChange={(event) => updateAccessUser(index, userIndex, 'password', event.target.value)}
                            placeholder="Enter password"
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

          <section className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Extra Specs</p>
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
                <div className="rounded-lg border border-dashed border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                  No extra specifications yet.
                </div>
              )}

              {metadataPairs.map((pair, index) => (
                <div key={`${pair.key}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]">
                  <Input
                    autoComplete="off"
                    value={pair.key}
                    onChange={(event) => updateMetadataField(index, 'key', event.target.value)}
                    placeholder="Field name"
                  />
                  <Input
                    autoComplete="off"
                    value={pair.value}
                    onChange={(event) => updateMetadataField(index, 'value', event.target.value)}
                    placeholder="Field value"
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

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-foreground text-background hover:bg-foreground/90">
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
