'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { RiskBadge, RiskScoreRing, StatusDot, PatchBadge } from "@/components/StatusBadges";
import { ArrowLeft, Key, Eye, EyeOff, Shield, Server, Monitor, Database, AppWindow, Clock, Tag, Activity } from "lucide-react";
import { toast } from 'sonner';

interface PatchInfo {
    id: string;
    software?: string;
    currentVersion: string;
    latestVersion: string;
    status?: string;
    cve?: string[];
    eolDate: string;
    lastPatchedDate: string;
}

interface Credential {
    id: string;
    username: string;
    lastChangedDate: string;
    label?: string;
    type?: string;
    purpose?: string;
    expiresAt?: string;
}

interface Asset {
    id: string;
    name: string;
    type: string;
    ipAllocations?: { address: string, type?: string }[];
    osVersion: string;
    status: string;
    department: string;
    owner?: string;
    tags?: string[];
    riskScore?: number;
    riskLevel?: 'Critical' | 'High' | 'Medium' | 'Low';
    patchInfo?: PatchInfo[];
    credentials?: Credential[];
    parentId?: string | null;
    parent?: Asset;
    children?: Asset[];
}

const getAssetIcon = (type: string, className?: string) => {
    switch (type) {
        case 'SERVER': return <Server className={className || "h-5 w-5 text-muted-foreground"} />;
        case 'VM': return <Monitor className={className || "h-5 w-5 text-muted-foreground"} />;
        case 'DB': return <Database className={className || "h-5 w-5 text-muted-foreground"} />;
        case 'APP': return <AppWindow className={className || "h-5 w-5 text-muted-foreground"} />;
        default: return <Server className={className || "h-5 w-5 text-muted-foreground"} />;
    }
}

const calculateRiskLevel = (score: number) => {
    if (score >= 90) return 'Critical';
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
};

