import { cn } from "@/lib/utils";
import {
  formatMissingValue,
  type MissingValueKind,
} from "@/lib/inventory-presentation";

interface MissingValueProps {
  kind?: MissingValueKind;
  compact?: boolean;
  className?: string;
}

export function MissingValue({
  kind = "unknown",
  compact = false,
  className,
}: MissingValueProps) {
  const label = formatMissingValue(undefined, kind);
  const visualLabel = compact && kind === "unknown" ? "—" : label;

  return (
    <span
      className={cn("text-muted-foreground", className)}
      aria-label={label}
      title={label}
      data-missing-kind={kind}
    >
      {visualLabel}
    </span>
  );
}
