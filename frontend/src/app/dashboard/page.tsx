"use client";

import { useEffect, useMemo, type ComponentType } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  AppWindow,
  ArrowUpRight,
  Clock3,
  Database,
  Monitor,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
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
import { DashboardSkeleton } from "@/components/Skeletons";
import { containerVariants, itemVariants } from "@/lib/animations";

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
  kind?: "discovery" | "inventory";
};

type DomainQualitySummary = {
  issueCount: number;
  issues: QualityIssue[];
  operationalIssueCount?: number;
  operationalIssues?: QualityIssue[];
};

type DataQualityOverview = {
  applications: DomainQualitySummary;
  assets: DomainQualitySummary;
  databases: DomainQualitySummary;
  vms: DomainQualitySummary;
};

type RecentlyUpdatedItem = {
  id: string;
  kind: "application" | "asset" | "vm" | "database";
  name: string;
  metadata: string;
  updatedAt: string;
  href: string;
};

interface DashboardOverview {
  assets: {
    total: number;
    active: number;
    nonActive: number;
    eolCount: number;
  };
  vm: {
    sources: number;
    healthySources: number;
    connectionFailedSources: number;
    readyToSyncSources: number;
    pendingSetup: number;
    activeInventory: number;
    orphaned: number;
    latestSyncAt: string | null;
  };
  databases: {
    total: number;
    production: number;
    accounts: number;
  };
  applications: {
    total: number;
    active: number;
    archived: number;
  };
  recentlyUpdated: RecentlyUpdatedItem[];
}

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "context" | "operational";
};

function qualityIssueHref(
  domain: keyof DataQualityOverview,
  issue: QualityIssue,
) {
  if (domain === "applications") return `/dashboard/applications/${issue.id}`;
  if (domain === "assets") return `/dashboard/assets/${issue.id}`;
  if (domain === "databases") return `/dashboard/databases/${issue.id}`;
  return issue.kind === "inventory"
    ? `/dashboard/virtual-machines/${issue.id}`
    : `/dashboard/virtual-machines?view=PENDING&q=${encodeURIComponent(issue.name)}`;
}

function buildContextAttention(
  quality: DataQualityOverview | undefined,
): AttentionItem[] {
  if (!quality) return [];
  const labels: Record<keyof DataQualityOverview, string> = {
    applications: "Application",
    assets: "Asset",
    databases: "Database",
    vms: "VM",
  };

  return (Object.keys(labels) as Array<keyof DataQualityOverview>).flatMap(
    (domain) =>
      quality[domain].issues.map((issue) => ({
        id: `context-${domain}-${issue.kind ?? "record"}-${issue.id}`,
        title: `${labels[domain]} · ${issue.name}`,
        detail: issue.issues.join(" · "),
        href: qualityIssueHref(domain, issue),
        tone: "context" as const,
      })),
  );
}

function buildOperationalAttention(
  overview: DashboardOverview | undefined,
  quality: DataQualityOverview | undefined,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const issue of quality?.assets.operationalIssues ?? []) {
    items.push({
      id: `operational-asset-${issue.id}`,
      title: `Asset · ${issue.name}`,
      detail: issue.issues.join(" · "),
      href: `/dashboard/assets/${issue.id}`,
      tone: "operational",
    });
  }
  for (const issue of quality?.vms.operationalIssues ?? []) {
    items.push({
      id: `operational-vm-${issue.id}`,
      title: `VM · ${issue.name}`,
      detail: issue.issues.join(" · "),
      href: `/dashboard/virtual-machines/${issue.id}`,
      tone: "operational",
    });
  }
  if ((overview?.vm.connectionFailedSources ?? 0) > 0) {
    items.push({
      id: "operational-vcenter-source-failure",
      title: "vCenter source sync failure",
      detail: `${overview?.vm.connectionFailedSources ?? 0} source(s) require connection review`,
      href: "/dashboard/virtual-machines/sources",
      tone: "operational",
    });
  }

  return items;
}

