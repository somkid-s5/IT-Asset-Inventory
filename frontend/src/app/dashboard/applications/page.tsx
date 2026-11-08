"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AppWindow,
  ArchiveRestore,
  ExternalLink,
  Globe2,
  Plus,
  Search,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import api from "@/services/api";
import { Application, ApplicationEnvironmentName } from "@/lib/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import {
  EnvironmentBadge,
  InventoryPagination,
  InventoryRowActions,
  InventoryTableShell,
  InventoryTableToolbar,
  MissingValue,
  QualityBadge,
  RecordStatusBadge,
} from "@/components/inventory";
import { useInventoryQueryState } from "@/lib/inventory-query-state";
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

type ApplicationFormValues = {
  name: string;
  description: string;
  technicalOwner: string;
  businessUnit: string;
  environment: ApplicationEnvironmentName;
  accessLabel: string;
  accessAddress: string;
  accessMethod: string;
};

function getPrimaryAccess(application: Application) {
  const environmentOrder = new Map([
    ["PROD", 0],
    ["UAT", 1],
    ["TEST", 2],
  ]);
  return [...application.access]
    .filter((access) => access.isPrimary)
    .sort(
      (left, right) =>
        (environmentOrder.get(left.environment?.name ?? "") ?? 99) -
          (environmentOrder.get(right.environment?.name ?? "") ?? 99) ||
        left.sortOrder - right.sortOrder,
    )[0];
}

function isHttpAddress(address: string) {
  return /^https?:\/\//i.test(address);
}

