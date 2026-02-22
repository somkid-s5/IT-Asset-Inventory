import { useData } from "@/context/DataContext";
import { assetTypeIcons } from "@/data/mockData";
import { RiskBadge, RiskScoreRing, StatusDot, PatchBadge } from "@/components/StatusBadges";
import { Shield, Server, Bug, AlertTriangle, TrendingUp, Clock } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  detail,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Shield;
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

export default function Dashboard() {
  const { assets, patches } = useData();

  const totalAssets = assets.length;
  const criticalAssets = assets.filter((a) => a.riskLevel === "critical").length;
  const outdatedPatches = patches.filter((p) => p.status === "outdated" || p.status === "eol").length;
  const avgRisk = totalAssets > 0 ? Math.round(assets.reduce((s, a) => s + a.riskScore, 0) / totalAssets) : 0;

  const topRiskAssets = [...assets].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  const recentPatches = patches.filter((p) => p.status !== "current").slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Infrastructure Overview</h1>
        <p className="text-sm text-muted-foreground">Risk posture and asset intelligence</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Assets" value={totalAssets} icon={Server} detail="Across all environments" />
        <StatCard label="Critical Risk" value={criticalAssets} icon={AlertTriangle} detail="Require immediate action" variant="critical" />
        <StatCard label="Pending Patches" value={outdatedPatches} icon={Bug} detail="Outdated or EOL" variant="warning" />
        <StatCard label="Avg Risk Score" value={avgRisk} icon={TrendingUp} detail="Out of 100" variant={avgRisk >= 50 ? "warning" : "success"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Risk Score Ring */}
        <div className="stat-card col-span-2 flex flex-col items-center justify-center gap-4 glow-primary">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Infrastructure Risk Score
          </p>
          <RiskScoreRing score={avgRisk} size={140} />
          <RiskBadge level={avgRisk >= 75 ? "critical" : avgRisk >= 50 ? "high" : avgRisk >= 25 ? "medium" : "low"} />
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
              {topRiskAssets.map((asset) => {
                const Icon = assetTypeIcons[asset.type];
                return (
                  <tr key={asset.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs">{asset.name}</span>
                      </div>
                    </td>
                    <td><StatusDot status={asset.status} /></td>
                    <td><RiskBadge level={asset.riskLevel} /></td>
                    <td className="font-mono text-xs">{asset.riskScore}</td>
                  </tr>
                );
              })}
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
            {recentPatches.map((patch) => (
              <tr key={patch.id}>
                <td className="font-mono text-xs">{patch.assetName}</td>
                <td>{patch.software}</td>
                <td className="font-mono text-xs">{patch.currentVersion}</td>
                <td className="font-mono text-xs">{patch.latestVersion}</td>
                <td><PatchBadge status={patch.status} /></td>
                <td>
                  {patch.cve.length > 0 ? (
                    <span className="font-mono text-xs text-destructive">{patch.cve.length} CVE{patch.cve.length > 1 ? "s" : ""}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
