'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Shield, Eye, EyeOff, Lock, Search, Key, ChevronRight, Server, AppWindow, Database, Monitor, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Asset {
    id: string;
    name: string;
    type: string;
    ipAllocations?: { address: string }[];
    osVersion?: string; // Added as per instruction, made optional
    status?: string; // Added as per instruction, made optional
    assetId?: string; // Added as per instruction, made optional (seems redundant with 'id' for Asset)
}

interface Credential {
    id: string;
    assetId: string;
    username: string;
    lastChangedDate: string;
    label?: string;
    type?: string;
    target?: string;
    expiresAt?: string;
    assetName?: string; // Added for display purposes
}

const typeColors: Record<string, string> = {
    ssh: "bg-primary/10 text-primary border border-primary/20",
    rdp: "bg-muted text-muted-foreground border border-border",
    api: "bg-muted text-muted-foreground border border-border",
    database: "bg-primary/10 text-primary border border-primary/20",
};

export default function VaultPage() {
    const { user } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: string }>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAssets();
    }, []);

    useEffect(() => {
        if (selectedAsset) {
            fetchCredentials(selectedAsset);
        }
    }, [selectedAsset]);

    const fetchAssets = async () => {
        try {
            const response = await api.get('/assets');
            setAssets(response.data);
            if (response.data.length > 0) {
                setSelectedAsset(response.data[0].id);
            }
        } catch (error) {
            toast.error('Failed to load assets for vault');
        }
    };

    const fetchCredentials = async (assetId: string) => {
        try {
            const response = await api.get(`/credentials/asset/${assetId}`);
            // Mock map data if missing
            const data = response.data.map((c: any) => ({
                ...c,
                label: c.label || `${c.username} Account`,
                assetName: assets.find(a => a.id === assetId)?.name || 'Unknown Asset',
                type: c.type || 'ssh',
                target: c.target || assets.find(a => a.id === assetId)?.ipAllocations?.[0]?.address || 'unknown',
                username: c.username,
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
            }));
            setCredentials(data);
            setRevealedPasswords({}); // Reset revealed passwords when changing assets
        } catch (error) {
            toast.error('Failed to load credentials');
        }
    };

    const togglePassword = async (credentialId: string) => {
        if (revealedPasswords[credentialId]) {
            const newRevealed = { ...revealedPasswords };
            delete newRevealed[credentialId];
            setRevealedPasswords(newRevealed);
            return;
        }

        try {
            const response = await api.get(`/credentials/${credentialId}/reveal`);
            setRevealedPasswords(prev => ({
                ...prev,
                [credentialId]: response.data.password
            }));
            toast.success('Password revealed');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Unauthorized');
        }
    };

    const filteredAssets = assets.filter((asset) =>
    (asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.ipAllocations && asset.ipAllocations.some(ip => ip.address.toLowerCase().includes(searchTerm.toLowerCase()))))
    );

    const getAssetIcon = (type?: string, className?: string) => {
        switch (type) {
            case 'SERVER': return <Server className={className || "h-4 w-4 text-primary"} />;
            case 'VM': return <Monitor className={className || "h-4 w-4 text-purple-500"} />;
            case 'DB': return <Database className={className || "h-4 w-4 text-amber-500"} />;
            case 'APP': return <AppWindow className={className || "h-4 w-4 text-emerald-500"} />;
            default: return <Server className={className || "h-4 w-4 text-muted-foreground"} />;
        }
    }

    const selectedAssetData = assets.find(a => a.id === selectedAsset);

    return (
        <div className="space-y-6 pb-12 h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-xl font-semibold">Credential Vault</h1>
                    <p className="text-sm text-muted-foreground">AES-256 encrypted credential store</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">Vault Sealed</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-2">
                {/* Asset Sidebar */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search targets..."
                                className="w-full bg-background border rounded-lg py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
                        {filteredAssets.length === 0 ? (
                            <div className="text-center p-4 text-sm text-muted-foreground">
                                No assets found.
                            </div>
                        ) : (
                            filteredAssets.map((asset) => (
                                <button
                                    key={asset.id}
                                    onClick={() => setSelectedAsset(asset.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-all group ${selectedAsset === asset.id
                                        ? 'bg-primary/10 border border-primary/20 shadow-sm'
                                        : 'border border-transparent hover:bg-accent'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-md transition-colors ${selectedAsset === asset.id ? 'bg-primary/20' : 'bg-muted group-hover:bg-accent-foreground/10'}`}>
                                        {getAssetIcon(asset.type, selectedAsset === asset.id ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium truncate ${selectedAsset === asset.id ? 'text-primary' : 'text-foreground'}`}>
                                            {asset.name}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono truncate">
                                            {asset.ipAllocations?.[0]?.address || 'unknown-ip'}
                                        </p>
                                    </div>
                                    {selectedAsset === asset.id && (
                                        <ChevronRight size={14} className="text-primary" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content Pane */}
                <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-xl overflow-hidden flex flex-col">
                    {!selectedAsset ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-card border rounded-xl">
                            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4 border">
                                <Key className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">No Target Selected</h3>
                            <p className="text-sm max-w-sm text-center">Select an infrastructure asset from the left panel to securely manage its credentials.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-4">
                            {/* Selected Asset Header */}
                            <div className="p-4 border bg-card rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background rounded-xl border">
                                        {getAssetIcon(selectedAssetData?.type, "h-6 w-6 text-primary")}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            {selectedAssetData?.name}
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground border text-primary">
                                                {selectedAssetData?.type || 'ASSET'}
                                            </span>
                                        </h3>
                                        <span className="text-sm text-muted-foreground font-mono mt-1">
                                            Target: {selectedAssetData?.ipAllocations?.[0]?.address || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-2 bg-background hover:bg-accent border text-sm font-medium rounded-md transition-colors">
                                        Rotate All
                                    </button>
                                    <button className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-2">
                                        <Plus size={16} /> Add Secret
                                    </button>
                                </div>
                            </div>

                            {/* Credentials Grid */}
                            <div className="flex-1 overflow-y-auto w-full">
                                {credentials.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground bg-card border rounded-xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <Shield className="h-8 w-8 opacity-20" />
                                            <p>No credentials provisioned for this asset.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 pb-8">
                                        {credentials.map((cred) => {
                                            const isRevealed = !!revealedPasswords[cred.id];
                                            const isExpiring = cred.expiresAt && new Date(cred.expiresAt) < new Date(Date.now() + 30 * 86400000);

                                            return (
                                                <div
                                                    key={cred.id}
                                                    className={`stat-card ${isExpiring ? "risk-glow-medium" : ""}`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Key className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm font-medium">{cred.label || `${cred.username} (Account)`}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`status-badge ${typeColors[cred.type || 'ssh']}`}>
                                                                {(cred.type || 'ssh').toUpperCase()}
                                                            </span>
                                                            <button className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 space-y-2 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Username</span>
                                                            <span className="font-mono">{cred.username}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Target Address</span>
                                                            <span className="font-mono">{cred.target || selectedAssetData?.ipAllocations?.[0]?.address || '--'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground">Password</span>
                                                            <div className="flex items-center gap-2 h-6">
                                                                <span className="font-mono">
                                                                    {isRevealed ? revealedPasswords[cred.id] : "••••••••••"}
                                                                </span>
                                                                <button
                                                                    onClick={() => togglePassword(cred.id)}
                                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                                >
                                                                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between mt-2 pt-2 border-t">
                                                            <span className="text-muted-foreground">Last Rotated</span>
                                                            <span>{new Date(cred.lastChangedDate || '').toLocaleDateString()}</span>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