function getTopologyCounts(application: Application) {
  const linkedRecordIds = new Set<string>();
  let components = 0;
  let access = 0;

  for (const environment of application.environments) {
    components += environment.components.length;
    access += environment.access?.length ?? 0;
    for (const component of environment.components) {
      component.assets?.forEach((asset) => linkedRecordIds.add(`asset:${asset.id}`));
      component.virtualMachines?.forEach((vm) => linkedRecordIds.add(`vm:${vm.id}`));
      component.logicalDatabases?.forEach((logical) =>
        linkedRecordIds.add(`logical-database:${logical.id}`),
      );
    }
  }

  return { components, linkedRecords: linkedRecordIds.size, access };
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const { setHeader } = usePageHeader();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const form = useForm<ApplicationFormValues>({
    defaultValues: {
      name: "",
      description: "",
      technicalOwner: "",
      businessUnit: "",
      environment: "PROD",
      accessLabel: "Primary application URL",
      accessAddress: "",
      accessMethod: "HTTPS",
    },
  });

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

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 150);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const applicationsQuery = useQuery({
    queryKey: ["applications", showArchived, query],
    queryFn: async () =>
      (
        await api.get<Application[]>("/applications", {
          params: { includeArchived: showArchived, q: query || undefined },
        })
      ).data,
  });
  const data = applicationsQuery.data ?? [];
  const isSearchSettled = searchInput.trim() === query;

  const create = useMutation({
    mutationFn: async (values: ApplicationFormValues) =>
      (
        await api.post("/applications", {
          name: values.name,
          description: values.description,
          technicalOwner: values.technicalOwner,
          businessUnit: values.businessUnit,
          environments: [
            {
              name: values.environment,
              access: values.accessAddress.trim()
                ? [
                    {
                      label: values.accessLabel.trim() || "Primary application URL",
                      address: values.accessAddress.trim(),
                      method: values.accessMethod.trim() || "HTTPS",
                      isPrimary: true,
                    },
                  ]
                : [],
            },
          ],
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
    () =>
      (isSearchSettled ? data : []).filter(
        (app) => showArchived || app.status === "ACTIVE",
      ),
    [data, isSearchSettled, showArchived],
  );
  const queryState = useInventoryQueryState(applicationsQuery, {
    hasData: isSearchSettled && applicationsQuery.data !== undefined,
    hasRecords: visible.length > 0,
    isFiltered: Boolean(query.trim()) || showArchived,
  });

  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Application",
        cell: ({ row }) => (
          <div className="w-[240px] min-w-[240px] max-w-[240px]">
            <Link
              href={`/dashboard/applications/${row.original.id}`}
              className="group flex items-center gap-2 font-semibold hover:text-primary"
            >
              <AppWindow className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{row.original.name}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {row.original.description || <MissingValue kind="needs-context" />}
            </p>
          </div>
        ),
      },
      {
        id: "ownership",
        header: "Ownership",
        cell: ({ row }) => (
          <dl className="min-w-[170px] space-y-1 text-xs">
            <div>
              <dt className="inline text-muted-foreground">Technical: </dt>
              <dd className="inline font-medium text-foreground">{row.original.technicalOwner || <MissingValue kind="needs-context" />}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Business: </dt>
              <dd className="inline font-medium text-foreground">{row.original.businessUnit || <MissingValue kind="needs-context" />}</dd>
            </div>
          </dl>
        ),
      },
      {
        id: "environments",
        header: "Environments",
        cell: ({ row }) => (
          <div className="min-w-[130px] space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {row.original.environments.length ? row.original.environments.map((environment) => (
                <EnvironmentBadge key={environment.id} value={environment.name} role={null} className="px-1.5 py-0 text-[10px]" />
              )) : <MissingValue compact />}
            </div>
            <p className="text-xs text-muted-foreground">
              {getTopologyCounts(row.original).components} components
            </p>
          </div>
        ),
      },
      {
        id: "primaryAccess",
        header: "Primary URL / access",
        cell: ({ row }) => {
          const access = getPrimaryAccess(row.original);
          if (!access) return <MissingValue compact />;
          const isHttpUrl = isHttpAddress(access.address);
          return (
            <div className="min-w-[190px]">
              <p className="text-xs font-medium">{access.label}</p>
              {access.environment?.name ? (
                <p className="text-[10px] text-muted-foreground">
                  Primary access · {access.environment.name}
                </p>
              ) : null}
              {isHttpUrl ? (
                <a href={access.address} target="_blank" rel="noreferrer" className="block max-w-[230px] truncate text-xs text-primary hover:underline" title={access.address}>
                  {access.address}
                </a>
              ) : (
                <p className="max-w-[230px] truncate font-mono text-xs text-muted-foreground" title={access.address}>
                  {access.address}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{access.method}</p>
            </div>
          );
        },
      },
      {
        id: "links",
        header: "Inventory links",
        cell: ({ row }) => {
          const counts = getTopologyCounts(row.original);
          return <span className="whitespace-nowrap text-xs text-muted-foreground">{counts.linkedRecords} linked records · {counts.access} access</span>;
        },
      },
      {
        id: "completeness",
        header: "Profile & topology",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <QualityBadge value={row.original.completeness?.complete ? "COMPLETE" : "NEEDS_CONTEXT"} role={null} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {row.original.completeness?.completeness ?? 0}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <RecordStatusBadge
            value={row.original.status}
            displayValue={row.original.status}
            role={null}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <InventoryRowActions
            recordLabel={row.original.name}
            detailHref={`/dashboard/applications/${row.original.id}`}
            viewActionLabel="View application details"
            inlineLifecycleActions
            menuRecordLabel={
              /archive/i.test(row.original.name)
                ? "the selected application"
                : row.original.name
            }
            lifecycle={{
              status: row.original.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
              archive: {
                allowed: user?.role === "ADMIN" && row.original.status === "ACTIVE",
                onSelect: () => archive.mutate(row.original.id),
              },
              restore: {
                allowed: user?.role === "ADMIN" && row.original.status === "ARCHIVED",
                onSelect: () => restore.mutate(row.original.id),
              },
            }}
          />
        ),
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
      <InventoryTableShell
        title="Application registry"
        description="Applications, owners, environments, access points, and linked infrastructure."
        toolbar={
          <div className="space-y-3">
            <div className="flex flex-wrap justify-end gap-2">
          {user?.role === "ADMIN" && (
            <Button
              variant="outline"
              onClick={() => {
                // Defer the query-key change until the native click sequence
                // has completed so the action remains reliable during a
                // client-side data refresh.
                window.setTimeout(() => setShowArchived((value) => !value), 0);
              }}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
          )}
          {canEdit && (
            <Dialog
              open={open}
              onOpenChange={setOpen}
            >
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New application</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create application</DialogTitle>
                  <DialogDescription>Start with the application profile. Add components, databases, and credentials from the detail page after creation.</DialogDescription>
                </DialogHeader>
                <form className="space-y-6" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">Application profile</h3>
                      <p className="text-xs text-muted-foreground">The identity and ownership fields shown in the registry table.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor="application-name">Application name <span className="text-destructive">*</span></Label>
                        <Input id="application-name" placeholder="e.g. ERP Portal" {...form.register("name", { required: true })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="application-description">Description</Label>
                        <Textarea id="application-description" placeholder="What does this application do?" rows={3} {...form.register("description")} />
                      </div>
                      <div>
                        <Label htmlFor="technical-owner">Technical owner</Label>
                        <Input id="technical-owner" placeholder="Team or person" {...form.register("technicalOwner")} />
                      </div>
                      <div>
                        <Label htmlFor="business-unit">Business unit</Label>
                        <Input id="business-unit" placeholder="Owning department" {...form.register("businessUnit")} />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start gap-2">
                      <Globe2 className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <h3 className="text-sm font-semibold">Initial environment and access</h3>
                        <p className="text-xs text-muted-foreground">This creates one environment and an optional primary URL/access point. More topology can be mapped later.</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="application-environment">Environment</Label>
                        <select id="application-environment" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring" {...form.register("environment")}>
                          <option value="PROD">PROD</option>
                          <option value="UAT">UAT</option>
                          <option value="TEST">TEST</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="application-access-method">Access method</Label>
                        <Input id="application-access-method" placeholder="HTTPS, SSH, API" {...form.register("accessMethod")} />
                      </div>
                      <div>
                        <Label htmlFor="application-access-label">Access label</Label>
                        <Input id="application-access-label" placeholder="Primary application URL" {...form.register("accessLabel")} />
                      </div>
                      <div>
                        <Label htmlFor="application-access-address">URL or address</Label>
                        <Input id="application-access-address" placeholder="https://app.internal.example or 10.0.0.20:8443" {...form.register("accessAddress")} />
                      </div>
                    </div>
                  </section>

                  <Button className="w-full" type="submit" disabled={create.isPending}>
                    {create.isPending ? "Creating application…" : "Create application"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
            </div>
          <InventoryTableToolbar
            search={
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input aria-label="Search applications" className="pl-9" placeholder="Search applications, owners, or business units" defaultValue="" onChange={(event) => setSearchInput(event.target.value)} />
              </div>
            }
          />
          </div>
        }
        state={queryState.state}
        hasStaleData={queryState.hasStaleData}
        onRetry={() => void applicationsQuery.refetch()}
        emptyState={<EmptyState icon={AppWindow} title="No applications yet" description="Create the first application to start mapping its environments and components." />}
        filteredEmptyState={<EmptyState icon={AppWindow} title="No applications found" description="No applications match the current search or archived filter." />}
        pagination={
          <InventoryPagination
            page={table.getState().pagination.pageIndex + 1}
            pageSize={table.getState().pagination.pageSize}
            total={visible.length}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            onPageSizeChange={(pageSize) => {
              table.setPageSize(pageSize);
              table.setPageIndex(0);
            }}
          />
        }
      >
        <div className="space-y-3">
          <div className="space-y-3 md:hidden">
            {table.getRowModel().rows.map((row) => {
              const application = row.original;
              const counts = getTopologyCounts(application);
              const primaryAccess = getPrimaryAccess(application);

              return (
                <Card key={row.id} role="article" aria-label={`Application ${application.name}`} className="overflow-hidden">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/applications/${application.id}`}
                          className="flex min-h-11 items-center gap-2 font-semibold hover:text-primary"
                        >
                          <AppWindow className="h-4 w-4 shrink-0 text-primary" />
                          <span className="break-words">{application.name}</span>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {application.description || <MissingValue kind="needs-context" />}
                        </p>
                      </div>
                      <RecordStatusBadge
                        value={application.status}
                        displayValue={application.status}
                        role={null}
                      />
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border/60 py-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Technical owner</dt>
                        <dd className="mt-1 font-medium">{application.technicalOwner || <MissingValue kind="needs-context" />}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Business unit</dt>
                        <dd className="mt-1 font-medium">{application.businessUnit || <MissingValue kind="needs-context" />}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Environments</dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-1.5">
                          {application.environments.length ? application.environments.map((environment) => (
                            <EnvironmentBadge key={environment.id} value={environment.name} role={null} className="px-1.5 py-0 text-[10px]" />
                          )) : <MissingValue compact />}
                          <span className="text-muted-foreground">· {counts.components} components</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Linked records</dt>
                        <dd className="mt-1 font-medium">{counts.linkedRecords}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Access points</dt>
                        <dd className="mt-1 font-medium">{counts.access}</dd>
                      </div>
                      {primaryAccess ? (
                        <div className="col-span-2 min-w-0">
                          <dt className="text-muted-foreground">
                            Primary access{primaryAccess.environment?.name ? ` · ${primaryAccess.environment.name}` : ""}
                          </dt>
                          <dd className="mt-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                              <span className="font-medium">{primaryAccess.label}</span>
                              <span className="text-muted-foreground">({primaryAccess.method})</span>
                            </div>
                            {isHttpAddress(primaryAccess.address) ? (
                              <a
                                href={primaryAccess.address}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block min-h-11 break-all rounded-md font-mono text-[11px] text-primary underline-offset-2 hover:underline"
                              >
                                {primaryAccess.address}
                              </a>
                            ) : (
                              <p className="mt-1 min-h-11 break-all font-mono text-[11px] text-muted-foreground">
                                {primaryAccess.address}
                              </p>
                            )}
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Profile &amp; topology</span>
                        <QualityBadge value={application.completeness?.complete ? "COMPLETE" : "NEEDS_CONTEXT"} role={null} />
                        <span className="tabular-nums">{application.completeness?.completeness ?? 0}%</span>
                      </div>
                      <InventoryRowActions
                        recordLabel={application.name}
                        detailHref={`/dashboard/applications/${application.id}`}
                        viewActionLabel="View application details"
                        inlineLifecycleActions
                        menuRecordLabel={/archive/i.test(application.name) ? "the selected application" : application.name}
                        lifecycle={{
                          status: application.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
                          archive: {
                            allowed: user?.role === "ADMIN" && application.status === "ACTIVE",
                            onSelect: () => archive.mutate(application.id),
                          },
                          restore: {
                            allowed: user?.role === "ADMIN" && application.status === "ARCHIVED",
                            onSelect: () => restore.mutate(application.id),
                          },
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[1160px]">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="group align-top">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </InventoryTableShell>
    </div>
  );
}
