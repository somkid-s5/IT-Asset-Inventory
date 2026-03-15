import { ReactNode } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface StatItem {
  label: string;
  value: string;
}

interface TableColumn {
  key: string;
  label: string;
  className?: string;
}

interface TableRow {
  id: string;
  [key: string]: string | number;
}

interface DomainWorkspacePageProps {
  eyebrow: string;
  title: string;
  description: string;
  stats: StatItem[];
  checklistTitle: string;
  checklist: string[];
  columns: TableColumn[];
  rows: TableRow[];
  noteTitle: string;
  note: string;
  footerHint: string;
  actions?: ReactNode;
}

export function DomainWorkspacePage({
  eyebrow,
  title,
  description,
  stats,
  checklistTitle,
  checklist,
  columns,
  rows,
  noteTitle,
  note,
  footerHint,
  actions,
}: DomainWorkspacePageProps) {
  return (
    <div className="space-y-4 pb-8">
      <section className="surface-panel p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>
          </div>

          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-background px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-base font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Inventory Overview</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{footerHint}</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                Ready for API model
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {columns.map((column) => (
                    <th key={column.key} className={`px-3 py-3 font-medium ${column.className ?? ''}`}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/80 transition-colors hover:bg-accent/60 last:border-b-0">
                    {columns.map((column) => (
                      <td key={`${row.id}-${column.key}`} className={`px-3 py-3 text-[12px] text-foreground ${column.className ?? ''}`}>
                        <span className={column.key === 'name' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                          {String(row[column.key] ?? '--')}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{checklistTitle}</h3>
            <div className="mt-3 space-y-2">
              {checklist.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                  <span className="text-xs leading-5 text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-panel p-4">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{noteTitle}</h3>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{note}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
