"use client";

import { useEffect, type ComponentType } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  AppWindow,
  CheckCircle2,
  Database,
  Monitor,
  RefreshCw,
  Server,
} from "lucide-react";
import api from "@/services/api";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/Skeletons";

type QualityReason = {
  code: string;
  label: string;
  guidance: string;
  category: "context" | "operational";
};

type QualityIssue = {
  id: string;
  name: string;
  issues: string[];
  reasons?: QualityReason[];
  assetId?: string | null;
  type?: string;
  engine?: string;
  kind?: string;
};

type QualitySummary = {
  label: string;
  total: number;
  complete?: number;
  issues: QualityIssue[];
  operationalIssues?: QualityIssue[];
  icon: ComponentType<{ className?: string }>;
  href: (issue: QualityIssue) => string;
};

export default function DataQualityPage() {
  const { setHeader } = usePageHeader();

  useEffect(() => {
    setHeader({
      title: "Data Quality",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Data Quality" },
      ],
    });
  }, [setHeader]);

  const qualityQuery = useQuery({
    queryKey: ["data-quality-overview"],
    queryFn: async () => {
      const [applications, assets, databases, vms] = await Promise.all([
        api.get("/applications/data-quality/summary"),
        api.get("/assets/data-quality/summary"),
        api.get("/databases/data-quality/summary"),
        api.get("/vm/data-quality/summary"),
      ]);

      return [
        {
          label: "Applications",
          total: applications.data.totalApplications,
          complete: applications.data.completeApplications,
          issues: applications.data.issues,
          operationalIssues: applications.data.operationalIssues ?? [],
          icon: AppWindow,
          href: (issue: QualityIssue) => `/dashboard/applications/${issue.id}`,
        },
        {
          label: "Assets",
          total: assets.data.totalAssets,
          complete: assets.data.completeAssets,
          issues: assets.data.issues,
          operationalIssues: assets.data.operationalIssues ?? [],
          icon: Server,
          href: (issue: QualityIssue) => `/dashboard/assets/${issue.id}`,
        },
        {
          label: "Databases",
          total: databases.data.totalDatabases,
          complete: databases.data.completeDatabases,
          issues: databases.data.issues,
          operationalIssues: databases.data.operationalIssues ?? [],
          icon: Database,
          href: (issue: QualityIssue) => `/dashboard/databases/${issue.id}`,
        },
        {
          label: "Virtual Machines",
          total: vms.data.totalVms,
          issues: vms.data.issues,
          operationalIssues: vms.data.operationalIssues ?? [],
          icon: Monitor,
          href: (issue: QualityIssue) =>
            issue.kind === "inventory"
              ? `/dashboard/virtual-machines/${issue.id}`
              : `/dashboard/virtual-machines?view=PENDING&q=${encodeURIComponent(issue.name)}`,
        },
      ] satisfies QualitySummary[];
    },
  });

  if (qualityQuery.isLoading) return <DashboardSkeleton />;

  const summaries: QualitySummary[] = qualityQuery.data ?? [];
  const totalRecords = summaries.reduce(
    (sum, summary) => sum + summary.total,
    0,
  );
  const totalIssues = summaries.reduce(
    (sum, summary) => sum + summary.issues.length,
    0,
  );
  const operationalItems = summaries.flatMap((summary) =>
    (summary.operationalIssues ?? []).map((issue) => ({
      summary,
      issue,
    })),
  );
  const readyRecords = summaries.reduce(
    (sum, summary) =>
      sum +
      (summary.complete ?? Math.max(summary.total - summary.issues.length, 0)),
    0,
  );
  const completionRate =
    totalRecords > 0 ? Math.round((readyRecords / totalRecords) * 100) : 100;

  return (
    <div className="workspace-page space-y-6">
      <section className="workspace-hero flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Records that need attention
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review missing ownership, lifecycle, connection, and recovery
            details before the inventory is used for operational decisions.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void qualityQuery.refetch()}
          disabled={qualityQuery.isFetching}
        >
          <RefreshCw
            className={qualityQuery.isFetching ? "animate-spin" : ""}
          />
          {qualityQuery.isFetching ? "Refreshing..." : "Refresh quality checks"}
        </Button>
      </section>

      {qualityQuery.isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            Quality checks could not be loaded. Confirm the API is available,
            then refresh this page.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Inventory readiness"
          value={`${completionRate}%`}
          detail={`${readyRecords} of ${totalRecords} records ready`}
          tone="success"
        />
        <MetricCard
          label="Needs context"
          value={totalIssues.toLocaleString()}
          detail="Records with missing business or operational context"
          tone={totalIssues > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Operational attention"
          value={operationalItems.length.toLocaleString()}
          detail="Lifecycle or support exceptions, separate from completeness"
          tone={operationalItems.length > 0 ? "warning" : "success"}
        />
        {summaries.slice(0, 2).map((summary) => (
          <MetricCard
            key={summary.label}
            label={`${summary.label} issues`}
            value={summary.issues.length.toLocaleString()}
            detail={`${summary.total} total records`}
            tone={summary.issues.length > 0 ? "warning" : "success"}
          />
        ))}
      </div>

      {operationalItems.length > 0 ? (
        <Card className="gap-0 overflow-hidden p-0 border-destructive/20">
          <CardHeader className="border-b border-border/60 bg-destructive/5 p-5">
            <CardTitle
              role="heading"
              aria-level={2}
              className="flex items-center gap-2 text-base"
            >
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Operational attention
            </CardTitle>
            <CardDescription>
              Lifecycle and support exceptions are actionable, but they do not
              reduce Data Quality completeness.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 p-0">
            {operationalItems.map(({ summary, issue }) => (
              <Link
                key={`operational-${summary.label}-${issue.id}`}
                href={summary.href(issue)}
                className="group block p-4 transition-colors hover:bg-muted/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {issue.name}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {summary.label}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-primary">
                    Review
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {issue.issues.map((item) => {
                    const reason = issue.reasons?.find(
                      (candidate) => candidate.label === item,
                    );
                    return (
                      <Badge
                        key={item}
                        variant="outline"
                        title={reason?.guidance}
                        className="border-destructive/30 bg-destructive/5 text-[10px] text-destructive"
                      >
                        {item}
                      </Badge>
                    );
                  })}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {totalIssues === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Inventory quality checks are clear"
          description="No missing required details were found across applications, assets, databases, or virtual machines."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {summaries.map((summary) => (
            <QualitySection key={summary.label} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning";
}) {
  return (
    <Card className="gap-0 p-0">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-3 font-mono text-3xl font-bold ${tone === "success" ? "text-success" : "text-warning"}`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function QualitySection({ summary }: { summary: QualitySummary }) {
  const Icon = summary.icon;

  return (
    <Card className="h-fit gap-0 overflow-hidden p-0">
      <CardHeader className="border-b border-border/60 bg-muted/25 p-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {summary.label}
          </CardTitle>
          <Badge variant={summary.issues.length > 0 ? "warning" : "success"}>
            {summary.issues.length} issues
          </Badge>
        </div>
        <CardDescription>{summary.total} records checked</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border/60 p-0">
        {summary.issues.length === 0 ? (
          <div className="flex items-center gap-2 p-5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            No issues found
          </div>
        ) : (
          summary.issues.map((issue) => (
            <Link
              key={`${issue.kind ?? summary.label}-${issue.id}`}
              href={summary.href(issue)}
              className="group block p-4 transition-colors hover:bg-muted/35"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                    {issue.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {issue.assetId ??
                      issue.engine ??
                      issue.type ??
                      issue.kind ??
                      "inventory record"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-primary">
                  Review
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {issue.issues.map((item) => {
                  const reason = issue.reasons?.find(
                    (candidate) => candidate.label === item,
                  );
                  return (
                    <Badge
                      key={item}
                      variant="outline"
                      title={reason?.guidance}
                      className="border-warning/30 bg-warning/5 text-[10px] text-warning"
                    >
                      {item}
                    </Badge>
                  );
                })}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
