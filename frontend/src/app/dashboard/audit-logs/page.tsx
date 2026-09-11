"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Clock3,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { fadeInUp } from "@/lib/animations";
import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/EmptyState";
import {
  InventoryPagination,
  InventoryTableShell,
  MissingValue,
  formatDateTime,
} from "@/components/inventory";
import { useInventoryQueryState } from "@/lib/inventory-query-state";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";

interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
  avatarImage?: string | null;
}

interface AuditLogRecord {
  id: string;
  action: string;
  targetId: string | null;
  ipAddress: string | null;
  details: string | null;
  timestamp: string;
  user: UserInfo | null;
}

interface AuditLogResponse {
  data: AuditLogRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  summary: {
    totalEvents: number;
    todayEvents: number;
    deleteEvents: number;
    uniqueActors: number;
    scope: string;
  };
}

const ACTION_OPTIONS = [
  "CREATE_SOURCE",
  "UPDATE_SOURCE",
  "ARCHIVE_SOURCE",
  "RESTORE_SOURCE",
  "VCENTER_SYNC",
  "CREATE_USER",
  "UPDATE_USER_ROLE",
  "RESET_USER_PASSWORD",
  "CREATE_APPLICATION",
  "UPDATE_APPLICATION",
  "ARCHIVE_APPLICATION",
  "RESTORE_APPLICATION",
  "CREATE_ASSET",
  "UPDATE_ASSET",
  "DELETE_ASSET",
  "CREATE_DATABASE",
  "UPDATE_DATABASE",
  "DELETE_DATABASE",
] as const;

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


