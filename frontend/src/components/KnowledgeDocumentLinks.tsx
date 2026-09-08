"use client";

import { Link2 } from "lucide-react";

import { RelationPicker, type RelationPickerResourceKind } from "@/components/RelationPicker";
import { Card } from "@/components/ui/card";

type LinkKind = "applications" | "assets" | "vms" | "databases";

export type KnowledgeDocumentLinkValues = Record<LinkKind, string[]>;

type Props = {
  value: KnowledgeDocumentLinkValues;
  onChange: (value: KnowledgeDocumentLinkValues) => void;
};

const SECTIONS: Array<{
  key: LinkKind;
  kind: RelationPickerResourceKind;
  title: string;
  description: string;
}> = [
  {
    key: "applications",
    kind: "applications",
    title: "Applications",
    description: "Business services and systems",
  },
  {
    key: "assets",
    kind: "assets",
    title: "Assets",
    description: "Servers, storage, and network equipment",
  },
  {
    key: "vms",
    kind: "vms",
    title: "Virtual machines",
    description: "VM inventory records",
  },
  {
    key: "databases",
    kind: "databases",
    title: "Databases",
    description: "Database inventory records",
  },
];

export function KnowledgeDocumentLinks({ value, onChange }: Props) {
  const selectedCount = Object.values(value).reduce(
    (count, ids) => count + ids.length,
    0,
  );

  return (
    <Card className="space-y-4 rounded-2xl border bg-muted/20 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Link inventory records</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Search the server-authoritative inventory and link the records this
            document describes.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {selectedCount} selected
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          return (
            <RelationPicker
              key={section.key}
              kind={section.kind}
              label={section.title}
              description={section.description}
              value={value[section.key]}
              onChange={(ids) => onChange({ ...value, [section.key]: ids })}
            />
          );
        })}
      </div>
    </Card>
  );
}