export default function AssetDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState<Set<string>>(new Set());
    const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (params.id) {
            fetchAsset(params.id as string);
        }
    }, [params.id]);

    const fetchAsset = async (id: string) => {
        try {
            const response = await api.get(`/assets/${id}`);
            const data = response.data;

            // Mock some data specifically to match demoapp 
            // Since our backend doesn't explicitly have the full Lovable schema structure
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const score = (hash % 60) + 40;

            setAsset({
                ...data,
                tags: data.department ? [data.department, 'production', data.type.toLowerCase()] : ['production'],
                riskScore: score,
                riskLevel: calculateRiskLevel(score),
                owner: data.owner || 'Unassigned',
                patchInfo: data.patchInfo?.map((p: any) => ({
                    ...p,
                    software: p.software || `${data.osVersion.split(' ')[0]} Core`,
                    status: p.currentVersion === p.latestVersion ? "current" : "outdated",
                    cve: p.currentVersion !== p.latestVersion ? ["CVE-2024-XXXX"] : []
                })) || [],
                credentials: data.credentials?.map((c: any) => ({
                    ...c,
                    label: c.label || `${c.username} Account`,
                    type: c.type || 'ssh',
                    purpose: c.purpose || 'Maintenance',
                    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
                })) || []
            });
        } catch (error) {
            toast.error('Failed to load asset details');
            router.push('/dashboard/assets');
        } finally {
            setLoading(false);
        }
    };

    const togglePassword = async (credentialId: string) => {
        if (revealed.has(credentialId)) {
            setRevealed(prev => {
                const next = new Set(prev);
                next.delete(credentialId);
                return next;
            });
            return;
        }

        setLoadingPasswords(prev => ({ ...prev, [credentialId]: true }));
        try {
            await api.post(`/credentials/${credentialId}/reveal`);
            setRevealed(prev => {
                const next = new Set(prev);
                next.add(credentialId);
                return next;
            });
            toast.success('Password revealed');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reveal password');
        } finally {
            setLoadingPasswords(prev => ({ ...prev, [credentialId]: false }));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
                <Activity className="w-8 h-8 animate-spin text-primary mb-4" />
                <p>Loading asset details...</p>
            </div>
        );
    }

    if (!asset) return null;

    const linkedCreds = asset.credentials || [];
    const assetPatches = asset.patchInfo || [];

    const typeColors: Record<string, string> = {
        ssh: "bg-primary/10 text-primary border border-primary/20",
        rdp: "bg-muted text-muted-foreground border border-border",
        api: "bg-muted text-muted-foreground border border-border",
        database: "bg-primary/10 text-primary border border-primary/20",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => router.push('/dashboard/assets')}
                    className="mt-1 rounded-md border border-border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        {getAssetIcon(asset.type, "h-5 w-5 text-muted-foreground")}
                        <h1 className="text-xl font-semibold font-mono">{asset.name}</h1>
                        <StatusDot status={asset.status.toLowerCase() === 'active' ? 'online' : 'offline'} />
                        <span className="text-sm capitalize text-muted-foreground">{asset.status.toLowerCase()}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground capitalize">{asset.type} • {asset.owner}</p>
                </div>
                <RiskScoreRing score={asset.riskScore || 0} size={64} />
            </div>

            {/* Info Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="stat-card">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Details</p>
                    <div className="space-y-2 text-xs">
                        {asset.ipAllocations && asset.ipAllocations.length > 0 && (
                            <div className="flex flex-col gap-2">
                                {asset.ipAllocations.map((ip, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span className="text-muted-foreground">IP Address {ip.type !== 'Primary' && `(${ip.type})`}</span>
                                        <span className="font-mono">{ip.address}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {asset.osVersion && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">OS</span>
                                <span>{asset.osVersion}</span>
                            </div>
                        )}
                        {asset.parent && (
                            <div className="flex justify-between items-center group cursor-pointer" onClick={() => router.push(`/dashboard/assets/${asset.parent!.id}`)}>
                                <span className="text-muted-foreground">Hosted On</span>
                                <span className="font-mono text-primary group-hover:underline">{asset.parent.name}</span>
                            </div>
                        )}
                        {asset.children && asset.children.length > 0 && (
                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border">
                                <span className="text-muted-foreground">Hosts ({asset.children.length})</span>
                                <div className="space-y-1">
                                    {asset.children.map(child => (
                                        <div key={child.id} className="flex justify-between items-center group cursor-pointer text-xs" onClick={() => router.push(`/dashboard/assets/${child.id}`)}>
                                            <span className="font-mono text-primary group-hover:underline truncate max-w-[120px]">{child.name}</span>
                                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-accent">{child.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Risk Level</span>
                            <RiskBadge level={asset.riskLevel || 'Low'} />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Scan</span>
                            <span>{new Date().toLocaleString()} (Mocked)</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                        {asset.tags?.map((tag) => (
                            <span key={tag} className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="stat-card">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Summary</p>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Credentials</span>
                            <span className="font-mono">{linkedCreds.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Patches</span>
                            <span className="font-mono">{assetPatches.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Outdated</span>
                            <span className="font-mono text-warning">{assetPatches.filter(p => p.status !== "current").length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Credentials Section */}
            <div className="stat-card">
                <div className="mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Linked Credentials ({linkedCreds.length})
                    </p>
                </div>

                {linkedCreds.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No credentials linked to this asset</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {linkedCreds.map((cred) => {
                            const isRevealed = revealed.has(cred.id);
                            const isExpiring =
                                cred.expiresAt && new Date(cred.expiresAt) < new Date(Date.now() + 30 * 86400000);

                            return (
                                <div
                                    key={cred.id}
                                    className={`rounded-lg border border-border bg-background p-4 space-y-2 ${isExpiring ? "risk-glow-medium" : ""}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Key className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-sm font-medium">{cred.label}</span>
                                        </div>
                                        <span className={`status-badge ${typeColors[cred.type || 'ssh']}`}>
                                            {(cred.type || 'ssh').toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Purpose</span>
                                            <span className="font-medium text-primary">{cred.purpose}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Username</span>
                                            <span className="font-mono">{cred.username}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Password</span>
                                            <div className="flex items-center gap-2 h-6">
                                                <span className="font-mono">
                                                    {isRevealed ? "s3cur3P@ss!" : "••••••••••"}
                                                </span>
                                                <button
                                                    onClick={() => togglePassword(cred.id)}
                                                    disabled={loadingPasswords[cred.id]}
                                                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                                >
                                                    {loadingPasswords[cred.id] ? (
                                                        <Activity className="h-3 w-3 animate-spin" />
                                                    ) : isRevealed ? (
                                                        <EyeOff className="h-3 w-3" />
                                                    ) : (
                                                        <Eye className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last Rotated</span>
                                            <span>{new Date(cred.lastChangedDate).toLocaleDateString()}</span>
                                        </div>
                                        {cred.expiresAt && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Expires</span>
                                                <span className={isExpiring ? "text-warning font-medium" : ""}>
                                                    {new Date(cred.expiresAt).toLocaleDateString()}
                                                    {isExpiring && " ⚠"}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Patches Section */}
            {assetPatches.length > 0 && (
                <div className="stat-card">
                    <div className="mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Patch Status ({assetPatches.length})
                        </p>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Software</th>
                                <th>Current</th>
                                <th>Latest</th>
                                <th>Status</th>
                                <th>CVEs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assetPatches.map((patch) => (
                                <tr key={patch.id}>
                                    <td className="text-sm">{patch.software}</td>
                                    <td className="font-mono text-xs">{patch.currentVersion}</td>
                                    <td className="font-mono text-xs">{patch.latestVersion}</td>
                                    <td><PatchBadge status={(patch.status || 'current') as 'current' | 'outdated' | 'eol' | 'unknown'} /></td>
                                    <td>
                                        {patch.cve && patch.cve.length > 0 ? (
                                            <span className="font-mono text-xs text-destructive">{patch.cve.join(", ")}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

