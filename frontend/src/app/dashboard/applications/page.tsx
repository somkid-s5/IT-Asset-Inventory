"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppWindow, Plus, Search, ArchiveRestore, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
  getPaginationRowModel,
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
  const form = useForm<{ name: string; technicalOwner: string; businessUnit: string }>({ defaultValues: { name: "", technicalOwner: "", businessUnit: "" } });

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
    mutationFn: async (values: { name: string; technicalOwner: string; businessUnit: string }) =>
      (
        await api.post("/applications", {
          name: values.name,
          technicalOwner: values.technicalOwner,
          businessUnit: values.businessUnit,
          environments: [{ name: "PROD" }],
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setOpen(false);
      form.reset();
      toast.success("Application created");
    },
    onError: () => toast.error("Could not create application"),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api.patch(`/applications/${id}/archive`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.patch(`/applications/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
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
        cell: ({ row }) => user?.role === "ADMIN" && row.original.status === "ACTIVE" ? <Button variant="ghost" size="sm" onClick={() => archive.mutate(row.original.id)}>Archive</Button> : user?.role === "ADMIN" && row.original.status === "ARCHIVED" ? <Button variant="ghost" size="sm" onClick={() => restore.mutate(row.original.id)}>Restore</Button> : null,
      },
    ],
    [archive, restore, user?.role],
  );
  const table = useReactTable({
    data: visible,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  });

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
                <form className="space-y-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
                  <div>
                    <Label htmlFor="application-name">Name</Label>
                    <Input
                      id="application-name"
                      {...form.register("name", { required: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="technical-owner">Technical Owner</Label>
                    <Input
                      id="technical-owner"
                      {...form.register("technicalOwner")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="business-unit">Business Unit</Label>
                    <Input
                      id="business-unit"
                      {...form.register("businessUnit")}
                    />
                  </div>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={create.isPending}
                  >
                    Create application
                  </Button>
                </form>
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
        <div className="space-y-3">
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
          {table.getPageCount() > 1 && (
          <div className="flex items-center justify-end gap-3 pt-3 text-sm">
            <span className="text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
