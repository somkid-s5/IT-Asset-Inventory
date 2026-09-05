"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import api from "@/services/api";
import { Application } from "@/lib/application";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { AppWindow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { InventoryDocuments } from "@/components/InventoryDocuments";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [environmentDialog, setEnvironmentDialog] = useState(false);
  const [editApplicationDialog, setEditApplicationDialog] = useState(false);
  const [applicationForm, setApplicationForm] = useState({ name: "", technicalOwner: "", businessUnit: "", description: "" });
  const [editingEnvironment, setEditingEnvironment] = useState<{ id: string; name: "PROD" | "UAT" | "TEST"; noDatabase: boolean } | null>(null);
  const [componentDialog, setComponentDialog] = useState<{ environmentId: string } | null>(null);
  const [editingComponent, setEditingComponent] = useState<{ environmentId: string; id: string; name: string } | null>(null);
  const [accessDialog, setAccessDialog] = useState(false);
  const [environmentName, setEnvironmentName] = useState<"PROD" | "UAT" | "TEST">("PROD");
  const [componentName, setComponentName] = useState("");
  const [accessForm, setAccessForm] = useState({ label: "", address: "", method: "HTTPS", environmentId: "", username: "", password: "", role: "" });
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const { setHeader } = usePageHeader();
  const { data, isLoading } = useQuery({
    queryKey: ["application", params.id],
    queryFn: async () =>
      (await api.get<Application>(`/applications/${params.id}`)).data,
    enabled: Boolean(params.id),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["application", params.id] });
  const updateApplication = useMutation({ mutationFn: () => api.patch(`/applications/${params.id}`, applicationForm), onSuccess: () => { invalidate(); setEditApplicationDialog(false); toast.success("Application updated"); }, onError: () => toast.error("Could not update application") });
  const addEnvironment = useMutation({ mutationFn: () => api.post(`/applications/${params.id}/environments`, { name: environmentName }), onSuccess: () => { invalidate(); setEnvironmentDialog(false); toast.success("Environment added"); }, onError: () => toast.error("Could not add environment") });
  const updateEnvironment = useMutation({ mutationFn: () => api.patch(`/applications/${params.id}/environments/${editingEnvironment?.id}`, { name: editingEnvironment?.name, noDatabase: editingEnvironment?.noDatabase }), onSuccess: () => { invalidate(); setEditingEnvironment(null); toast.success("Environment updated"); }, onError: () => toast.error("Could not update environment") });
  const deleteEnvironment = useMutation({ mutationFn: (environmentId: string) => api.delete(`/applications/${params.id}/environments/${environmentId}`), onSuccess: () => { invalidate(); toast.success("Environment removed"); }, onError: () => toast.error("Could not remove environment") });
  const addComponent = useMutation({ mutationFn: () => api.post(`/applications/${params.id}/environments/${componentDialog?.environmentId}/components`, { name: componentName }), onSuccess: () => { invalidate(); setComponentDialog(null); setComponentName(""); toast.success("Component added"); }, onError: () => toast.error("Could not add component") });
  const updateComponent = useMutation({ mutationFn: () => api.patch(`/applications/${params.id}/environments/${editingComponent?.environmentId}/components/${editingComponent?.id}`, { name: editingComponent?.name }), onSuccess: () => { invalidate(); setEditingComponent(null); toast.success("Component updated"); }, onError: () => toast.error("Could not update component") });
  const deleteComponent = useMutation({ mutationFn: ({ environmentId, componentId }: { environmentId: string; componentId: string }) => api.delete(`/applications/${params.id}/environments/${environmentId}/components/${componentId}`), onSuccess: () => { invalidate(); toast.success("Component removed"); }, onError: () => toast.error("Could not remove component") });
  const addAccess = useMutation({ mutationFn: () => api.post(`/applications/${params.id}/access`, { label: accessForm.label, address: accessForm.address, method: accessForm.method, environmentId: accessForm.environmentId || undefined, credentials: accessForm.username ? [{ username: accessForm.username, password: accessForm.password, role: accessForm.role }] : [] }), onSuccess: () => { invalidate(); setAccessDialog(false); setAccessForm({ label: "", address: "", method: "HTTPS", environmentId: "", username: "", password: "", role: "" }); toast.success("Access point added"); }, onError: () => toast.error("Could not add access point") });
  const reveal = async (credentialId: string, accessId: string) => {
    try { const result = await api.get<{ password: string }>(`/applications/${params.id}/credentials/${credentialId}/password`); setRevealed((current) => ({ ...current, [`${accessId}:${credentialId}`]: result.data.password })); } catch { toast.error("Could not reveal password"); }
  };
  const canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
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
    return <EmptyState icon={AppWindow} title="Application not found" description="The application may have been archived or removed." />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{data.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.description || "Application topology and operational access."}
          </p>
        </div>
        <div className="flex items-center gap-2"><Badge>{data.status}</Badge>{canEdit && <><Button size="sm" variant="outline" onClick={() => { setApplicationForm({ name: data.name, technicalOwner: data.technicalOwner ?? "", businessUnit: data.businessUnit ?? "", description: data.description ?? "" }); setEditApplicationDialog(true); }}>Edit</Button><Button size="sm" variant="outline" onClick={() => setEnvironmentDialog(true)}>Add environment</Button><Button size="sm" onClick={() => setAccessDialog(true)}>Add access</Button></>}</div>
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
                    {item.method} · {user?.role === "ADMIN" || user?.role === "EDITOR" ? item.address : "Restricted"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.credentials.length} credential(s)
                  </p>
                  {item.credentials.map((credential) => <div key={credential.id} className="mt-2 flex items-center gap-2 text-xs"><span>{credential.username}</span>{canEdit && <Button type="button" size="xs" variant="outline" onClick={() => reveal(credential.id, item.id)}>{revealed[`${item.id}:${credential.id}`] ? revealed[`${item.id}:${credential.id}`] : "Reveal"}</Button>}</div>)}
                </div>
              ))
            ) : (
              <EmptyState icon={AppWindow} title="No access points" description="No application access points have been recorded yet." className="border-none bg-transparent py-4" />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment topology</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {data.environments.length === 0 ? (
            <EmptyState icon={AppWindow} title="No environments" description="Add PROD, UAT, or TEST context to describe this application." className="border-none bg-transparent md:col-span-3" />
          ) : data.environments.map((env) => (
            <div key={env.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{env.name}</p>
                <div className="flex items-center gap-2">{env.noDatabase && <Badge variant="outline">No Database</Badge>}{canEdit && <><Button size="xs" variant="outline" onClick={() => setEditingEnvironment({ id: env.id, name: env.name, noDatabase: env.noDatabase })}>Edit</Button><Button size="xs" variant="outline" onClick={() => setComponentDialog({ environmentId: env.id })}>Add component</Button><Button size="xs" variant="ghost" onClick={() => deleteEnvironment.mutate(env.id)}>Remove</Button></>}</div>
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Components
              </p>
              {env.components.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {env.components.map((component) => (
                    <li key={component.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2"><p>{component.name}</p>{canEdit && <span className="flex gap-1"><Button size="xs" variant="ghost" onClick={() => setEditingComponent({ environmentId: env.id, id: component.id, name: component.name })}>Edit</Button><Button size="xs" variant="ghost" onClick={() => deleteComponent.mutate({ environmentId: env.id, componentId: component.id })}>Remove</Button></span>}</div>
                      <p className="text-xs text-muted-foreground">
                        {(component.assets?.length ?? 0)} assets · {(component.virtualMachines?.length ?? 0)} VMs · {(component.logicalDatabases?.length ?? 0)} logical DBs
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={AppWindow} title="No components" description="Add a component to map compute and database dependencies." className="border-none bg-transparent py-4" />
              )}
              {env.access?.length ? (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Access</p>
                  {env.access.map((access) => <p key={access.id} className="mt-1 text-xs">{access.label} · {access.method} · {user?.role === "ADMIN" || user?.role === "EDITOR" ? access.address : "Restricted"}</p>)}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <InventoryDocuments documents={data.documentLinks} />
      <Dialog open={environmentDialog} onOpenChange={setEnvironmentDialog}><DialogContent><DialogHeader><DialogTitle>Add environment</DialogTitle></DialogHeader><div className="space-y-4"><Label>Environment</Label><Select value={environmentName} onValueChange={(value) => setEnvironmentName(value as typeof environmentName)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PROD">PROD</SelectItem><SelectItem value="UAT">UAT</SelectItem><SelectItem value="TEST">TEST</SelectItem></SelectContent></Select><Button className="w-full" onClick={() => addEnvironment.mutate()} disabled={addEnvironment.isPending}>Add environment</Button></div></DialogContent></Dialog>
      <Dialog open={editApplicationDialog} onOpenChange={setEditApplicationDialog}><DialogContent><DialogHeader><DialogTitle>Edit application</DialogTitle></DialogHeader><div className="space-y-3"><Label htmlFor="edit-app-name">Name</Label><Input id="edit-app-name" value={applicationForm.name} onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })} /><Label htmlFor="edit-app-owner">Technical Owner</Label><Input id="edit-app-owner" value={applicationForm.technicalOwner} onChange={(e) => setApplicationForm({ ...applicationForm, technicalOwner: e.target.value })} /><Label htmlFor="edit-app-unit">Business Unit</Label><Input id="edit-app-unit" value={applicationForm.businessUnit} onChange={(e) => setApplicationForm({ ...applicationForm, businessUnit: e.target.value })} /><Label htmlFor="edit-app-description">Description</Label><textarea id="edit-app-description" value={applicationForm.description} onChange={(e) => setApplicationForm({ ...applicationForm, description: e.target.value })} className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" /><Button className="w-full" onClick={() => updateApplication.mutate()} disabled={!applicationForm.name.trim() || updateApplication.isPending}>Save application</Button></div></DialogContent></Dialog>
      <Dialog open={Boolean(editingEnvironment)} onOpenChange={(open) => !open && setEditingEnvironment(null)}><DialogContent><DialogHeader><DialogTitle>Edit environment</DialogTitle></DialogHeader><div className="space-y-4"><Label>Environment</Label><Select value={editingEnvironment?.name} onValueChange={(value) => setEditingEnvironment((current) => current ? { ...current, name: value as typeof current.name } : current)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PROD">PROD</SelectItem><SelectItem value="UAT">UAT</SelectItem><SelectItem value="TEST">TEST</SelectItem></SelectContent></Select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingEnvironment?.noDatabase ?? false} onChange={(event) => setEditingEnvironment((current) => current ? { ...current, noDatabase: event.target.checked } : current)} /> No Database</label><Button className="w-full" onClick={() => updateEnvironment.mutate()} disabled={updateEnvironment.isPending}>Save environment</Button></div></DialogContent></Dialog>
      <Dialog open={Boolean(componentDialog)} onOpenChange={(open) => !open && setComponentDialog(null)}><DialogContent><DialogHeader><DialogTitle>Add component</DialogTitle></DialogHeader><div className="space-y-4"><Label htmlFor="component-name">Component name</Label><Input id="component-name" value={componentName} onChange={(event) => setComponentName(event.target.value)} placeholder="e.g. API" /><Button className="w-full" onClick={() => addComponent.mutate()} disabled={!componentName.trim() || addComponent.isPending}>Add component</Button></div></DialogContent></Dialog>
      <Dialog open={Boolean(editingComponent)} onOpenChange={(open) => !open && setEditingComponent(null)}><DialogContent><DialogHeader><DialogTitle>Edit component</DialogTitle></DialogHeader><div className="space-y-4"><Label htmlFor="edit-component-name">Component name</Label><Input id="edit-component-name" value={editingComponent?.name ?? ""} onChange={(event) => setEditingComponent((current) => current ? { ...current, name: event.target.value } : current)} /><Button className="w-full" onClick={() => updateComponent.mutate()} disabled={!editingComponent?.name.trim() || updateComponent.isPending}>Save component</Button></div></DialogContent></Dialog>
      <Dialog open={accessDialog} onOpenChange={setAccessDialog}><DialogContent><DialogHeader><DialogTitle>Add access point</DialogTitle></DialogHeader><div className="grid gap-3"><Input aria-label="Access label" placeholder="Label" value={accessForm.label} onChange={(e) => setAccessForm({ ...accessForm, label: e.target.value })} /><Input aria-label="Access address" placeholder="Address / URL" value={accessForm.address} onChange={(e) => setAccessForm({ ...accessForm, address: e.target.value })} /><Input aria-label="Access method" placeholder="Method (HTTPS, SSH)" value={accessForm.method} onChange={(e) => setAccessForm({ ...accessForm, method: e.target.value })} /><Select value={accessForm.environmentId || "none"} onValueChange={(value) => setAccessForm({ ...accessForm, environmentId: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="Environment (optional)" /></SelectTrigger><SelectContent><SelectItem value="none">Application-wide</SelectItem>{data.environments.map((env) => <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>)}</SelectContent></Select><Input aria-label="Username" placeholder="Username (optional)" value={accessForm.username} onChange={(e) => setAccessForm({ ...accessForm, username: e.target.value })} /><Input aria-label="Password" type="password" placeholder="Password" value={accessForm.password} onChange={(e) => setAccessForm({ ...accessForm, password: e.target.value })} /><Input aria-label="Credential role" placeholder="Credential role" value={accessForm.role} onChange={(e) => setAccessForm({ ...accessForm, role: e.target.value })} /><Button className="w-full" onClick={() => addAccess.mutate()} disabled={!accessForm.label.trim() || !accessForm.address.trim() || addAccess.isPending}>Add access point</Button></div></DialogContent></Dialog>
    </div>
  );
}
