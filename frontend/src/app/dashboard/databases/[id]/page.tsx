"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Database,
  Eye,
  EyeOff,
  Globe,
  Hash,
  LoaderCircle,
  Server,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import {
  parseLinkedAppEntry,
  type DatabaseInventoryDetail,
} from "@/lib/database-inventory";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DatabaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [database, setDatabase] = useState<DatabaseInventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const loadDatabase = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await api.get<DatabaseInventoryDetail>(`/databases/${id}`);
      setDatabase(response.data);
    } catch {
      toast.error("Failed to load database details");
      router.push("/dashboard/databases");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof params.id === "string") void loadDatabase(params.id);
  }, [loadDatabase, params.id]);

  useEffect(() => {
    if (!database) return;
    setHeader({
      title: database.name,
      breadcrumbs: [
        { label: "Workspace", href: "/dashboard" },
        { label: "Databases", href: "/dashboard/databases" },
        { label: database.name },
      ],
    });
    return () => setHeader(null);
  }, [database, setHeader]);

  const databaseStats = useMemo(() => {
    if (!database) return { accounts: 0, appIps: 0 };
    return { accounts: database.accounts.length, appIps: database.linkedApps.length };
  }, [database]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading database details...</p>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="space-y-4 pb-8">
        <button onClick={() => router.push("/dashboard/databases")} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Databases
        </button>
        <div className="glass-card p-8 text-center text-sm text-muted-foreground">
          Database not found
        </div>
      </div>
    );
  }

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`คัดลอก ${label} แล้ว`);
    } catch {
      toast.error(`ไม่สามารถคัดลอก ${label.toLowerCase()} ได้`);
    }
  };

  const hostValue = database.port ? `${database.ipAddress}:${database.port}` : database.ipAddress;

  const properties = [
    { label: "Database Name", value: database.name || "--", icon: <Database className="h-4 w-4" /> },
    { label: "Engine", value: database.engine || "--", icon: <Tag className="h-4 w-4" /> },
    { label: "เวอร์ชัน", value: database.version || "--", icon: <Hash className="h-4 w-4" /> },
    { label: "สภาพแวดล้อม", value: database.environment || "--", icon: <Globe className="h-4 w-4" /> },
    { label: "โฮสต์ IP", value: hostValue || "--", note: database.host || "--", icon: <Server className="h-4 w-4" /> },
    { label: "ชื่อบริการ", value: database.serviceName || "--", icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  const getRoleBadge = (role?: string | null) => {
    const normalizedRole = (role ?? "").toLowerCase();
    if (normalizedRole.includes("dba")) return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    if (normalizedRole.includes("report")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (normalizedRole.includes("app")) return "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400";
    if (normalizedRole.includes("dev")) return "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400";
    return "border-border bg-muted text-foreground";
  };

  const getPrivilegeBadge = (privilege: string) => {
    const p = privilege.toLowerCase();
    if (p.includes("delete") || p.includes("all")) return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    if (p.includes("insert") || p.includes("update") || p.includes("write")) return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    return "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="workspace-page space-y-6 pt-2">
      <div className="flex justify-between items-center">
        <button onClick={() => router.push("/dashboard/databases")} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าฐานข้อมูล
        </button>
      </div>

      <section className="glass-card overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

          <div className="flex items-start gap-5 relative z-10">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
              <Database className="h-7 w-7" />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-[500px]" title={database.note || database.name}>
                  {database.note || "Database System"}
                </h1>
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  {database.environment}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground min-w-0">
                <span className="font-semibold text-foreground/80 shrink-0">{database.engine}</span>
                <span className="flex items-center gap-1.5 shrink-0"><Hash className="h-3.5 w-3.5" /> Version: <span className="text-foreground">{database.version}</span></span>
                <span className="flex items-center gap-1.5 truncate max-w-[300px]"><Globe className="h-3.5 w-3.5 shrink-0" /> Host: <span className="font-mono text-xs text-foreground truncate">{hostValue}</span></span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end relative z-10">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2">
               <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Accounts</span>
               <span className="text-lg font-bold text-primary">{databaseStats.accounts}</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 px-4 py-2">
               <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Linked Apps</span>
               <span className="text-lg font-bold text-info">{databaseStats.appIps}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-card p-6 sm:p-8">
          <div className="border-b border-border/50 pb-3 mb-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" /> Database Details
              </h2>          </div>
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
             {properties.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.icon} {item.label}
                  </div>
                  <div className="text-sm font-semibold text-foreground pl-6">
                    {item.value}
                    {item.note && <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{item.note}</div>}
                  </div>
                </div>
             ))}
          </div>
        </section>

        <section className="glass-card p-6 sm:p-8">
          <div className="border-b border-border/50 pb-3 mb-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" /> Connected Application IPs
          </h2>
        </div>
        <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
          {database.linkedApps.length > 0 ? (
            database.linkedApps.map((entry) => {
              const linkedApp = parseLinkedAppEntry(entry);
              return (
                <div key={entry} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-bold text-foreground">{linkedApp.ipAddress || "--"}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{linkedApp.description || "No description"}</div>
                  </div>
                  <button onClick={() => { void navigator.clipboard.writeText(linkedApp.ipAddress || ''); toast.success('IP copied'); }} className="text-primary hover:text-primary/80 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                    Copy
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">No application IP data found</div>
          )}
        </div>
      </section>
    </div>

    <section className="glass-card overflow-hidden">
      <div className="p-6 border-b border-border/50">
         <h2 className="text-lg font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-500"/> Database Accounts</h2>
      </div>
      <div className="p-0 overflow-x-auto">
        {database.accounts.length === 0 ? (
           <div className="p-8 text-center text-sm text-muted-foreground">No saved accounts found</div>
        ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Password</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Privileges</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {database.accounts.map(account => {
                  const isRev = revealedPasswords[account.id];
                  return (
                    <tr key={account.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="font-mono font-semibold">{account.username}</span>
                           <button onClick={() => { void copyValue(account.username, 'Username'); }} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="font-mono bg-muted/50 px-2 py-1 rounded-md min-w-[160px] text-center font-semibold tabular-nums transition-all">
                             {isRev ? account.password : '••••••••••••'}
                           </div>
                           <button onClick={() => setRevealedPasswords(c => ({...c, [account.id]: !isRev}))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                             {isRev ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                           <button onClick={() => { void copyValue(account.password, 'Password'); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                             <Copy className="h-4 w-4" />
                           </button>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className={cn("px-2.5 py-1 border rounded-md text-[11px] font-semibold", getRoleBadge(account.role))}>{account.role || '--'}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {account.privileges.map(priv => <span key={priv} className={cn("px-2 py-1 border rounded-md text-[11px] font-semibold", getPrivilegeBadge(priv))}>{priv}</span>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{account.note || '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </motion.div>
  );
}
