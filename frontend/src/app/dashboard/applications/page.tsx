"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppWindow, Plus, Search, ArchiveRestore, ExternalLink } from "lucide-react";
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
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Application",
        cell: ({ row }) => (
          <Link href={`/dashboard/applications/${row.original.id}`} className="flex items-center gap-2 font-semibold hover:text-primary">
            <AppWindow className="h-4 w-4 text-primary" />
            {row.original.name}
            <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ),
      },
      {
        id: "ownership",
        header: "Owner / Business unit",
        cell: ({ row }) => <div className="text-sm text-muted-foreground"><div>{row.original.technicalOwner || "Needs context"}</div><div>{row.original.businessUnit || "Needs context"}</div></div>,
      },
      {
        id: "topology",
        header: "Topology",
        cell: ({ row }) => <span className="text-sm">{row.original.environments.length} env · {row.original.environments.reduce((count, env) => count + env.components.length, 0)} components · {row.original.access.length} access</span>,
      },
      {
        id: "completeness",
        header: "Completeness",
        cell: ({ row }) => <Badge variant={row.original.completeness?.complete ? "default" : "secondary"}>{row.original.completeness?.completeness ?? 0}%</Badge>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>{row.original.status}</Badge>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => user?.role === "ADMIN" && row.original.status === "ACTIVE" ? <Button variant="ghost" size="sm" onClick={() => archive.mutate(row.original.id)}>Archive</Button> : null,
      },
    ],
    [archive, user?.role],
  );
  const table = useReactTable({ data: visible, columns, getCoreRowModel: getCoreRowModel() });

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
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => <TableHead key={header.id} className={header.id === "actions" ? "text-right" : undefined}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => <TableRow key={row.id} className="group">{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : undefined}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
