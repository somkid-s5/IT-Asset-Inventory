'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Server, ShieldAlert, Activity, ArrowUpRight, AlertTriangle, TrendingUp, Clock, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { RiskScoreRing, RiskBadge, StatusDot, PatchBadge } from '@/components/StatusBadges';

function StatCard({
    label,
    value,
    icon: Icon,
    detail,
    variant = "default",
}: {
    label: string;
    value: string | number;
    icon: typeof ShieldAlert;
    detail?: string;
    variant?: "default" | "critical" | "warning" | "success";
}) {
    const glowMap = {
        default: "",
        critical: "risk-glow-critical",
        warning: "risk-glow-medium",
        success: "risk-glow-low",
    };

    return (
        <div className={`stat-card animate-slide-in ${glowMap[variant]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-semibold font-mono">{value}</p>
                    {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
                </div>
                <div className="rounded-md bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </div>
        </div>
    );
}

interface DashboardData {
    totalAssets: number;
    activeAssets: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskFactors: {
        eolAssets: number;
        outdatedPatches: number;
        oldCredentials: number;
    };
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setError(null);
                const response = await api.get('/dashboard/overview');
                setData(response.data);
            } catch (err: any) {
                console.error(err);
                setError(err?.response?.data?.message || 'Failed to load dashboard data from server.');
                toast.error('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Loading intelligence data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="h-full w-full flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4 p-8 bg-destructive/10 rounded-lg border border-destructive/20 max-w-md">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                    <h3 className="text-lg font-semibold text-destructive">Data Initialization Failed</h3>
                    <p className="text-sm text-center text-muted-foreground">{error || "No data received from backend."}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    // Gauge Chart Logic
    const riskScore = data.riskLevel === 'CRITICAL' ? 92
        : data.riskLevel === 'HIGH' ? 75
            : data.riskLevel === 'MEDIUM' ? 45
                : 15;

    const gaugeData = [
        { name: 'Score', value: riskScore },
        { name: 'Remaining', value: 100 - riskScore }
    ];

    const gaugeColors = [
        riskScore > 80 ? '#ef4444' : riskScore > 50 ? '#f59e0b' : '#22c55e',
        '#1e293b' // background track
    ];

    // Mock Top Assets
    const topVulnerableAssets = [
        { name: 'db-prod-01', ip: '10.0.1.45', risk: 'Critical', score: 98, type: 'Database' },
        { name: 'web-front-lb', ip: '10.0.2.12', risk: 'High', score: 82, type: 'Server' },
        { name: 'auth-service-vm', ip: '10.0.5.99', risk: 'Medium', score: 55, type: 'VM' },
        { name: 'internal-wiki', ip: '10.0.8.20', risk: 'Low', score: 12, type: 'App' }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold">Infrastructure Overview</h1>
                <p className="text-sm text-muted-foreground">Risk posture and asset intelligence</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Assets" value={data.totalAssets} icon={Server} detail="Across all environments" />
                <StatCard label="Critical Risk" value={data.riskFactors.eolAssets} icon={AlertTriangle} detail="Require immediate action" variant="critical" />
                <StatCard label="Pending Patches" value={data.riskFactors.outdatedPatches} icon={Bug} detail="Outdated or EOL" variant="warning" />
                <StatCard label="Avg Risk Score" value={riskScore} icon={TrendingUp} detail="Out of 100" variant={riskScore >= 50 ? "warning" : "success"} />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                {/* Risk Score Ring */}
                <div className="stat-card col-span-2 flex flex-col items-center justify-center gap-4 glow-primary">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Infrastructure Risk Score
                    </p>
                    <RiskScoreRing score={riskScore} size={140} />
                    <RiskBadge level={riskScore >= 75 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low"} />
                </div>

                {/* Top risk assets */}
                <div className="stat-card col-span-3">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Highest Risk Assets
                    </p>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Status</th>
                                <th>Risk</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topVulnerableAssets.map((asset, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Server className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-mono text-xs">{asset.name}</span>
                                        </div>
                                    </td>
                                    <td><StatusDot status="online" /></td>
                                    <td><RiskBadge level={asset.risk.toLowerCase()} /></td>
                                    <td className="font-mono text-xs">{asset.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pending patches */}
            <div className="stat-card">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Patch Intelligence
                    </p>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Asset</th>
                            <th>Software</th>
                            <th>Current</th>
                            <th>Latest</th>
                            <th>Status</th>
                            <th>CVEs</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="font-mono text-xs">db-prod-01</td>
                            <td>PostgreSQL</td>
                            <td className="font-mono text-xs">14.2</td>
                            <td className="font-mono text-xs">14.9</td>
                            <td><PatchBadge status="outdated" /></td>
                            <td>
                                <span className="font-mono text-xs text-destructive">2 CVEs</span>
                            </td>
                        </tr>
                        <tr>
                            <td className="font-mono text-xs">web-front-lb</td>
                            <td>Nginx</td>
                            <td className="font-mono text-xs">1.18.0</td>
                            <td className="font-mono text-xs">1.24.0</td>
                            <td><PatchBadge status="eol" /></td>
                            <td>
                                <span className="font-mono text-xs text-destructive">1 CVE</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
