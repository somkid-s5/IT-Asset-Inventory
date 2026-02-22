import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Asset, AssetType, RiskLevel } from "@/data/mockData";

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
  onSubmit: (data: Omit<Asset, "id">) => void;
}

const emptyForm = {
  name: "",
  type: "server" as AssetType,
  ip: "",
  os: "",
  status: "online" as Asset["status"],
  riskScore: 0,
  riskLevel: "low" as RiskLevel,
  owner: "",
  tags: "",
  lastScan: new Date().toISOString(),
};

export function AssetFormDialog({ open, onOpenChange, asset, onSubmit }: AssetFormDialogProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name,
        type: asset.type,
        ip: asset.ip || "",
        os: asset.os || "",
        status: asset.status,
        riskScore: asset.riskScore,
        riskLevel: asset.riskLevel,
        owner: asset.owner,
        tags: asset.tags.join(", "),
        lastScan: asset.lastScan,
      });
    } else {
      setForm(emptyForm);
    }
  }, [asset, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.owner.trim()) return;
    onSubmit({
      name: form.name.trim(),
      type: form.type,
      ip: form.ip.trim() || undefined,
      os: form.os.trim() || undefined,
      status: form.status,
      riskScore: Math.min(100, Math.max(0, form.riskScore)),
      riskLevel: form.riskLevel,
      owner: form.owner.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      lastScan: form.lastScan,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AssetType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="vm">VM</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ip">IP Address</Label>
              <Input id="ip" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="10.0.0.1" maxLength={45} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os">OS</Label>
              <Input id="os" value={form.os} onChange={(e) => setForm({ ...form, os: e.target.value })} placeholder="Ubuntu 22.04" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Asset["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="degraded">Degraded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Risk Level</Label>
              <Select value={form.riskLevel} onValueChange={(v) => setForm({ ...form, riskLevel: v as RiskLevel })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="riskScore">Risk Score (0-100)</Label>
              <Input id="riskScore" type="number" min={0} max={100} value={form.riskScore} onChange={(e) => setForm({ ...form, riskScore: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="owner">Owner *</Label>
              <Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} required maxLength={100} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="production, web, api" maxLength={200} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{asset ? "Save Changes" : "Add Asset"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
