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
  LoaderCircle,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import {
  parseLinkedAppEntry,
  type DatabaseInventoryDetail,
} from "@/lib/database-inventory";

export default function DatabaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [database, setDatabase] = useState<DatabaseInventoryDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, boolean>
  >({});

  const loadDatabase = useCallback(
    async (id: string) => {
      try {
        const response = await api.get<DatabaseInventoryDetail>(
          `/databases/${id}`,
        );
        setDatabase(response.data);
      } catch {
        toast.error("ไม่สามารถโหลดรายละเอียดฐานข้อมูลได้");
        router.push("/dashboard/db");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (typeof params.id === "string") {
      void loadDatabase(params.id);
    }
  }, [loadDatabase, params.id]);

  useEffect(() => {
    if (!database) {
      return;
    }

    setHeader({
      title: database.name,
      breadcrumbs: [
        { label: "พื้นที่ทำงาน", href: "/dashboard" },
        { label: "ฐานข้อมูล", href: "/dashboard/db" },
        { label: database.name },
      ],
    });

    return () => {
      setHeader(null);
    };
  }, [database, setHeader]);

  const databaseStats = useMemo(() => {
    if (!database) {
      return { accounts: 0, appIps: 0 };
    }

    return {
      accounts: database.accounts.length,
      appIps: database.linkedApps.length,
    };
  }, [database]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-muted-foreground">
        <LoaderCircle className="mb-3 h-6 w-6 animate-spin text-foreground" />
        <p className="text-sm">กำลังโหลดรายละเอียดฐานข้อมูล...</p>
      </div>
    );
  }

  if (!database) {
    return (
      <div className="space-y-4 pb-8">
        <button
          onClick={() => router.push("/dashboard/db")}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าฐานข้อมูล
        </button>
        <div className="surface-panel p-4 text-sm text-muted-foreground">
          ไม่พบข้อมูลฐานข้อมูล
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

  const hostValue = database.port
    ? `${database.ipAddress}:${database.port}`
    : database.ipAddress;

  const properties = [
    {
      label: "ชื่อฐานข้อมูล",
      value: database.name || "--",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "เอ็นจิ้น",
      value: database.engine || "--",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "เวอร์ชัน",
      value: database.version || "--",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "สภาพแวดล้อม",
      value: database.environment || "--",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "โฮสต์ IP",
      value: hostValue || "--",
      note: database.host || "--",
      icon: <Server className="h-4 w-4" />,
    },
    {
      label: "ชื่อบริการ",
      value: database.serviceName || "--",
      icon: <Server className="h-4 w-4" />,
    },
  ];

  const detailColumns = [
    properties.filter((_, index) => index % 2 === 0),
    properties.filter((_, index) => index % 2 === 1),
  ];

  const getRoleBadgeClassName = (role?: string | null) => {
    const normalizedRole = (role ?? "").toLowerCase();

    if (normalizedRole.includes("dba")) {
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    }

    if (normalizedRole.includes("report")) {
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    }

    if (normalizedRole.includes("app")) {
      return "border-violet-500/25 bg-violet-500/10 text-violet-300";
    }

    if (normalizedRole.includes("dev")) {
      return "border-sky-500/25 bg-sky-500/10 text-sky-300";
    }

    return "border-border bg-muted text-foreground";
  };

  const getPrivilegeBadgeClassName = (privilege: string) => {
    const normalizedPrivilege = privilege.toLowerCase();

    if (
      normalizedPrivilege.includes("delete") ||
      normalizedPrivilege.includes("all")
    ) {
      return "border-rose-500/25 bg-rose-500/10 text-rose-300";
    }

    if (
      normalizedPrivilege.includes("insert") ||
      normalizedPrivilege.includes("update") ||
      normalizedPrivilege.includes("write")
    ) {
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    }

    return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  };

  return (
    <div className="workspace-page">
      <button
        onClick={() => router.push("/dashboard/db")}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Database Inventory
      </button>

      <section className="workspace-hero">
        <div className="flex flex-col gap-4">
          <div className="page-breadcrumb">
            <span>พื้นที่ทำงาน</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>ชั้นข้อมูล</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>ฐานข้อมูล</span>
            <span className="page-breadcrumb-separator">/</span>
            <span>{database.name}</span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="icon-chip h-11 w-11 shrink-0 text-foreground">
                  <Database className="h-5 w-5" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate font-display text-xl font-semibold uppercase tracking-[0.06em] text-foreground">
                      {database.note || "ระบบฐานข้อมูล"}
                    </h1>
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {database.environment}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="brand-chip">บัญชี <span className="font-medium normal-case tracking-normal text-foreground">{databaseStats.accounts}</span></div>
              <div className="brand-chip">IP แอป <span className="font-medium normal-case tracking-normal text-foreground">{databaseStats.appIps}</span></div>
              <div className="brand-chip">บริการ <span className="font-medium normal-case tracking-normal text-foreground">{database.serviceName || "--"}</span></div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              รายละเอียดฐานข้อมูล
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {detailColumns.map((column, columnIndex) => (
              <div key={`detail-column-${columnIndex}`} className="space-y-2">
                {column.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-2.5 py-1"
                  >
                    <div className="mt-0.5 text-muted-foreground">
                      {item.icon}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="truncate text-sm font-semibold text-foreground">
                        {item.value}
                      </div>
                      {item.note ? (
                        <div className="text-[11px] text-muted-foreground">
                          {item.note}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="space-y-2 pt-2 lg:pt-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                IP แอปพลิเคชันที่เกี่ยวข้อง
              </div>
              <div className="space-y-2">
                {database.linkedApps.length > 0 ? (
                  database.linkedApps.map((entry) => {
                    const linkedApp = parseLinkedAppEntry(entry);

                    return (
                      <div
                        key={entry}
                        className="flex items-start gap-2.5 py-1"
                      >
                        <div className="mt-0.5 text-muted-foreground">
                          <Server className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            IP แอปพลิเคชัน
                          </div>
                          <div className="font-mono text-sm font-semibold text-foreground">
                            {linkedApp.ipAddress || "--"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {linkedApp.description || "ไม่มีคำอธิบาย"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-sm text-muted-foreground">
                    ไม่มีข้อมูล IP แอปพลิเคชัน
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="surface-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              บัญชีฐานข้อมูล
            </h3>
          </div>

          <div className="table-shell">
            <div className="overflow-x-auto">
              <table className="table-frame min-w-[900px]">
                <thead>
                  <tr className="table-head-row">
                    <th className="px-3 py-2.5 font-medium">ชื่อผู้ใช้</th>
                    <th className="px-3 py-2.5 font-medium">รหัสผ่าน</th>
                    <th className="px-3 py-2.5 font-medium">บทบาท</th>
                    <th className="px-3 py-2.5 font-medium">สิทธิ์</th>
                    <th className="px-3 py-2.5 font-medium">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {database.accounts.map((account) => {
                    const revealed = Boolean(revealedPasswords[account.id]);

                    return (
                      <tr key={account.id} className="table-row">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <span className="font-mono text-[12px] font-semibold text-foreground">
                              {account.username}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void copyValue(account.username, "ชื่อผู้ใช้")
                              }
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-semibold tracking-[0.16em] text-foreground">
                              {revealed ? account.password : "************"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPasswords((current) => ({
                                  ...current,
                                  [account.id]: !revealed,
                                }))
                              }
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              {revealed ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void copyValue(account.password, "รหัสผ่าน")
                              }
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeClassName(account.role)}`}
                          >
                            {account.role || "--"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {account.privileges.map((privilege) => (
                              <span
                                key={privilege}
                                className={`rounded-md border px-2 py-1 text-[10px] font-medium ${getPrivilegeBadgeClassName(privilege)}`}
                              >
                                {privilege}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                          {account.note || "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
