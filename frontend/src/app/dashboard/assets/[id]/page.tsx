'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Database,
  Eye,
  EyeOff,
  FolderTree,
  HardDrive,
  Info,
  KeyRound,
  LoaderCircle,
  Monitor,
  Network,
  Server,
  Shield,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

type AssetType = 'SERVER' | 'STORAGE' | 'SWITCH' | 'SP' | 'NETWORK';

interface AssetCredential {
  id: string;
  username: string;
  password?: string;
  type?: string | null;
  lastChangedDate?: string | null;
}

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
  osVersion?: string | null;
  rack?: string | null;
  location?: string | null;
  manageType?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  credentials?: AssetCredential[];
  customMetadata?: Record<string, unknown> | null;
  department?: string | null;
  owner?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string; type: AssetType } | null;
  children?: { id: string; name: string; type: AssetType }[];
}

interface AccessGroup {
  key: string;
  label: string;
  ips: AssetIpAllocation[];
  credentials: AssetCredential[];
}

function getAssetIcon(type: AssetType, className = 'h-4 w-4') {
  switch (type) {
    case 'STORAGE':
      return <Database className={className} />;
    case 'SWITCH':
      return <Shield className={className} />;
    case 'SP':
      return <Monitor className={className} />;
    case 'NETWORK':
      return <Network className={className} />;
    default:
      return <Server className={className} />;
  }
}

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadAsset(id: string) {
      try {
        const response = await api.get<Asset>(`/assets/${id}`);
        setAsset(response.data);
      } catch {
        toast.error('Failed to load asset details');
        router.push('/dashboard/assets');
      } finally {
        setLoading(false);
      }
    }

    if (typeof params.id === 'string') {
      void loadAsset(params.id);
    }
  }, [params.id, router]);

  const accessGroups = useMemo<AccessGroup[]>(() => {
    if (!asset) {
      return [];
    }

    const groups = new Map<string, AccessGroup>();

    (asset.ipAllocations ?? []).forEach((ip) => {
      const label = ip.type?.trim() || 'General';
      const key = label.toLowerCase();
      const existing = groups.get(key) ?? { key, label, ips: [], credentials: [] };
      existing.ips.push(ip);
      groups.set(key, existing);
    });

    (asset.credentials ?? []).forEach((credential) => {
      const label = credential.type?.trim() || 'General';
      const key = label.toLowerCase();
      const existing = groups.get(key) ?? { key, label, ips: [], credentials: [] };
      existing.credentials.push(credential);
      groups.set(key, existing);
    });

    return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [asset]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-7 w-7 animate-spin text-primary" />
        <p className="text-sm">Loading asset details...</p>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  const quickFacts = [
    { label: 'Type', value: asset.type },
    { label: 'Location', value: asset.location || '--' },
    { label: 'Rack', value: asset.rack || '--' },
    { label: 'Manage', value: asset.manageType || '--' },
  ];

  return (
    <div className="space-y-4 pb-8">
      <section className="surface-panel p-5">
        <button
          onClick={() => router.push('/dashboard/assets')}
          className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {getAssetIcon(asset.type, 'h-5 w-5')}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground">{asset.name}</h2>
                  {asset.assetId && (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                      {asset.assetId}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{asset.brandModel || 'No model information'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[340px]">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{fact.label}</div>
                <div className="mt-1 text-sm font-medium text-foreground">{fact.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_340px]">
        <div className="space-y-4">
          <div className="surface-panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Access Details</h3>
            </div>

            <div className="space-y-3">
              {accessGroups.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/80 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                  No IP addresses or credentials for this asset.
                </div>
              )}

              {accessGroups.map((group) => (
                <div key={group.key} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">{group.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {group.ips.length} IPs • {group.credentials.length} credentials
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      {group.ips.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
                          No IPs
                        </div>
                      ) : (
                        group.ips.map((ip) => (
                          <div key={`${group.key}-${ip.address}`} className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2.5">
                            <div>
                              <div className="font-mono text-sm text-foreground">{ip.address}</div>
                              <div className="text-[11px] text-muted-foreground">{ip.type || 'General'}</div>
                            </div>
                            <button
                              onClick={() => {
                                void navigator.clipboard.writeText(ip.address);
                                toast.success('IP copied');
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2">
                      {group.credentials.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
                          No credentials
                        </div>
                      ) : (
                        group.credentials.map((credential) => {
                          const visible = revealed.has(credential.id);

                          return (
                            <div key={credential.id} className="rounded-xl border border-border/70 bg-card/70 px-3 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <UserRound className="h-4 w-4 text-primary" />
                                    <span className="truncate">{credential.username}</span>
                                  </div>
                                  <div className="mt-2 rounded-lg bg-background/80 px-3 py-2 font-mono text-sm text-foreground">
                                    {visible ? credential.password || '-' : '••••••••••'}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      setRevealed((current) => {
                                        const next = new Set(current);
                                        next.has(credential.id) ? next.delete(credential.id) : next.add(credential.id);
                                        return next;
                                      })
                                    }
                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                  >
                                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      void navigator.clipboard.writeText(credential.password || '');
                                      toast.success('Password copied');
                                    }}
                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {asset.customMetadata && Object.keys(asset.customMetadata).length > 0 && (
            <div className="surface-panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Additional Specifications</h3>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(asset.customMetadata).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1.5 text-sm text-foreground">{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Asset Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Serial Number</div>
                <div className="mt-1.5 font-mono text-sm text-foreground">{asset.sn || '--'}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">OS / Firmware</div>
                <div className="mt-1.5 text-sm text-foreground">{asset.osVersion || '--'}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Owner</div>
                <div className="mt-1.5 text-sm text-foreground">
                  {asset.owner || '--'} {asset.department ? `(${asset.department})` : ''}
                </div>
              </div>
            </div>
          </div>

          {(asset.parent || (asset.children?.length ?? 0) > 0) && (
            <div className="surface-panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">Hierarchy</h3>
              </div>

              <div className="space-y-2">
                {asset.parent && (
                  <button
                    onClick={() => router.push(`/dashboard/assets/${asset.parent?.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-accent/30"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {getAssetIcon(asset.parent.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Parent</div>
                      <div className="truncate text-sm font-medium text-foreground">{asset.parent.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}

                {asset.children?.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => router.push(`/dashboard/assets/${child.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-accent/30"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {getAssetIcon(child.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Child</div>
                      <div className="truncate text-sm font-medium text-foreground">{child.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