export default function DashboardPage() {
  const { setHeader } = usePageHeader();

  const overviewQuery = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const response = await api.get<DashboardOverview>("/dashboard/overview");
      return response.data;
    },
  });

  const qualityQuery = useQuery({
    queryKey: ["dashboard-data-quality"],
    queryFn: async () => {
      const [applications, assets, databases, vms] = await Promise.all([
        api.get<DomainQualitySummary>("/applications/data-quality/summary"),
        api.get<DomainQualitySummary>("/assets/data-quality/summary"),
        api.get<DomainQualitySummary>("/databases/data-quality/summary"),
        api.get<DomainQualitySummary>("/vm/data-quality/summary"),
      ]);
      return {
        applications: applications.data,
        assets: assets.data,
        databases: databases.data,
        vms: vms.data,
      } satisfies DataQualityOverview;
    },
    retry: false,
    refetchOnMount: "always",
  });

  useEffect(() => {
    setHeader({
      title: "IT Asset Overview",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Control Center" },
      ],
    });
  }, [setHeader]);

  const contextAttention = useMemo(
    () => buildContextAttention(qualityQuery.data),
    [qualityQuery.data],
  );
  const operationalAttention = useMemo(
    () => buildOperationalAttention(overviewQuery.data, qualityQuery.data),
    [overviewQuery.data, qualityQuery.data],
  );
  const attentionItems = [...operationalAttention, ...contextAttention];
  const contextIssueCount =
    (qualityQuery.data?.applications.issueCount ?? 0) +
    (qualityQuery.data?.assets.issueCount ?? 0) +
    (qualityQuery.data?.databases.issueCount ?? 0) +
    (qualityQuery.data?.vms.issueCount ?? 0);

  const refreshAll = async () => {
    await Promise.all([overviewQuery.refetch(), qualityQuery.refetch()]);
  };

  if (overviewQuery.isLoading) return <DashboardSkeleton />;

  const data = overviewQuery.data;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Inventory summary
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Current non-archived inventory first, followed by work that needs
            attention.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refreshAll()}
          disabled={overviewQuery.isFetching || qualityQuery.isFetching}
          aria-label="Refresh dashboard"
        >
          <RefreshCw
            className={
              overviewQuery.isFetching || qualityQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          {overviewQuery.isFetching || qualityQuery.isFetching
            ? "Refreshing..."
            : "Refresh dashboard"}
        </Button>
      </section>

      <motion.section
        variants={itemVariants}
        aria-label="Inventory summary counts"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            title="Applications"
            value={data?.applications.active ?? 0}
            subtitle={`${data?.applications.archived ?? 0} archived`}
            icon={AppWindow}
            href="/dashboard/applications"
          />
          <SummaryCard
            title="Physical Assets"
            value={data?.assets.total ?? 0}
            subtitle={`${data?.assets.active ?? 0} active status`}
            icon={Server}
            href="/dashboard/assets"
          />
          <SummaryCard
            title="Virtual Machines"
            value={data?.vm.activeInventory ?? 0}
            subtitle={`${data?.vm.orphaned ?? 0} missing/deleted`}
            icon={Monitor}
            href="/dashboard/virtual-machines"
          />
          <SummaryCard
            title="Databases"
            value={data?.databases.total ?? 0}
            subtitle={`${data?.databases.production ?? 0} PROD`}
            icon={Database}
            href="/dashboard/databases"
          />
          <SummaryCard
            title="Needs Context"
            value={contextIssueCount}
            subtitle="Central Data Quality model"
            icon={ShieldAlert}
            href="/dashboard/data-quality"
          />
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        aria-labelledby="needs-attention-title"
      >
        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="border-b border-border/60 bg-muted/25 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle
                  id="needs-attention-title"
                  className="flex items-center gap-2 text-base"
                >
                  <ShieldAlert className="h-4 w-4 text-warning" />
                  Needs Attention
                </CardTitle>
                <CardDescription>
                  Missing context and operational exceptions are shown
                  separately but resolved from here.
                </CardDescription>
              </div>
              <Link
                href="/dashboard/data-quality"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open Data Quality
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {qualityQuery.isError ? (
              <div className="flex items-start gap-3 p-5 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Data Quality could not be loaded. Refresh the dashboard to
                retry.
              </div>
            ) : attentionItems.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No active inventory attention items.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {attentionItems.slice(0, 10).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-start gap-3 p-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.tone === "operational"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {item.tone === "operational" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <ShieldAlert className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.title}
                        </p>
                        <Badge
                          variant={
                            item.tone === "operational"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {item.tone === "operational"
                            ? "Operational"
                            : "Needs Context"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </Link>
                ))}
                {attentionItems.length > 10 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {attentionItems.length - 10} more item(s) are available in
                    Data Quality or the relevant inventory view.
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        variants={itemVariants}
        aria-labelledby="recently-updated-title"
      >
        <Card className="gap-0 overflow-hidden p-0">
          <CardHeader className="border-b border-border/60 bg-muted/25 p-5">
            <CardTitle
              id="recently-updated-title"
              className="flex items-center gap-2 text-base"
            >
              <Clock3 className="h-4 w-4 text-primary" />
              Recently Updated
            </CardTitle>
            <CardDescription>
              Latest changes across active Applications and Inventory.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 p-0">
            {(data?.recentlyUpdated ?? []).length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No recent inventory updates.
              </div>
            ) : (
              data?.recentlyUpdated.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  className="group flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.metadata} ·{" "}
                      {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title}: ${value.toLocaleString()}`}
      className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-0 rounded-2xl border border-border/60 p-0 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/15">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-foreground">
            {value.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
