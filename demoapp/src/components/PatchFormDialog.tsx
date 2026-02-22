import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PatchItem, PatchStatus } from "@/data/mockData";

interface PatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patch?: PatchItem | null;
  onSubmit: (data: Omit<PatchItem, "id">) => void;
}

const emptyForm = {
  assetName: "",
  software: "",
  currentVersion: "",
  latestVersion: "",
  eolDate: "",
  status: "unknown" as PatchStatus,
  cve: "",
  lastChecked: new Date().toISOString(),
};

export function PatchFormDialog({ open, onOpenChange, patch, onSubmit }: PatchFormDialogProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (patch) {
      setForm({
        assetName: patch.assetName,
        software: patch.software,
        currentVersion: patch.currentVersion,
        latestVersion: patch.latestVersion,
        eolDate: patch.eolDate || "",
        status: patch.status,
        cve: patch.cve.join(", "),
        lastChecked: patch.lastChecked,
      });
    } else {
      setForm(emptyForm);
    }
  }, [patch, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetName.trim() || !form.software.trim()) return;
    onSubmit({
      assetName: form.assetName.trim(),
      software: form.software.trim(),
      currentVersion: form.currentVersion.trim(),
      latestVersion: form.latestVersion.trim(),
      eolDate: form.eolDate || null,
      status: form.status,
      cve: form.cve.split(",").map((c) => c.trim()).filter(Boolean),
      lastChecked: form.lastChecked,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{patch ? "Edit Patch" : "Add Patch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="assetName">Asset Name *</Label>
              <Input id="assetName" value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="software">Software *</Label>
              <Input id="software" value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentVersion">Current Version</Label>
              <Input id="currentVersion" value={form.currentVersion} onChange={(e) => setForm({ ...form, currentVersion: e.target.value })} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="latestVersion">Latest Version</Label>
              <Input id="latestVersion" value={form.latestVersion} onChange={(e) => setForm({ ...form, latestVersion: e.target.value })} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PatchStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="outdated">Outdated</SelectItem>
                  <SelectItem value="eol">EOL</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eolDate">EOL Date</Label>
              <Input id="eolDate" type="date" value={form.eolDate} onChange={(e) => setForm({ ...form, eolDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cve">CVEs (comma-separated)</Label>
            <Input id="cve" value={form.cve} onChange={(e) => setForm({ ...form, cve: e.target.value })} placeholder="CVE-2023-1234, CVE-2024-5678" maxLength={500} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{patch ? "Save Changes" : "Add Patch"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
