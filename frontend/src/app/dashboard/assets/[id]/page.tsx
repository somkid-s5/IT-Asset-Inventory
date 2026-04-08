'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  ChevronRight,
  Copy,
  Database,
  Eye,
  EyeOff,
  FolderTree,
  Globe,
  Hash,
  HardDrive,
  LaptopMinimal,
  LoaderCircle,
  MapPin,
  Network,
  Shield,
  Waypoints,
} from 'lucide-react';
import { toast } from 'sonner';

type AssetType = 'SERVER' | 'STORAGE' | 'SWITCH' | 'SP' | 'NETWORK';
type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';

interface AssetCredential {
  id: string;
  username: string;
  password?: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
  lastChangedDate?: string | null;
}

interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
  nodeLabel?: string | null;
  manageType?: string | null;
  version?: string | null;
}

interface Asset {
  id: string;
  assetId?: string | null;
  name: string;
  type: AssetType;
  status?: AssetStatus | null;
  updatedAt?: string;
  ipAllocations?: AssetIpAllocation[];
  rack?: string | null;
  location?: string | null;
  manageType?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  credentials?: AssetCredential[];
  customMetadata?: Record<string, unknown> | null;
  parentId?: string | null;
  parent?: { id: string; name: string; type: AssetType } | null;
  children?: { id: string; name: string; type: AssetType }[];
}

interface AccessRow {
  key: string;
  nodeLabel: string;
  label: string;
  addresses: string[];
  methods: string[];
  version?: string;
  credentials: AssetCredential[];
}

function getAssetIcon(type: AssetType, className = 'h-5 w-5') {
  switch (type) {
    case 'STORAGE':
      return <Database className={className} />;
    case 'SWITCH':
      return <Shield className={className} />;
    case 'SP':
      return <LaptopMinimal className={className} />;
    case 'NETWORK':
      return <Network className={className} />;
    default:
      return <HardDrive className={className} />;
  }
}

function formatExactDateTime(value?: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractMethods(...values: Array<string | null | undefined>) {
  const tokens = new Set<string>();
  const sources = values
    .filter(Boolean)
    .join(',')
    .split(/[,\s/|]+/)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);

  sources.forEach((token) => {
    if (['WEB', 'HTTPS', 'HTTP', 'SSH', 'API', 'CLI', 'SNMP', 'CONSOLE'].includes(token)) {
      tokens.add(token === 'HTTPS' || token === 'HTTP' ? 'WEB' : token);
    }
  });

  return Array.from(tokens);
}

