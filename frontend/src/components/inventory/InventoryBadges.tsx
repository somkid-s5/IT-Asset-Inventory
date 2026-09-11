import { Badge } from "@/components/ui/badge";
import {
  getInventoryBadgeMeta,
  type InventoryBadgeKind,
  type InventoryBadgeTone,
} from "@/lib/inventory-presentation";

interface InventoryBadgeProps {
  value?: unknown;
  displayValue?: string;
  role?: "status" | null;
  className?: string;
}

const BADGE_KIND_LABELS: Record<InventoryBadgeKind, string> = {
  "record-status": "Record status",
  environment: "Environment",
  "vm-lifecycle": "VM lifecycle",
  "vm-power": "VM power",
  "vm-sync": "VM sync",
  "data-quality": "Data quality",
  "source-health": "Source health",
};

function SemanticInventoryBadge({
  kind,
  value,
  displayValue,
  role = "status",
  className,
}: InventoryBadgeProps & { kind: InventoryBadgeKind }) {
  const meta = getInventoryBadgeMeta(kind, value);
  const variant: InventoryBadgeTone = meta.tone;

  return (
    <Badge
      variant={variant}
      className={className}
      role={role ?? undefined}
      aria-label={`${BADGE_KIND_LABELS[kind]}: ${meta.label}`}
      title={`${BADGE_KIND_LABELS[kind]}: ${meta.label}`}
    >
      {displayValue ?? meta.label}
    </Badge>
  );
}

export function RecordStatusBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="record-status" {...props} />;
}

export function EnvironmentBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="environment" {...props} />;
}

export function VmLifecycleBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="vm-lifecycle" {...props} />;
}

export function VmPowerBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="vm-power" {...props} />;
}

export function VmSyncBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="vm-sync" {...props} />;
}

export function QualityBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="data-quality" {...props} />;
}

export const DataQualityBadge = QualityBadge;

export function SourceHealthBadge(props: InventoryBadgeProps) {
  return <SemanticInventoryBadge kind="source-health" {...props} />;
}
