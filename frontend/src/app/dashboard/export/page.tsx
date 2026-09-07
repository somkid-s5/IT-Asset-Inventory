"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Download, FileKey2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export default function InventoryExportPage() {
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const [isExporting, setIsExporting] = useState(false);
  const form = useForm<{
    passphrase: string;
    confirm: string;
    currentPassword: string;
  }>();

  useEffect(
    () =>
      setHeader({
        title: "Sensitive Inventory Export",
        breadcrumbs: [
          { label: "System" },
          { label: "Sensitive Inventory Export" },
        ],
      }),
    [setHeader],
  );

  if (user?.role !== "ADMIN") {
    return (
      <Alert variant="warning">
        <AlertTitle>Administrator access required</AlertTitle>
        <AlertDescription>
          Only Admins can create encrypted inventory workbooks.
        </AlertDescription>
      </Alert>
    );
  }

  const handleSubmit = async (values: {
    passphrase: string;
    confirm: string;
    currentPassword: string;
  }) => {
    if (values.passphrase.length < 8) {
      toast.error("Use at least 8 characters for the workbook password");
      return;
    }
    if (values.passphrase !== values.confirm) {
      toast.error("Password confirmation does not match");
      return;
    }

    setIsExporting(true);
    try {
      const response = await api.post(
        "/export/inventory",
        {
          passphrase: values.passphrase,
          confirmPassphrase: values.confirm,
          currentPassword: values.currentPassword,
        },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      form.reset();
      toast.success("Encrypted inventory workbook downloaded");
    } catch {
      toast.error("Export failed. Check your permissions and try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-base font-semibold">
          Sensitive Inventory Workbook
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a controlled hand-off snapshot with archived inventory,
          topology relationships, usernames, and stored operational passwords.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileKey2 className="h-4 w-4 text-primary" />
            Encrypted XLSX export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <Alert variant="info">
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                This encrypted workbook contains stored operational passwords in
                plaintext after it is opened. The new workbook passphrase is not
                stored by the application. Deliver the passphrase separately
                from the file and keep both under your team&apos;s approved
                handling controls.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="current-password">
                Confirm your account password
              </Label>
              <Input
                id="current-password"
                type="password"
                {...form.register("currentPassword", { required: true })}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-passphrase">Workbook password</Label>
              <Input
                id="export-passphrase"
                type="password"
                {...form.register("passphrase", {
                  required: true,
                  minLength: 8,
                })}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-confirm">Confirm workbook password</Label>
              <Input
                id="export-confirm"
                type="password"
                {...form.register("confirm", { required: true })}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              {isExporting ? "Preparing workbook…" : "Download encrypted XLSX"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