function getStatusPresentation(status?: AssetStatus | null) {
  switch (status) {
    case 'INACTIVE':
      return { label: 'ไม่ใช้งาน', className: 'border-border bg-muted text-muted-foreground' };
    case 'MAINTENANCE':
      return { label: 'บำรุงรักษา', className: 'border-warning/30 bg-warning/10 text-warning' };
    case 'RETIRED':
      return { label: 'เลิกใช้งาน', className: 'border-destructive/30 bg-destructive/10 text-destructive' };
    default:
      return { label: 'ออนไลน์', className: 'border-success/30 bg-success/10 text-success' };
  }
}

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadAsset(id: string) {
      try {
        const response = await api.get<Asset>(`/assets/${id}`);
        setAsset(response.data);
      } catch {
        toast.error('ไม่สามารถโหลดรายละเอียดสินทรัพย์ได้');
        router.push('/dashboard/assets');
      } finally {
        setLoading(false);
      }
    }

    if (typeof params.id === 'string') {
      void loadAsset(params.id);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (!asset) {
      return;
    }

    setHeader({
      title: asset.name,
      breadcrumbs: [
        { label: 'พื้นที่ทำงาน', href: '/dashboard' },
        { label: 'สินทรัพย์', href: '/dashboard/assets' },
        { label: asset.name },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [asset, setHeader]);

  const accessRows = useMemo<AccessRow[]>(() => {
    if (!asset) {
      return [];
    }

    const groups = new Map<string, AccessRow>();

    (asset.ipAllocations ?? []).forEach((ip) => {
      const nodeLabel = ip.nodeLabel?.trim() || 'Primary';
      const label = ip.type?.trim() || 'Primary';
      const key = `${nodeLabel.toLowerCase()}::${label.toLowerCase()}`;
      const existing = groups.get(key) ?? {
        key,
        nodeLabel,
        label,
        addresses: [],
        methods: extractMethods(ip.manageType, asset.manageType),
        version: ip.version?.trim() || undefined,
        credentials: [],
      };

      existing.addresses.push(ip.address);
      existing.methods = existing.methods.length > 0 ? existing.methods : extractMethods(ip.manageType, asset.manageType);
      existing.version = existing.version || ip.version?.trim() || undefined;
      groups.set(key, existing);
    });

    (asset.credentials ?? []).forEach((credential) => {
      const nodeLabel = credential.nodeLabel?.trim() || 'Primary';
      const label = credential.type?.trim() || 'Primary';
      const key = `${nodeLabel.toLowerCase()}::${label.toLowerCase()}`;
      const existing = groups.get(key) ?? {
        key,
        nodeLabel,
        label,
        addresses: [],
        methods: extractMethods(credential.manageType, asset.manageType),
        version: credential.version?.trim() || undefined,
        credentials: [],
      };

      existing.credentials.push(credential);
      existing.methods =
        existing.methods.length > 0 ? existing.methods : extractMethods(credential.manageType, asset.manageType);
      existing.version = existing.version || credential.version?.trim() || undefined;
      groups.set(key, existing);
    });

    return Array.from(groups.values())
      .map((row) => ({
        ...row,
        addresses: Array.from(new Set(row.addresses)),
      }))
      .sort((left, right) => {
        const nodeCompare = left.nodeLabel.localeCompare(right.nodeLabel);
        if (nodeCompare !== 0) {
          return nodeCompare;
        }

        return left.label.localeCompare(right.label);
      });
  }, [asset]);

  const groupedNodes = useMemo(() => {
    return accessRows.reduce<Array<{ nodeLabel: string; rows: AccessRow[] }>>((result, row) => {
      const existing = result.find((item) => item.nodeLabel === row.nodeLabel);
      if (existing) {
        existing.rows.push(row);
        return result;
      }

      result.push({ nodeLabel: row.nodeLabel, rows: [row] });
      return result;
    }, []);
  }, [accessRows]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-zinc-500">
        <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-zinc-200" />
        <p className="text-sm">กำลังโหลดรายละเอียดสินทรัพย์...</p>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  const status = getStatusPresentation(asset.status);
  const properties = [
    { label: 'ประเภท', value: asset.type, icon: <Boxes className="h-4 w-4" /> },
    { label: 'สถานที่', value: asset.location || '--', icon: <MapPin className="h-4 w-4" /> },
    { label: 'แร็ค', value: asset.rack || '--', icon: <Waypoints className="h-4 w-4" /> },
    { label: 'หมายเลขซีเรียล', value: asset.sn || '--', icon: <Hash className="h-4 w-4" /> },
    { label: 'อัปเดตเมื่อ', value: formatExactDateTime(asset.updatedAt), icon: <CalendarClock className="h-4 w-4" /> },
  ];

  return (
    <div className="workspace-page">
      <button
        onClick={() => router.push('/dashboard/assets')}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับไปหน้าสินทรัพย์
      </button>

      <section className="workspace-hero">
        <div className="flex flex-col gap-4">
          <div className="page-breadcrumb">
            <span>พื้นที่ทำงาน</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>โครงสร้างพื้นฐาน</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>สินทรัพย์</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>{asset.name}</span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="icon-chip h-11 w-11 shrink-0 text-foreground">
                  {getAssetIcon(asset.type, 'h-5 w-5')}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate font-display text-xl font-semibold uppercase tracking-[0.06em] text-foreground">{asset.name}</h1>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current opacity-90" />
                      {status.label}
                    </span>
                    {asset.assetId && (
                      <span className="rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {asset.assetId}
                      </span>
                    )}
                  </div>

                  <p className="text-[12px] text-muted-foreground">{asset.brandModel || 'ไม่ระบุแพลตฟอร์ม'}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="brand-chip">อินเทอร์เฟซ <span className="font-medium normal-case tracking-normal text-foreground">{accessRows.length}</span></div>
              <div className="brand-chip">IP <span className="font-medium normal-case tracking-normal text-foreground">{asset.ipAllocations?.length ?? 0}</span></div>
              <div className="brand-chip">ข้อมูลเข้าสู่ระบบ <span className="font-medium normal-case tracking-normal text-foreground">{asset.credentials?.length ?? 0}</span></div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">รายละเอียดสินทรัพย์</h2>
          </div>

          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {properties.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5">
                <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
                <div className="space-y-0.5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold text-foreground">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="surface-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="icon-chip h-8 w-8 p-0 text-foreground">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-base font-semibold tracking-[-0.03em] text-foreground">อินเทอร์เฟซการเข้าถึง</h2>
            </div>

            <div className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {accessRows.length} อินเทอร์เฟซ
            </div>
          </div>

          <div className="table-shell">
            {accessRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">ไม่มีที่อยู่ IP หรือข้อมูลเข้าสู่ระบบสำหรับสินทรัพย์นี้</div>
            ) : (
              <div className="divide-y divide-border">
                {groupedNodes.map((node) => (
                  <div key={node.nodeLabel}>
                    {node.nodeLabel !== 'Primary' && (
                      <div className="border-b border-border bg-background/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                        {node.nodeLabel}
                      </div>
                    )}

                    <div className="hidden grid-cols-[1.1fr_1fr_0.75fr_1.55fr] gap-3 border-b border-border/70 bg-background/45 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
                      <div>ประเภทอินเทอร์เฟซ</div>
                      <div>ที่อยู่ IP</div>
                      <div>เข้าถึงผ่าน</div>
                      <div>บัญชี</div>
                    </div>

                    {node.rows.map((row) => (
                      <div key={row.key} className="grid gap-3 px-4 py-3 transition-colors hover:bg-accent/60 md:grid-cols-[1.1fr_1fr_0.75fr_1.55fr]">
                        <div className="space-y-1.5">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:hidden">ประเภทอินเทอร์เฟซ</div>
                          <div className="text-sm font-semibold text-foreground">{row.label}</div>
                          <div className="text-xs text-muted-foreground">{row.version || '--'}</div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:hidden">ที่อยู่ IP</div>
                          {row.addresses.length > 0 ? (
                            <div className="space-y-1.5">
                              {row.addresses.map((address) => (
                                <button
                                  key={address}
                                  onClick={() => {
                                    void navigator.clipboard.writeText(address);
                                    toast.success('คัดลอก IP แล้ว');
                                  }}
                                  className="flex items-center gap-1.5 font-mono text-sm text-foreground transition-colors hover:text-foreground/80"
                                >
                                  <Globe className="h-3 w-3 text-muted-foreground" />
                                  {address}
                                  <Copy className="h-3 w-3 text-muted-foreground/70" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">--</div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:hidden">เข้าถึงผ่าน</div>
                          <div className="flex flex-wrap gap-2">
                            {(row.methods.length > 0 ? row.methods : ['DIRECT']).map((method) => (
                              <span
                                key={`${row.key}-${method}`}
                                className="rounded-full border border-border/70 bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:hidden">บัญชี</div>
                          {row.credentials.length > 0 ? (
                            row.credentials.map((credential) => {
                              const visible = revealed.has(credential.id);

                              return (
                                <div key={`${credential.id}-account`} className="flex items-center gap-2 py-1">
                                  <div className="min-w-0 w-[112px] shrink-0 font-mono text-sm text-foreground">
                                    {credential.username}
                                  </div>
                                  <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-card/70 px-2.5 py-1.5 font-mono text-xs text-foreground">
                                    {visible ? credential.password || '--' : '************'}
                                  </div>
                                  <button
                                    onClick={() =>
                                      setRevealed((current) => {
                                        const next = new Set(current);
                                        if (next.has(credential.id)) {
                                          next.delete(credential.id);
                                        } else {
                                          next.add(credential.id);
                                        }
                                        return next;
                                      })
                                    }
                                    className="rounded-xl border border-border/70 bg-card/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                                  >
                                    {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      void navigator.clipboard.writeText(credential.password || '');
                                      toast.success('คัดลอกรหัสผ่านแล้ว');
                                    }}
                                    className="rounded-xl border border-border/70 bg-card/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-muted-foreground">--</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(asset.parent || (asset.children?.length ?? 0) > 0) && (
          <div className="surface-panel p-4">
            <div className="mb-3 flex items-center gap-2">
              <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">ลำดับชั้น</h3>
            </div>

            <div className="space-y-2">
              {asset.parent && (
                <button
                  onClick={() => router.push(`/dashboard/assets/${asset.parent?.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                    {getAssetIcon(asset.parent.type, 'h-4 w-4')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">ต้นทาง</div>
                    <div className="truncate text-sm font-semibold text-foreground">{asset.parent.name}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {asset.children?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/dashboard/assets/${child.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground">
                    {getAssetIcon(child.type, 'h-4 w-4')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">ปลายทาง</div>
                    <div className="truncate text-sm font-semibold text-foreground">{child.name}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
