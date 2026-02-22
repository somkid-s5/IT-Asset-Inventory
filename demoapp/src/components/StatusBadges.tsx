import { cn } from "@/lib/utils";
import type { RiskLevel, PatchStatus } from "@/data/mockData";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    critical: "bg-critical/15 text-critical border-critical/30",
    high: "bg-high/15 text-high border-high/30",
    medium: "bg-medium/15 text-medium border-medium/30",
    low: "bg-low/15 text-low border-low/30",
  };

  return (
    <span className={cn("status-badge border", styles[level])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-critical": level === "critical",
        "bg-high": level === "high",
        "bg-medium": level === "medium",
        "bg-low": level === "low",
      })} />
      {level}
    </span>
  );
}

export function PatchBadge({ status }: { status: PatchStatus }) {
  const styles: Record<PatchStatus, string> = {
    eol: "bg-critical/15 text-critical border-critical/30",
    outdated: "bg-medium/15 text-medium border-medium/30",
    current: "bg-low/15 text-low border-low/30",
    unknown: "bg-muted text-muted-foreground border-border",
  };

  const labels: Record<PatchStatus, string> = {
    eol: "EOL",
    outdated: "Outdated",
    current: "Current",
    unknown: "Unknown",
  };

  return (
    <span className={cn("status-badge border", styles[status])}>
      {labels[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: "online" | "offline" | "degraded" }) {
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full", {
      "bg-success": status === "online",
      "bg-destructive": status === "offline",
      "bg-warning": status === "degraded",
    })} />
  );
}

export function RiskScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 75 ? "var(--critical)" : score >= 50 ? "var(--high)" : score >= 25 ? "var(--medium)" : "var(--low)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`hsl(${color})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold">{score}</span>
    </div>
  );
}
