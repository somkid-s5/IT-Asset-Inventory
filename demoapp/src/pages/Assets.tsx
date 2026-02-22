import { useState } from "react";
import { Link } from "react-router-dom";
import { assetTypeIcons, type AssetType, type Asset } from "@/data/mockData";
import { RiskBadge, StatusDot } from "@/components/StatusBadges";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { AssetFormDialog } from "@/components/AssetFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";

export default function Assets() {
  const { assets, addAsset, updateAsset, deleteAsset } = useData();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const filtered = assets.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.ip?.includes(search);
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const types: (AssetType | "all")[] = ["all", "server", "vm", "application", "database"];

  const handleAdd = (data: Omit<Asset, "id">) => {
    addAsset(data);
    toast({ title: "Asset added", description: `${data.name} has been added.` });
  };

  const handleEdit = (data: Omit<Asset, "id">) => {
    if (editing) {
      updateAsset(editing.id, data);
      toast({ title: "Asset updated", description: `${data.name} has been updated.` });
      setEditing(null);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteAsset(deleteTarget.id);
      toast({ title: "Asset deleted", description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Asset Inventory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{assets.length} assets tracked</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Asset
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 rounded-lg border border-input bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-input bg-card p-0.5">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          Showing {filtered.length} of {assets.length} entries
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr className="bg-muted/30">
              <th>Asset</th>
              <th>Type</th>
              <th>IP Address</th>
              <th>OS</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Score</th>
              <th>Owner</th>
              <th>Tags</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset) => {
              const Icon = assetTypeIcons[asset.type];
              return (
                <tr key={asset.id} className="animate-slide-in">
                  <td>
                    <Link to={`/assets/${asset.id}`} className="flex items-center gap-2 hover:text-primary transition-colors group">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
                        <Icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="font-mono text-xs font-medium">{asset.name}</span>
                    </Link>
                  </td>
                  <td><span className="text-xs text-muted-foreground capitalize">{asset.type}</span></td>
                  <td className="font-mono text-xs text-muted-foreground">{asset.ip || "—"}</td>
                  <td className="text-xs text-muted-foreground">{asset.os || "—"}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={asset.status} />
                      <span className="text-xs capitalize text-foreground">{asset.status}</span>
                    </div>
                  </td>
                  <td><RiskBadge level={asset.riskLevel} /></td>
                  <td className="font-mono text-xs font-medium text-foreground">{asset.riskScore}</td>
                  <td className="text-xs text-muted-foreground">{asset.owner}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(asset); setFormOpen(true); }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(asset)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editing}
        onSubmit={editing ? handleEdit : handleAdd}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Asset"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
