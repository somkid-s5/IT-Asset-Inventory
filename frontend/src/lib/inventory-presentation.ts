export type MissingValueKind = "unknown" | "not-applicable" | "needs-context";

export type InventoryBadgeKind =
  | "record-status"
  | "environment"
  | "vm-lifecycle"
  | "vm-power"
  | "vm-sync"
  | "data-quality"
  | "source-health";

export type InventoryBadgeTone =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "neutral"
  | "danger";

export interface InventoryBadgeMeta {
  label: string;
  tone: InventoryBadgeTone;
}

const MISSING_VALUE_LABELS: Record<MissingValueKind, string> = {
  unknown: "Unknown",
  "not-applicable": "Not applicable",
  "needs-context": "Needs context",
};

const BADGE_META: Record<InventoryBadgeKind, Record<string, InventoryBadgeMeta>> = {
  "record-status": {
    ACTIVE: { label: "Active", tone: "success" },
    INACTIVE: { label: "Inactive", tone: "warning" },
    MAINTENANCE: { label: "Maintenance", tone: "warning" },
    DECOMMISSIONED: { label: "Decommissioned", tone: "neutral" },
    ARCHIVED: { label: "Archived", tone: "neutral" },
    DRAFT: { label: "Draft", tone: "warning" },
  },
  environment: {
    PROD: { label: "PROD", tone: "danger" },
    UAT: { label: "UAT", tone: "warning" },
    TEST: { label: "TEST", tone: "secondary" },
  },
  "vm-lifecycle": {
    DRAFT: { label: "Draft", tone: "warning" },
    ACTIVE: { label: "Active", tone: "success" },
    DELETED_IN_VCENTER: { label: "Deleted in vCenter", tone: "danger" },
    ARCHIVED: { label: "Archived", tone: "neutral" },
  },
  "vm-power": {
    POWERED_ON: { label: "Powered on", tone: "success" },
    POWERED_OFF: { label: "Powered off", tone: "neutral" },
    SUSPENDED: { label: "Suspended", tone: "warning" },
  },
  "vm-sync": {
    SYNCED: { label: "Synced", tone: "success" },
    STALE: { label: "Stale", tone: "warning" },
    MISSING: { label: "Missing from source", tone: "danger" },
    MISSING_FROM_SOURCE: { label: "Missing from source", tone: "danger" },
    ERROR: { label: "Sync error", tone: "danger" },
    NEVER_SYNCED: { label: "Never synced", tone: "neutral" },
  },
  "data-quality": {
    COMPLETE: { label: "Complete", tone: "success" },
    NEEDS_CONTEXT: { label: "Needs context", tone: "warning" },
    INCOMPLETE: { label: "Incomplete", tone: "warning" },
    INVALID: { label: "Invalid", tone: "danger" },
  },
  "source-health": {
    HEALTHY: { label: "Healthy", tone: "success" },
    CONNECTED: { label: "Connected", tone: "success" },
    DEGRADED: { label: "Degraded", tone: "warning" },
    ERROR: { label: "Error", tone: "danger" },
    UNAVAILABLE: { label: "Unavailable", tone: "danger" },
  },
};

function normalizePresentationValue(value: unknown) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/[\s-]+/g, "_")
    : "";
}

export function formatMissingValue(
  value: unknown,
  missingKind: MissingValueKind = "unknown",
) {
  if (value === null || value === undefined) {
    return MISSING_VALUE_LABELS[missingKind];
  }

  if (typeof value === "string" && value.trim() === "") {
    return MISSING_VALUE_LABELS[missingKind];
  }

  return String(value);
}

export interface FormatDateTimeOptions {
  locale?: string;
  timeZone?: string;
  includeTime?: boolean;
  missingKind?: MissingValueKind;
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
  options: FormatDateTimeOptions = {},
) {
  const { locale = "en-US", timeZone, includeTime = true, missingKind = "unknown" } = options;

  if (value === null || value === undefined || value === "") {
    return MISSING_VALUE_LABELS[missingKind];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return MISSING_VALUE_LABELS[missingKind];
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function getInventoryBadgeMeta(
  kind: InventoryBadgeKind,
  value: unknown,
): InventoryBadgeMeta {
  const normalizedValue = normalizePresentationValue(value);
  return BADGE_META[kind][normalizedValue] ?? { label: "Unknown", tone: "neutral" };
}

export function getInventoryPageCount(total: number, pageSize: number) {
  const normalizedTotal = Math.max(0, Math.floor(total));
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  return normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / normalizedPageSize);
}

export interface InventoryPaginationSummary {
  page: number;
  pageSize: number;
  total: number;
}

export function getInventoryPaginationSummary({
  page,
  pageSize,
  total,
}: InventoryPaginationSummary) {
  const normalizedTotal = Math.max(0, Math.floor(total));
  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));

  if (normalizedTotal === 0) {
    return "Showing 0 of 0";
  }

  const start = Math.min((normalizedPage - 1) * normalizedPageSize + 1, normalizedTotal);
  const end = Math.min(start + normalizedPageSize - 1, normalizedTotal);
  return `Showing ${start}–${end} of ${normalizedTotal}`;
}