function actionClasses(action: string) {
  if (action.includes("DELETE"))
    return "bg-destructive/10 text-destructive border-destructive/20";
  if (
    action.includes("VIEW") ||
    action.includes("LOGIN") ||
    action.includes("COPY")
  )
    return "bg-primary/10 text-primary border-primary/20";
  if (action.includes("CREATE"))
    return "bg-success/10 text-success border-success/20";
  return "bg-warning/10 text-warning border-warning/20";
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-bold tracking-tight ${actionClasses(action)}`}
    >
      {formatAction(action || "UNKNOWN")}
    </Badge>
  );
}

function redactDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDetails);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      /password|secret|token|encrypted/i.test(key)
        ? "[REDACTED]"
        : redactDetails(nested),
    ]),
  );
}

function formatDetails(details: string) {
  try {
    return JSON.stringify(redactDetails(JSON.parse(details)), null, 2);
  } catch {
    return details.replace(
      /((?:password|secret|token|encryptedPassword)\s*[:=]\s*)("[^"]*"|[^,\s}]+)/gi,
      "$1[REDACTED]",
    );
  }
}

function LogDetailsDialog({ details }: { details: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="max-w-[320px] truncate rounded-md p-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title="Click to view full details"
        >
          {details}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            Full details and metadata for this audit event. Secret-shaped values
            are redacted.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-x-auto overflow-y-auto rounded-xl bg-muted p-4">
          <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground">
            {formatDetails(details)}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogIdentity({ user }: { user: UserInfo | null }) {
  if (!user)
    return (
      <span className="text-xs italic text-muted-foreground">
        System / Deleted User
      </span>
    );
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <UserAvatar
        seed={user.avatarSeed}
        imageUrl={user.avatarImage}
        label={user.displayName}
        className="h-7 w-7 rounded-lg"
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{user.displayName}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">
          @{user.username}
        </p>
      </div>
    </div>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors hover:text-foreground"
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xl font-black tracking-tight">
          {value.toLocaleString()}
        </p>
      </div>
    </Card>
  );
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortBy, setSortBy] = useState<"timestamp" | "action" | "ipAddress">(
    "timestamp",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryKey = useMemo(
    () => [
      "audit-logs",
      {
        page,
        limit,
        search: debouncedSearch,
        action,
        from,
        to,
        sortBy,
        sortDir,
      },
    ],
    [page, limit, debouncedSearch, action, from, to, sortBy, sortDir],
  );
  const logsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<AuditLogResponse>("/audit-logs", {
        params: {
          page,
          limit,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(action ? { action } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          sortBy,
          sortDir,
        },
      });
      return response.data;
    },
    enabled: !!user && user.role === "ADMIN",
    placeholderData: keepPreviousData,
    retry: false,
  });
  const response = logsQuery.data;
  const logs = response?.data ?? [];
  const meta = response?.meta ?? { total: 0, page, limit, totalPages: 0 };
  const summary = response?.summary;
  const isFiltered = Boolean(debouncedSearch || action || from || to);
  const queryState = useInventoryQueryState(logsQuery, {
    hasData: response !== undefined,
    hasRecords: logs.length > 0,
    isFiltered,
  });

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    setHeader({
      title: "Audit Logs",
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Audit Logs" },
      ],
    });
    return () => setHeader(null);
  }, [setHeader]);

  const toggleSort = (nextField: "timestamp" | "action" | "ipAddress") => {
    if (sortBy === nextField)
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortBy(nextField);
      setSortDir("asc");
    }
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const resetFilters = () => {
    clearSearch();
    setAction("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const summaryTiles = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryTile
        icon={Activity}
        label="Filtered Events"
        value={summary?.totalEvents ?? meta.total}
        tone="bg-primary/10 text-primary"
      />
      <SummaryTile
        icon={Clock3}
        label="Filtered Today"
        value={summary?.todayEvents ?? 0}
        tone="bg-info/10 text-info"
      />
      <SummaryTile
        icon={Trash2}
        label="Delete Events"
        value={summary?.deleteEvents ?? 0}
        tone="bg-destructive/10 text-destructive"
      />
      <SummaryTile
        icon={Users}
        label="Unique Actors"
        value={summary?.uniqueActors ?? 0}
        tone="bg-primary/10 text-primary"
      />
    </div>
  );

  if (!user || user.role !== "ADMIN") return <AccessDenied />;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-8"
    >
        <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
            <Activity className="h-5 w-5 text-primary" />
            System Audit Logs
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search and review the complete server-side audit history.
          </p>
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 rounded-lg text-xs text-muted-foreground"
          >
            <X className="mr-1.5 h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs by user, action, or details..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border-border/60 bg-card pl-9 pr-9 text-xs"
                />
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X />
                  </Button>
                )}
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {meta.total.toLocaleString()} matching events ·{" "}
                {summary?.scope ?? "server dataset"}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                Action
                <select
                  aria-label="Filter by action"
                  value={action}
                  onChange={(event) => {
                    setAction(event.target.value);
                    setPage(1);
                  }}
                  className="h-8 min-w-44 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
                >
                  <option value="">All actions</option>
                  {ACTION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatAction(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                From
                <Input
                  aria-label="Audit date from"
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-36 bg-card text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted-foreground">
                To
                <Input
                  aria-label="Audit date to"
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-36 bg-card text-xs"
                />
              </label>
            </div>
          </div>

        <InventoryTableShell
          title="Audit log results"
          description="Search and review the complete server-side audit history."
          state={queryState.state}
          hasStaleData={queryState.hasStaleData}
          onRetry={() => void logsQuery.refetch()}
          emptyState={
            <EmptyState
              icon={ShieldAlert}
              title="No audit logs yet"
              description="No system audit logs have been recorded yet."
            />
          }
          filteredEmptyState={
            <EmptyState
              icon={ShieldAlert}
              title="No audit logs found"
              description="No audit logs match your current search or filters."
            />
          }
          pagination={
            <InventoryPagination
              page={meta.page}
              pageSize={meta.limit}
              total={meta.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
              pageSizeOptions={[20, 50, 100]}
            />
          }
        >
          {summaryTiles}

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    <SortButton
                      label="Date & Time"
                      active={sortBy === "timestamp"}
                      direction={sortDir}
                      onClick={() => toggleSort("timestamp")}
                    />
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    User
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    <SortButton
                      label="Action"
                      active={sortBy === "action"}
                      direction={sortDir}
                      onClick={() => toggleSort("action")}
                    />
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    Details
                  </TableHead>
                  <TableHead className="px-4 py-2.5 text-muted-foreground">
                    <SortButton
                      label="IP Address"
                      active={sortBy === "ipAddress"}
                      direction={sortDir}
                      onClick={() => toggleSort("ipAddress")}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  return (
                    <TableRow
                      key={log.id}
                      className="border-b border-border/60 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <LogIdentity user={log.user} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <ActionBadge action={log.action || "UNKNOWN"} />
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        {log.details ? (
                          <LogDetailsDialog details={log.details} />
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            No details
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <span className="font-mono text-xs">
                          {log.ipAddress || <MissingValue compact />}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {logs.map((log) => {
              return (
                <article
                  key={log.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <ActionBadge action={log.action || "UNKNOWN"} />
                      <time className="text-right text-[10px] text-muted-foreground">
                        {formatDateTime(log.timestamp)}
                    </time>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        User
                      </p>
                      <LogIdentity user={log.user} />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        IP Address
                      </p>
                      <p className="truncate font-mono text-xs">
                        {log.ipAddress || <MissingValue compact />}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Details
                    </p>
                    {log.details ? (
                      <LogDetailsDialog details={log.details} />
                    ) : (
                      <span className="text-xs italic text-muted-foreground">
                        No details
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

        </InventoryTableShell>
      </Card>
    </motion.div>
  );
}
