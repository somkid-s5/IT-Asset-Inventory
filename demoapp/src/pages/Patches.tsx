import { PatchBadge } from "@/components/StatusBadges";
import { useState } from "react";
import { Search, AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { PatchFormDialog } from "@/components/PatchFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";
import type { PatchItem } from "@/data/mockData";

export default function Patches() {
  const { patches, addPatch, updatePatch, deletePatch } = useData();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PatchItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatchItem | null>(null);

  const filtered = patches.filter(
    (p) =>
      p.assetName.toLowerCase().includes(search.toLowerCase()) ||
      p.software.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (data: Omit<PatchItem, "id">) => {
    addPatch(data);
    toast({ title: "Patch added", description: `${data.software} for ${data.assetName} has been added.` });
  };

  const handleEdit = (data: Omit<PatchItem, "id">) => {
    if (editing) {
      updatePatch(editing.id, data);
      toast({ title: "Patch updated", description: `${data.software} has been updated.` });
      setEditing(null);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deletePatch(deleteTarget.id);
      toast({ title: "Patch deleted", description: `${deleteTarget.software} has been removed.` });
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Patch Tracking</h1>
          <p className="text-sm text-muted-foreground">Version intelligence and EOL monitoring</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Patch
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "EOL Software", count: patches.filter((p) => p.status === "eol").length, variant: "risk-glow-critical" },
          { label: "Outdated", count: patches.filter((p) => p.status === "outdated").length, variant: "risk-glow-medium" },
          { label: "Current", count: patches.filter((p) => p.status === "current").length, variant: "risk-glow-low" },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.variant}`}>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold font-mono">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by asset or software..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Software</th>
              <th>Current Version</th>
              <th>Latest Version</th>
              <th>EOL Date</th>
              <th>Status</th>
              <th>CVEs</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((patch) => (
              <tr key={patch.id} className="animate-slide-in">
                <td className="font-mono text-xs">{patch.assetName}</td>
                <td className="text-sm">{patch.software}</td>
                <td className="font-mono text-xs">{patch.currentVersion}</td>
                <td className="font-mono text-xs">{patch.latestVersion}</td>
                <td className="text-xs">
                  {patch.eolDate ? (
                    <span className="text-destructive">{patch.eolDate}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td><PatchBadge status={patch.status} /></td>
                <td>
                  {patch.cve.length > 0 ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span className="font-mono text-xs text-destructive">{patch.cve.join(", ")}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(patch); setFormOpen(true); }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(patch)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PatchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patch={editing}
        onSubmit={editing ? handleEdit : handleAdd}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Patch"
        description={`Are you sure you want to delete "${deleteTarget?.software}" for ${deleteTarget?.assetName}? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
