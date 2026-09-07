"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Database,
  Eye,
  EyeOff,
  Globe,
  Hash,
  LoaderCircle,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import {
  parseLinkedAppEntry,
  type DatabaseInventoryDetail,
} from "@/lib/database-inventory";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { InventoryDocuments } from "@/components/InventoryDocuments";
import { useAuth } from "@/contexts/AuthContext";

export default function DatabaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const canViewSecrets = user?.role === "ADMIN" || user?.role === "EDITOR";
  const canEditLogicalDatabases = canViewSecrets;
  const canRestoreLogicalDatabases = user?.role === "ADMIN";
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, string>
  >({});

  const {
    data: database,
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["database", params?.id],
    queryFn: async () => {
      if (typeof params?.id !== "string") throw new Error("Invalid ID");
      const response = await api.get<DatabaseInventoryDetail>(
        `/databases/${params.id}`,
      );
      return response.data;
    },
    enabled: typeof params?.id === "string",
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load database details");
      router.push("/dashboard/databases");
    }
  }, [isError, router]);

  useEffect(() => {
    if (!database) return;
    setHeader({
      title: "Database Details",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Databases", href: "/dashboard/databases" },
        { label: database.name },
      ],
    });
    return () => setHeader(null);
  }, [database, setHeader]);

  const databaseStats = useMemo(() => {
    if (!database) return { accounts: 0, appIps: 0 };
    return {
      accounts: database.accounts.length,
      appIps: database.linkedApps.length,
    };
  }, [database]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading database details...</p>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="space-y-4 pb-8">
        <button
          onClick={() => router.push("/dashboard/databases")}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Databases
        </button>
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          Database not found
        </div>
      </div>
    );
  }

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  const handleRevealPassword = async (accountId: string) => {
    if (!database) return;
    try {
      if (revealedPasswords[accountId]) {
        setRevealedPasswords((c) => {
          const next = { ...c };
          delete next[accountId];
          return next;
        });
        return;
      }
      const res = await api.get<{ password: string }>(
        `/databases/${database.id}/accounts/${accountId}/password`,
      );
      setRevealedPasswords((c) => ({ ...c, [accountId]: res.data.password }));
    } catch (err) {
      toast.error("Failed to reveal password");
    }
  };

  const copyPassword = async (accountId: string, currentPassword?: string) => {
    if (!database) return;
    try {
      let pwdToCopy = currentPassword;
      if (!pwdToCopy) {
        pwdToCopy = revealedPasswords[accountId];
      }
      if (!pwdToCopy) {
        const res = await api.get<{ password: string }>(
          `/databases/${database.id}/accounts/${accountId}/password`,
        );
        pwdToCopy = res.data.password;
      }
      if (pwdToCopy) {
        await navigator.clipboard.writeText(pwdToCopy);
        await api.post(`/databases/${database.id}/accounts/${accountId}/copy`);
        toast.success("Copied password");
      }
    } catch {
      toast.error("Unable to copy password");
    }
  };

  const changeLogicalDatabaseStatus = async (
    logicalId: string,
    action: "archive" | "restore",
  ) => {
    if (!database) return;
    try {
      if (action === "archive") {
        await api.delete(
          `/databases/${database.id}/logical-databases/${logicalId}`,
        );
        toast.success("Logical database archived");
      } else {
        await api.patch(
          `/databases/${database.id}/logical-databases/${logicalId}/restore`,
        );
        toast.success("Logical database restored");
      }
      await refetch();
    } catch {
      toast.error(`Failed to ${action} logical database`);
    }
  };

  const connectionProperties = [
    {
      label: "Engine",
      value: database.engine || "--",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "Version",
      value: database.version || "--",
      icon: <Hash className="h-4 w-4" />,
    },
    {
      label: "Environment",
      value: database.environment || "--",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      label: "Host",
      value:
        database.hostAsset?.name ??
        database.hostVm?.systemName ??
        database.hostVm?.name ??
        database.host ??
        "--",
      icon: <Server className="h-4 w-4" />,
    },
    {
      label: "IP Address",
      value: database.ipAddress || "--",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      label: "Port",
      value: database.port || "--",
      icon: <Hash className="h-4 w-4" />,
    },
    {
      label: "Service Name",
      value: database.serviceName || "--",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  const operationsProperties = [
    { label: "Owner", value: database.owner || "--" },
    { label: "Status", value: database.status || "--" },
    { label: "Backup Policy", value: database.backupPolicy || "--" },
    { label: "Replication", value: database.replication || "--" },
    { label: "Maintenance Window", value: database.maintenanceWindow || "--" },
  ];

  const getRoleBadge = (role?: string | null) => {
    const normalizedRole = (role ?? "").toLowerCase();
    if (normalizedRole.includes("dba"))
      return "border-warning/30 bg-warning/10 text-warning";
    if (normalizedRole.includes("report"))
      return "border-success/30 bg-success/10 text-success";
    if (normalizedRole.includes("app"))
      return "border-low/30 bg-low/10 text-low";
    if (normalizedRole.includes("dev"))
      return "border-info/30 bg-info/10 text-info";
    return "border-border bg-muted text-foreground";
  };

  const getPrivilegeBadge = (privilege: string) => {
    const p = privilege.toLowerCase();
    if (p.includes("delete") || p.includes("all"))
      return "border-critical/20 bg-critical/10 text-critical";
    if (p.includes("insert") || p.includes("update") || p.includes("write"))
      return "border-warning/20 bg-warning/10 text-warning";
    return "border-info/20 bg-info/10 text-info";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="workspace-page space-y-4 pt-1"
    >
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push("/dashboard/databases")}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Databases
        </button>
      </div>

      <section className="glass-card overflow-hidden">
        <div className="relative flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

          <div className="relative z-10 flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success to-primary text-white shadow-xl">
              <Database className="h-6 w-6" />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[500px]"
                  title={database.name}
                >
                  {database.name || "Database System"}
                </h1>
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  {database.environment}
                </span>
              </div>
              {database.note && (
                <p
                  className="max-w-[500px] truncate text-xs text-muted-foreground"
                  title={database.note}
                >
                  {database.note}
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex min-w-[80px] flex-col items-center justify-center rounded-lg border border-border/50 bg-background/50 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Accounts
              </span>
              <span className="text-lg font-bold text-primary">
                {databaseStats.accounts}
              </span>
            </div>
            <div className="flex min-w-[80px] flex-col items-center justify-center rounded-lg border border-border/50 bg-background/50 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Client IPs
              </span>
              <span className="text-lg font-bold text-info">
                {databaseStats.appIps}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="glass-card p-4 sm:p-5 lg:col-span-7">
          <div className="mb-3 border-b border-border/50 pb-2.5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Database className="h-4 w-4" /> Database Details
            </h2>
            <p className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              <Server className="h-3.5 w-3.5" /> Connection Information
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {connectionProperties.map((item) => (
              <div
                key={item.label}
                className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="max-w-[58%] truncate text-right font-mono text-xs font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          {database.hostAsset || database.hostVm ? (
            <button
              type="button"
              onClick={() =>
                router.push(
                  database.hostAsset
                    ? `/dashboard/assets/${database.hostAsset.id}`
                    : `/dashboard/virtual-machines/${database.hostVm?.id}`,
                )
              }
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted/40"
            >
              <Server className="h-3.5 w-3.5" />
              Open {database.hostAsset ? "Host Asset" : "Host VM"}
            </button>
          ) : null}
        </section>

        <section className="glass-card p-4 sm:p-5 lg:col-span-5">
          <div className="mb-3 border-b border-border/50 pb-2.5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Operations &amp; Protection
            </h2>
          </div>
          <div className="space-y-2">
            {operationsProperties.map((item) => (
              <div
                key={item.label}
                className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
                <span className="max-w-[58%] truncate text-right text-xs font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-4 sm:p-5 lg:col-span-12">
          <div className="mb-3 border-b border-border/50 pb-2.5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Globe className="h-4 w-4" /> Operational Client IP Metadata
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Legacy operational connection metadata only. Canonical Application
              topology is managed through Logical Database relationships below.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {database.linkedApps.length > 0 ? (
              database.linkedApps.map((entry) => {
                const linkedApp = parseLinkedAppEntry(entry);
                return (
                  <div
                    key={entry}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {linkedApp.ipAddress || "--"}
                      </div>
                      <div
                        className="truncate text-[11px] text-muted-foreground"
                        title={linkedApp.description || "No description"}
                      >
                        {linkedApp.description || "No description"}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          linkedApp.ipAddress || "",
                        );
                        toast.success("IP copied");
                      }}
                      className="ml-3 shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 hover:text-primary/80"
                    >
                      Copy
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-3 text-sm text-muted-foreground">
                No application IP data found
              </div>
            )}
          </div>
        </section>
      </div>

      <InventoryDocuments documents={database.documentLinks} />

      <section className="glass-card p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Database className="h-4 w-4 text-primary" />
          Logical databases
        </h2>
        {database.logicalDatabases?.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {database.logicalDatabases.map((logical) => (
              <div
                key={logical.id}
                className="rounded-xl border border-border/50 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{logical.name}</p>
                    {logical.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {logical.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {logical.status ?? "ACTIVE"}
                    </span>
                    <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {logical.components?.length ?? 0} links
                    </span>
                    {logical.status === "ARCHIVED"
                      ? canRestoreLogicalDatabases && (
                          <button
                            type="button"
                            aria-label={`Restore logical database ${logical.name}`}
                            onClick={() => {
                              void changeLogicalDatabaseStatus(
                                logical.id,
                                "restore",
                              );
                            }}
                            className="rounded-md border border-primary/30 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10"
                          >
                            Restore
                          </button>
                        )
                      : canEditLogicalDatabases && (
                          <button
                            type="button"
                            aria-label={`Archive logical database ${logical.name}`}
                            onClick={() => {
                              void changeLogicalDatabaseStatus(
                                logical.id,
                                "archive",
                              );
                            }}
                            className="rounded-md border border-destructive/30 px-2 py-1 text-[10px] font-semibold text-destructive hover:bg-destructive/10"
                          >
                            Archive
                          </button>
                        )}
                  </div>
                </div>
                {logical.components?.length ? (
                  <div className="mt-3 space-y-2">
                    {logical.components.map((component) => (
                      <button
                        key={component.id}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/applications/${component.application.id}`,
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {component.application.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {component.environment.name} · {component.name}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Open
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No Application Component relationships yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No logical databases recorded yet.
          </p>
        )}
      </section>

      <section className="glass-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
              <ShieldCheck className="h-4 w-4 text-success" /> Accounts &amp;
              Credentials
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Access accounts linked to this database. Passwords stay hidden
              until explicitly revealed.
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-border/50 bg-background/50 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
            {databaseStats.accounts}
          </span>
        </div>
        <div className="overflow-x-auto p-0">
          {database.accounts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No saved accounts found
            </div>
          ) : (
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/20 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 sm:px-4">Username</th>
                  <th className="px-3 py-2.5 sm:px-4">Password</th>
                  <th className="px-3 py-2.5 sm:px-4">Role</th>
                  <th className="px-3 py-2.5 sm:px-4">Scope</th>
                  <th className="px-3 py-2.5 sm:px-4">Privileges</th>
                  <th className="px-3 py-2.5 sm:px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {database.accounts.map((account) => {
                  const isRev = !!revealedPasswords[account.id];
                  return (
                    <tr
                      key={account.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">
                            {account.username}
                          </span>
                          <button
                            aria-label="Copy username"
                            onClick={() => {
                              void copyValue(account.username, "Username");
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono bg-muted/50 px-2 py-1 rounded-md min-w-[160px] text-center font-semibold tabular-nums transition-all">
                            {isRev
                              ? revealedPasswords[account.id]
                              : "••••••••••••"}
                          </div>
                          {canViewSecrets ? (
                            <>
                              <button
                                aria-label={
                                  isRev
                                    ? `Hide password for ${account.username}`
                                    : `Reveal password for ${account.username}`
                                }
                                onClick={() => handleRevealPassword(account.id)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                              >
                                {isRev ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                aria-label={`Copy password for ${account.username}`}
                                onClick={() => {
                                  void copyPassword(
                                    account.id,
                                    isRev
                                      ? revealedPasswords[account.id]
                                      : undefined,
                                  );
                                }}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Restricted
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <span
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-[11px] font-semibold",
                            getRoleBadge(account.role),
                          )}
                        >
                          {account.role || "--"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs sm:px-4">
                        <div className="space-y-1">
                          <span className="font-semibold text-foreground">
                            {account.scope === "LOGICAL_DATABASES"
                              ? "Logical Databases"
                              : "Whole Instance"}
                          </span>
                          {account.scope === "LOGICAL_DATABASES" &&
                          account.logicalDatabaseNames?.length ? (
                            <p className="max-w-[220px] truncate text-[11px] text-muted-foreground">
                              {account.logicalDatabaseNames.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {account.privileges.map((priv) => (
                            <span
                              key={priv}
                              className={cn(
                                "px-2 py-1 border rounded-md text-[11px] font-semibold",
                                getPrivilegeBadge(priv),
                              )}
                            >
                              {priv}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground sm:px-4">
                        {account.note || "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </motion.div>
  );
}
