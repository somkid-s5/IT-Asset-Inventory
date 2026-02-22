import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Credential } from "@/data/mockData";

interface CredentialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: Credential | null;
  onSubmit: (data: Omit<Credential, "id">) => void;
}

const emptyForm = {
  label: "",
  type: "ssh" as Credential["type"],
  username: "",
  target: "",
  lastRotated: new Date().toISOString(),
  expiresAt: "",
};

export function CredentialFormDialog({ open, onOpenChange, credential, onSubmit }: CredentialFormDialogProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (credential) {
      setForm({
        label: credential.label,
        type: credential.type,
        username: credential.username,
        target: credential.target,
        lastRotated: credential.lastRotated,
        expiresAt: credential.expiresAt || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [credential, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.username.trim()) return;
    onSubmit({
      label: form.label.trim(),
      type: form.type,
      username: form.username.trim(),
      target: form.target.trim(),
      lastRotated: form.lastRotated,
      expiresAt: form.expiresAt || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{credential ? "Edit Credential" : "Add Credential"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Label *</Label>
              <Input id="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Credential["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssh">SSH</SelectItem>
                  <SelectItem value="rdp">RDP</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username *</Label>
              <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target</Label>
              <Input id="target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="10.0.1.10" maxLength={200} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiresAt">Expires At</Label>
            <Input id="expiresAt" type="date" value={form.expiresAt ? form.expiresAt.split("T")[0] : ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{credential ? "Save Changes" : "Add Credential"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
