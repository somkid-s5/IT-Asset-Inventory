'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { Plus, Search, Server, Database, AppWindow, Monitor, Pencil, Trash2, Filter, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import { RiskBadge, StatusDot } from '@/components/StatusBadges';
import { AssetFormDialog } from '@/components/AssetFormDialog';

interface Asset {
    id: string;
    name: string;
    type: string;
    ipAllocations?: { address: string, type?: string }[];
    osVersion: string;
    status: 'ACTIVE' | 'OFFLINE' | 'DECOMMISSIONED' | 'MAINTENANCE';
    environment?: string; // Phase 10 addition
    location?: string;    // Phase 10 addition
    customMetadata?: Record<string, any>; // Phase 10 flexible metadata
    patchInfo?: {
        eolDate?: string;
    };
    department: string;
    owner?: string;
    tags?: string[];
    parentId?: string | null;
    children?: Asset[];
}

const getAssetRisk = (id: string) => {
    // Generate deterministic mock risk data based on asset ID
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const score = (hash % 60) + 40; // Score between 40 and 99

    if (score >= 90) return { level: 'Critical', score, style: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' };
    if (score >= 70) return { level: 'High', score, style: 'bg-orange-500/10 text-orange-500 border-orange-500/20', dot: 'bg-orange-500' };
    if (score >= 50) return { level: 'Medium', score, style: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dot: 'bg-amber-500' };
    return { level: 'Low', score, style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dot: 'bg-emerald-500' };
};

const TABS = ['All', 'Servers', 'VMs', 'Applications', 'Databases'];

export default function AssetsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | undefined>();

    const toggleRow = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const response = await api.get('/assets');
            setAssets(response.data);
        } catch (error) {
            toast.error('Failed to load IT Assets');
        } finally {
            setLoading(false);
        }
    };

    const filteredAssets = assets.filter((asset) => {
        const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (asset.ipAllocations && asset.ipAllocations.some(ip => ip.address.includes(searchTerm.toLowerCase())));

        let matchesTab = true;
        if (activeTab === 'Servers') matchesTab = asset.type === 'SERVER';
        if (activeTab === 'VMs') matchesTab = asset.type === 'VM';
        if (activeTab === 'Applications') matchesTab = asset.type === 'APP';
        if (activeTab === 'Databases') matchesTab = asset.type === 'DB';

        return matchesSearch && matchesTab;
    });

    const getAssetIcon = (type: string) => {
        const iconProps = { className: "h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" };
        switch (type) {
            case 'SERVER': return <Server {...iconProps} />;
            case 'VM': return <Monitor {...iconProps} />;
            case 'DB': return <Database {...iconProps} />;
            case 'APP': return <AppWindow {...iconProps} />;
            default: return <Server {...iconProps} />;
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-base font-semibold text-foreground">Asset Inventory</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">{assets.length} assets tracked</p>
                </div>
                {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
                    <button
                        onClick={() => { setEditingAsset(undefined); setIsDialogOpen(true); }}
                        className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-sm">
                        <Plus className="h-4 w-4" />
                        Add Asset
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name or IP..."
                        className="h-8 w-64 rounded-lg border border-input bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-0.5 rounded-lg border border-input bg-card p-0.5">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeTab === tab
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-xs text-muted-foreground">
                    Showing {filteredAssets.length} of {assets.length} entries
                </span>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr className="bg-muted/30">
                            <th>Asset</th>
                            <th>Type</th>
                            <th>IP Address</th>
                            <th>OS</th>
                            <th>Status</th>
                            <th>Risk</th>
                            <th>Score</th>
                            <th>Owner</th>
                            <th>Tags</th>
                            <th className="w-20">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        Loading inventory...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                                    No assets found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            (() => {
                                const isFiltering = searchTerm.trim().length > 0 || activeTab !== 'All';
                                const displayAssets = isFiltering ? filteredAssets : filteredAssets.filter(a => !a.parentId);

                                const renderAssetRow = (asset: Asset, depth: number = 0) => {
                                    const risk = getAssetRisk(asset.id);
                                    const hasChildren = asset.children && asset.children.length > 0 && !isFiltering;
                                    const isExpanded = expandedRows.has(asset.id);

                                    return (
                                        <React.Fragment key={asset.id}>
                                            <tr className={`animate-slide-in hover:bg-accent/40 transition-colors group cursor-pointer ${depth > 0 ? 'bg-muted/10' : ''}`} onClick={() => router.push(`/dashboard/assets/${asset.id}`)}>
                                                <td>
                                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                                                        {hasChildren ? (
                                                            <button onClick={(e) => toggleRow(e, asset.id)} className="p-0.5 rounded-sm hover:bg-accent text-muted-foreground mr-1">
                                                                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                            </button>
                                                        ) : (
                                                            <div className="w-5 mr-1 bg-transparent" />
                                                        )}
                                                        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${depth > 0 ? 'bg-background' : 'bg-accent'}`}>
                                                            {getAssetIcon(asset.type)}
                                                        </div>
                                                        <span className="font-mono text-xs font-medium group-hover:text-primary transition-colors">{asset.name}</span>
                                                    </div>
                                                </td>
                                                <td><span className="text-xs text-muted-foreground capitalize">{asset.type.toLowerCase()}</span></td>
                                                <td className="font-mono text-xs text-muted-foreground">{asset.ipAllocations?.[0]?.address || '--'}</td>
                                                <td className="text-xs text-muted-foreground">{asset.osVersion || '--'}</td>
                                                <td>
                                                    <div className="flex items-center gap-1.5">
                                                        <StatusDot status={asset.status.toLowerCase() === 'active' ? 'online' : asset.status.toLowerCase() === 'maintenance' ? 'degraded' : 'offline'} />
                                                        <span className="text-xs capitalize text-foreground">{asset.status.toLowerCase()}</span>
                                                    </div>
                                                </td>
                                                <td><RiskBadge level={risk.level.toLowerCase()} /></td>
                                                <td className="font-mono text-xs font-medium text-foreground">{risk.score}</td>
                                                <td className="text-xs text-muted-foreground">{asset.owner || '--'}</td>
                                                <td>
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">{asset.department || "IT"}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setIsDialogOpen(true); }}
                                                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); }} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {hasChildren && isExpanded && asset.children!
                                                .filter(child => filteredAssets.some(f => f.id === child.id)) // ensuring child isn't globally hidden if we ever do deep filtering later
                                                .map(child => renderAssetRow(child, depth + 1))}
                                        </React.Fragment>
                                    );
                                };

                                return displayAssets.map(asset => renderAssetRow(asset, 0));
                            })()
                        )}
                    </tbody>
                </table>
            </div>

            <AssetFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                assetToEdit={editingAsset}
                onSuccess={fetchAssets}
                availableParents={assets.filter(a => a.type === 'SERVER' || a.type === 'VM')}
            />
        </div>
    );
}
