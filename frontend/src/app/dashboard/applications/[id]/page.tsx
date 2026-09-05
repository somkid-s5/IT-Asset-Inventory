"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import api from "@/services/api";
import { Application } from "@/lib/application";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { setHeader } = usePageHeader();
  const { data, isLoading } = useQuery({
    queryKey: ["application", params.id],
    queryFn: async () =>
      (await api.get<Application>(`/applications/${params.id}`)).data,
    enabled: Boolean(params.id),
  });
  useEffect(
    () =>
      setHeader({
        title: data?.name ?? "Application",
        breadcrumbs: [
          { label: "Workspace", href: "/dashboard" },
          { label: "Applications", href: "/dashboard/applications" },
          { label: data?.name ?? "Details" },
        ],
      }),
    [data, setHeader],
  );
  if (isLoading)
    return (
      <p className="text-sm text-muted-foreground">Loading application…</p>
    );
  if (!data)
    return <p className="text-sm text-destructive">Application not found.</p>;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{data.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.description || "Application topology and operational access."}
          </p>
        </div>
        <Badge>{data.status}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ownership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Technical Owner:</span>{" "}
              {data.technicalOwner || "Needs context"}
            </p>
            <p>
              <span className="text-muted-foreground">Business Unit:</span>{" "}
              {data.businessUnit || "Needs context"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.access.length ? (
              data.access.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-muted-foreground">
                    {item.method} · {item.address}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.credentials.length} credential(s)
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No access points recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment topology</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {data.environments.map((env) => (
            <div key={env.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{env.name}</p>
                {env.noDatabase && <Badge variant="outline">No Database</Badge>}
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Components
              </p>
              {env.components.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {env.components.map((component) => (
                    <li key={component.id} className="space-y-1">
                      <p>{component.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(component.assets?.length ?? 0)} assets · {(component.virtualMachines?.length ?? 0)} VMs · {(component.logicalDatabases?.length ?? 0)} logical DBs
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No components yet.
                </p>
              )}
              {env.access?.length ? (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Access</p>
                  {env.access.map((access) => <p key={access.id} className="mt-1 text-xs">{access.label} · {access.method} · {access.address}</p>)}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
