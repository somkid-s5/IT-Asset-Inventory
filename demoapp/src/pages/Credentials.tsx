import { Lock, Eye, EyeOff, Key, Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { CredentialFormDialog } from "@/components/CredentialFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "@/hooks/use-toast";
import type { Credential } from "@/data/mockData";

export default function Credentials() {
  const { credentials, addCredential, updateCredential, deleteCredential } = useData();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);

  const toggle = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const typeColors: Record<string, string> = {
    ssh: "bg-primary/10 text-primary border border-primary/20",
    rdp: "bg-muted text-muted-foreground border border-border",
    api: "bg-muted text-muted-foreground border border-border",
    database: "bg-primary/10 text-primary border border-primary/20",
  };

  const handleAdd = (data: Omit<Credential, "id">) => {
    addCredential(data);
    toast({ title: "Credential added", description: `${data.label} has been added.` });
  };

  const handleEdit = (data: Omit<Credential, "id">) => {
    if (editing) {
      updateCredential(editing.id, data);
      toast({ title: "Credential updated", description: `${data.label} has been updated.` });
      setEditing(null);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteCredential(deleteTarget.id);
      toast({ title: "Credential deleted", description: `${deleteTarget.label} has been removed.` });
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Credential Vault</h1>
          <p className="text-sm text-muted-foreground">AES-256 encrypted credential store</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Vault Sealed</span>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Credential
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {credentials.map((cred) => {
          const isRevealed = revealed.has(cred.id);
          const isExpiring =
            cred.expiresAt && new Date(cred.expiresAt) < new Date(Date.now() + 30 * 86400000);

          return (
            <div
              key={cred.id}
              className={`stat-card ${isExpiring ? "risk-glow-medium" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{cred.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`status-badge ${typeColors[cred.type]}`}>
                    {cred.type.toUpperCase()}
                  </span>
                  <button onClick={() => { setEditing(cred); setFormOpen(true); }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(cred)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-mono">{cred.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-mono">{cred.target}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {isRevealed ? "s3cur3P@ss!" : "••••••••••"}
                    </span>
                    <button
                      onClick={() => toggle(cred.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Rotated</span>
                  <span>{new Date(cred.lastRotated).toLocaleDateString()}</span>
                </div>
                {cred.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className={isExpiring ? "text-warning font-medium" : ""}>
                      {new Date(cred.expiresAt).toLocaleDateString()}
                      {isExpiring && " ⚠"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CredentialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        credential={editing}
        onSubmit={editing ? handleEdit : handleAdd}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Credential"
        description={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
