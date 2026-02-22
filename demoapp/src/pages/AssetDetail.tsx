import { useParams, Link } from "react-router-dom";
import { assetTypeIcons } from "@/data/mockData";
import { useData } from "@/context/DataContext";
import { RiskBadge, RiskScoreRing, StatusDot, PatchBadge } from "@/components/StatusBadges";
import { ArrowLeft, Key, Eye, EyeOff, Shield, Server, Clock, Tag } from "lucide-react";
import { useState } from "react";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const { assets, credentials, assetCredentials, patches } = useData();

  const asset = assets.find((a) => a.id === id);
  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Asset not found</p>
        <Link to="/assets" className="text-sm text-primary hover:underline">← Back to Assets</Link>
      </div>
    );
  }

  const Icon = assetTypeIcons[asset.type];
  const linkedCreds = assetCredentials
    .filter((ac) => ac.assetId === asset.id)
    .map((ac) => ({
      ...ac,
      credential: credentials.find((c) => c.id === ac.credentialId)!,
    }))
    .filter((ac) => ac.credential);

  const assetPatches = patches.filter((p) => p.assetName === asset.name);

  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        <Link
          to="/assets"
          className="mt-1 rounded-md border border-border bg-card p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold font-mono">{asset.name}</h1>
            <StatusDot status={asset.status} />
            <span className="text-sm capitalize text-muted-foreground">{asset.status}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground capitalize">{asset.type} • {asset.owner}</p>
        </div>
        <RiskScoreRing score={asset.riskScore} size={64} />
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Details</p>
          <div className="space-y-2 text-xs">
            {asset.ip && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IP Address</span>
                <span className="font-mono">{asset.ip}</span>
              </div>
            )}
            {asset.os && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">OS</span>
                <span>{asset.os}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Level</span>
              <RiskBadge level={asset.riskLevel} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Scan</span>
              <span>{new Date(asset.lastScan).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {asset.tags.map((tag) => (
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
            {linkedCreds.map(({ credential: cred, purpose }) => {
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
                    <span className={`status-badge ${typeColors[cred.type]}`}>
                      {cred.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purpose</span>
                      <span className="font-medium text-primary">{purpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username</span>
                      <span className="font-mono">{cred.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Password</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {isRevealed ? "s3cur3P@ss!" : "••••••••••"}
                        </span>
                        <button
                          onClick={() => toggle(cred.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Rotated</span>
                      <span>{new Date(cred.lastRotated).toLocaleDateString()}</span>
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
                  <td><PatchBadge status={patch.status} /></td>
                  <td>
                    {patch.cve.length > 0 ? (
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
