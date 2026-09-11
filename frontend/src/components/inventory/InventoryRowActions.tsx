"use client";

import Link from "next/link";
import { Archive, ArchiveRestore, Eye, MoreHorizontal, Pencil } from "lucide-react";
import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface InventoryRowSecondaryAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: ReactNode;
}

export interface InventoryRowLifecycleAction {
  status: "ACTIVE" | "ARCHIVED";
  archive?: {
    allowed: boolean;
    onSelect: () => void;
  };
  restore?: {
    allowed: boolean;
    onSelect: () => void;
  };
}

export interface InventoryRowActionsProps {
  recordLabel: string;
  detailHref: string;
  viewActionLabel?: string;
  inlineLifecycleActions?: boolean;
  menuRecordLabel?: string;
  edit?: {
    allowed: boolean;
    onSelect: () => void;
  };
  secondaryActions?: InventoryRowSecondaryAction[];
  lifecycle?: InventoryRowLifecycleAction;
}

function isLifecycleActionVisible(lifecycle?: InventoryRowLifecycleAction) {
  if (!lifecycle) {
    return false;
  }

  return lifecycle.status === "ACTIVE"
    ? lifecycle.archive?.allowed === true
    : lifecycle.restore?.allowed === true;
}

export function InventoryRowActions({
  recordLabel,
  detailHref,
  viewActionLabel,
  inlineLifecycleActions = false,
  menuRecordLabel = recordLabel,
  edit,
  secondaryActions = [],
  lifecycle,
}: InventoryRowActionsProps) {
  const menuVisible = secondaryActions.length > 0 || isLifecycleActionVisible(lifecycle);
  const archiveVisible = lifecycle?.status === "ACTIVE" && lifecycle.archive?.allowed;
  const restoreVisible = lifecycle?.status === "ARCHIVED" && lifecycle.restore?.allowed;

  return (
    <div className="flex items-center justify-end gap-1" data-slot="inventory-row-actions">
      <Button
        asChild
        variant="ghost"
        size="icon-sm"
        title={viewActionLabel ?? `View ${recordLabel}`}
      >
        <Link
          href={detailHref}
          aria-label={viewActionLabel ?? `View ${recordLabel}`}
        >
          <Eye />
        </Link>
      </Button>

      {edit?.allowed && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={`Edit ${recordLabel}`}
          aria-label={`Edit ${recordLabel}`}
          onClick={edit.onSelect}
        >
          <Pencil />
        </Button>
      )}

      {inlineLifecycleActions && archiveVisible && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={`Archive ${recordLabel}`}
          aria-label="Archive"
          onClick={lifecycle.archive?.onSelect}
        >
          <Archive />
        </Button>
      )}

      {inlineLifecycleActions && restoreVisible && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={`Restore ${recordLabel}`}
          aria-label="Restore"
          onClick={lifecycle.restore?.onSelect}
        >
          <ArchiveRestore />
        </Button>
      )}

      {menuVisible && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={`More actions for ${menuRecordLabel}`}
              aria-label={`More actions for ${menuRecordLabel}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map((action) => (
              <DropdownMenuItem
                key={action.label}
                disabled={action.disabled}
                variant={action.destructive ? "destructive" : "default"}
                onSelect={action.onSelect}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}

            {(archiveVisible || restoreVisible) && <DropdownMenuSeparator />}

            {archiveVisible && (
              <DropdownMenuItem
                variant="destructive"
                onSelect={lifecycle.archive?.onSelect}
              >
                <Archive />
                Archive
              </DropdownMenuItem>
            )}

            {restoreVisible && (
              <DropdownMenuItem onSelect={lifecycle.restore?.onSelect}>
                <ArchiveRestore />
                Restore
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
