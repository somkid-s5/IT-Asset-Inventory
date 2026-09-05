"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppWindow, Plus, Search, ArchiveRestore } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import api from "@/services/api";
import { Application } from "@/lib/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");

  useEffect(
    () =>
      setHeader({
        title: "Applications",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Applications" },
        ],
      }),
    [setHeader],
  );
  const { data = [], isLoading } = useQuery({
    queryKey: ["applications", showArchived, query],
    queryFn: async () =>
      (
        await api.get<Application[]>("/applications", {
          params: { includeArchived: showArchived, q: query || undefined },
        })
      ).data,
  });
  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post("/applications", {
          name,
          technicalOwner: owner,
          businessUnit,
          environments: [{ name: "PROD" }],
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setOpen(false);
      setName("");
      setOwner("");
      setBusinessUnit("");
      toast.success("Application created");
    },
    onError: () => toast.error("Could not create application"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api.patch(`/applications/${id}/archive`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  const visible = useMemo(
    () => data.filter((app) => showArchived || app.status === "ACTIVE"),
    [data, showArchived],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Application topology</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Business services, environments, components, and access points.
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              onClick={() => setShowArchived((value) => !value)}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
          )}
          {canEdit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New application
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create application</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="application-name">Name</Label>
                    <Input
                      id="application-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-owner">Technical Owner</Label>
                    <Input
                      id="technical-owner"
                      value={owner}
                      onChange={(event) => setOwner(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="business-unit">Business Unit</Label>
                    <Input
                      id="business-unit"
                      value={businessUnit}
                      onChange={(event) => setBusinessUnit(event.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!name.trim() || create.isPending}
                    onClick={() => create.mutate()}
                  >
                    Create application
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search applications"
          className="pl-9"
          placeholder="Search applications, owners, or business units"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            Loading applications…
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="No applications found"
          description="Create the first application to start mapping its environments and components."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((app) => (
            <Card
              key={app.id}
              className="transition-colors hover:border-primary/50"
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg border bg-muted/30 p-2">
                      <AppWindow className="h-4 w-4 text-primary" />
                    </div>
                    <Link
                      href={`/dashboard/applications/${app.id}`}
                      className="truncate font-semibold hover:text-primary"
                    >
                      {app.name}
                    </Link>
                  </div>
                  <Badge
                    variant={app.status === "ACTIVE" ? "default" : "secondary"}
                  >
                    {app.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Environments
                    </p>
                    <p className="font-medium">{app.environments.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Access points
                    </p>
                    <p className="font-medium">{app.access.length}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Technical Owner: {app.technicalOwner || "Needs context"}
                  <br />
                  Business Unit: {app.businessUnit || "Needs context"}
                </div>
                {canEdit && app.status === "ACTIVE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => archive.mutate(app.id)}
                  >
                    Archive
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
