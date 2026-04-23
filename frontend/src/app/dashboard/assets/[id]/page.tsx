'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Eye,
  EyeOff,
  FolderTree,
  Globe,
  HardDrive,
  LaptopMinimal,
  LoaderCircle,
  MapPin,
  Network,
  Shield,
  Waypoints,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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

function getAssetStyle(type: AssetType) {
  switch (type) {
    case 'SERVER':
      return { icon: <HardDrive className="h-6 w-6" />, bg: 'bg-gradient-to-br from-indigo-500 to-purple-600', label: 'Server' };
    case 'STORAGE':
      return { icon: <Database className="h-6 w-6" />, bg: 'bg-gradient-to-br from-cyan-500 to-blue-600', label: 'Storage' };
    case 'SWITCH':
      return { icon: <Shield className="h-6 w-6" />, bg: 'bg-gradient-to-br from-amber-500 to-orange-600', label: 'Switch' };
    case 'SP':
      return { icon: <LaptopMinimal className="h-6 w-6" />, bg: 'bg-gradient-to-br from-slate-600 to-slate-800', label: 'Service Processor' };
    case 'NETWORK':
      return { icon: <Network className="h-6 w-6" />, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', label: 'Network' };
    default:
      return { icon: <Boxes className="h-6 w-6" />, bg: 'bg-gradient-to-br from-slate-500 to-zinc-600', label: 'Asset' };
  }
}

function extractMethods(...values: Array<string | null | undefined>) {
  const tokens = new Set<string>();
  const sources = values.filter(Boolean).join(',').split(/[,\s/|]+/).map((token) => token.trim().toUpperCase()).filter(Boolean);
  sources.forEach((token) => {
    if (['WEB', 'HTTPS', 'HTTP', 'SSH', 'API', 'CLI', 'SNMP', 'CONSOLE'].includes(token)) {
      tokens.add(token === 'HTTPS' || token === 'HTTP' ? 'WEB' : token);
    }
  });
  return Array.from(tokens);
}

function getStatusBadge(status?: AssetStatus | null) {
  switch (status) {
    case 'INACTIVE': return { label: 'Inactive', class: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground' };
    case 'MAINTENANCE': return { label: 'Maintenance', class: 'border-warning/30 bg-warning/10 text-warning' };
    case 'RETIRED': return { label: 'Retired', class: 'border-destructive/30 bg-destructive/10 text-destructive' };
    default: return { label: 'Online', class: 'border-success/30 bg-success/10 text-success' };
  }
}

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

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
    if (typeof params.id === 'string') void loadAsset(params.id);
  }, [params.id, router]);

  useEffect(() => {
    if (!asset) return;
    setHeader({
      title: asset.name,
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Assets', href: '/dashboard/assets' },
        { label: asset.name },
      ],
    });
    return () => setHeader(null);
  }, [asset, setHeader]);

  const accessRows = useMemo<AccessRow[]>(() => {
    if (!asset) return [];
    const groups = new Map<string, AccessRow>();

    (asset.ipAllocations ?? []).forEach((ip) => {
      const nodeLabel = ip.nodeLabel?.trim() || 'Primary';
      const label = ip.type?.trim() || 'Primary';
      const key = `${nodeLabel.toLowerCase()}::${label.toLowerCase()}`;
      const existing = groups.get(key) ?? { key, nodeLabel, label, addresses: [], methods: extractMethods(ip.manageType, asset.manageType), version: ip.version?.trim() || undefined, credentials: [] };
      existing.addresses.push(ip.address);
      existing.methods = existing.methods.length > 0 ? existing.methods : extractMethods(ip.manageType, asset.manageType);
      existing.version = existing.version || ip.version?.trim() || undefined;
      groups.set(key, existing);
    });

    (asset.credentials ?? []).forEach((credential) => {
      const nodeLabel = credential.nodeLabel?.trim() || 'Primary';
      const label = credential.type?.trim() || 'Primary';
      const key = `${nodeLabel.toLowerCase()}::${label.toLowerCase()}`;
      const existing = groups.get(key) ?? { key, nodeLabel, label, addresses: [], methods: extractMethods(credential.manageType, asset.manageType), version: credential.version?.trim() || undefined, credentials: [] };
      existing.credentials.push(credential);
      existing.methods = existing.methods.length > 0 ? existing.methods : extractMethods(credential.manageType, asset.manageType);
      existing.version = existing.version || credential.version?.trim() || undefined;
      groups.set(key, existing);
    });

    const rows = Array.from(groups.values()).map((row) => ({ ...row, addresses: Array.from(new Set(row.addresses)) }));
    // Set the first row open by default
    if (rows.length > 0 && !openAccordion) {
      setOpenAccordion(rows[0].key);
    }
    return rows;
  }, [asset]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading asset details...</p>
      </div>
    );
  }

  if (!asset) return null;

  const style = getAssetStyle(asset.type);
  const status = getStatusBadge(asset.status);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="workspace-page space-y-6 pt-2">
      <div className="flex justify-between items-center">
        <button onClick={() => router.push("/dashboard/assets")} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Assets
        </button>
      </div>

      {/* Hero Section */}
      <section className="glass-card overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
          
          <div className="flex items-start gap-5 relative z-10">
            <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-xl", style.bg)}>
              {style.icon}
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[400px]">{asset.name}</h1>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider shrink-0", status.class)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                  {status.label}
                </span>
                {asset.assetId && (
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shrink-0">
                    {asset.assetId}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground min-w-0">
                <span className="font-semibold text-foreground/80 truncate max-w-[200px]">{asset.brandModel || 'No Brand/Model'}</span>
                {asset.rack && <span className="flex items-center gap-1.5 shrink-0"><Waypoints className="h-3.5 w-3.5" /> Rack: <span className="text-foreground">{asset.rack}</span></span>}
                {asset.location && <span className="flex items-center gap-1.5 truncate max-w-[150px]"><MapPin className="h-3.5 w-3.5 shrink-0" /> Location: <span className="text-foreground truncate">{asset.location}</span></span>}
                {asset.sn && <span className="flex items-center gap-1.5 shrink-0"><Hash className="h-3.5 w-3.5" /> SN: <span className="font-mono text-xs text-foreground">{asset.sn}</span></span>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end relative z-10">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2">
               <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interfaces</span>
               <span className="text-lg font-bold text-primary">{accessRows.length}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2">
               <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">IPs</span>
               <span className="text-lg font-bold text-info">{asset.ipAllocations?.length ?? 0}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2">
               <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Accounts</span>
               <span className="text-lg font-bold text-amber-500">{asset.credentials?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">Access Interfaces</h2>
          </div>

          {accessRows.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card/30 px-6 py-12 text-center text-sm text-muted-foreground">
              No IP addresses or login information
            </div>
          ) : (
            <div className="space-y-3">
              {accessRows.map((row) => {
                const isOpen = openAccordion === row.key;
                return (
                  <div key={row.key} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:border-primary/30">
                    <button 
                      onClick={() => setOpenAccordion(isOpen ? null : row.key)}
                      className="flex w-full items-center justify-between bg-muted/20 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors", isOpen ? "bg-primary/10 text-primary" : "bg-background border border-border text-muted-foreground")}>
                           <Globe className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{row.nodeLabel !== 'Primary' ? `${row.nodeLabel} - ` : ''}{row.label}</span>
                            {row.version && <Badge variant="outline" className="text-[11px] font-mono bg-background border-border/50">{row.version}</Badge>}
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                             {row.addresses.length} IP(s) · {row.credentials.length} Account(s)
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180 text-primary")} />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-border/50 bg-background/50"
                        >
                          <div className="p-5 grid gap-6 md:grid-cols-2">
                            <div className="space-y-4">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Network Address</div>
                                {row.addresses.length > 0 ? (
                                  <div className="space-y-2">
                                    {row.addresses.map((address) => (
                                      <div key={address} className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-3 py-2">
                                        <span className="font-mono text-sm font-semibold text-foreground">{address}</span>
                                        <button onClick={() => { void navigator.clipboard.writeText(address); toast.success('IP copied'); }} className="text-primary hover:text-primary/80 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md hover:bg-primary/10 transition-colors">Copy</button>
                                      </div>
                                    ))}
                                  </div>
                                ) : <div className="text-sm text-muted-foreground">No IP information</div>}
                              </div>
                              
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Access Method</div>
                                <div className="flex flex-wrap gap-2">
                                  {(row.methods.length > 0 ? row.methods : ['DIRECT']).map((method) => (
                                    <span key={method} className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-bold text-primary uppercase tracking-wider">{method}</span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div>
                               <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Accounts</div>
                               {row.credentials.length > 0 ? (
                                 <div className="space-y-2">
                                   {row.credentials.map((cred) => {
                                     const visible = revealed.has(cred.id);
                                     return (
                                       <div key={cred.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2">
                                         <div className="min-w-0 flex-1">
                                           <div className="font-mono text-xs font-bold text-muted-foreground mb-1">User: <span className="text-foreground">{cred.username}</span></div>
                                           <div className="flex items-center gap-2">
                                             <div className="font-mono text-sm font-bold text-foreground bg-muted px-2 py-1 rounded-md flex-1 min-w-[160px] text-center tabular-nums transition-all">
                                               {visible ? cred.password || '--' : '••••••••••••'}
                                             </div>
                                             <button onClick={() => setRevealed(c => { const n = new Set(c); n.has(cred.id) ? n.delete(cred.id) : n.add(cred.id); return n; })} className="h-7 w-7 flex items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                               {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                             </button>
                                             <button onClick={() => { void navigator.clipboard.writeText(cred.password || ''); toast.success('Password copied'); }} className="h-7 w-7 flex items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                               <Copy className="h-4 w-4" />
                                             </button>
                                           </div>
                                         </div>
                                       </div>
                                     )
                                   })}
                                 </div>
                               ) : <div className="text-sm text-muted-foreground">No account information</div>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-2 px-1">
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">Hierarchy</h2>
          </div>
          <div className="glass-card p-4 space-y-2">
            {!asset.parent && (!asset.children || asset.children.length === 0) ? (
              <div className="text-center py-6 text-sm text-muted-foreground">No relationships with other assets</div>
            ) : (
              <>
                {asset.parent && (
                  <button onClick={() => router.push(`/dashboard/assets/${asset.parent?.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/50 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground group-hover:text-primary">
                      {getAssetStyle(asset.parent.type).icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Host (Parent)</div>
                      <div className="truncate text-sm font-semibold text-foreground">{asset.parent.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}

                {asset.children?.map((child) => (
                  <button key={child.id} onClick={() => router.push(`/dashboard/assets/${child.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/50 group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground group-hover:text-primary">
                      {getAssetStyle(child.type).icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Guest (Child)</div>
                      <div className="truncate text-sm font-semibold text-foreground">{child.name}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
