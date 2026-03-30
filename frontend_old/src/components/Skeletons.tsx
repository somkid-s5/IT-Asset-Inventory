import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="mt-6 stats-grid sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-tile space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface-panel p-4 space-y-4">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64 mt-2" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
            <Skeleton className="h-8 w-full mt-2" />
          </div>

          <div className="surface-panel p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function AssetsTableSkeleton() {
  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-2xl" />
          ))}
          <Skeleton className="h-3 w-24 ml-auto" />
        </div>
      </section>

      <section className="mt-6 table-shell">
        <div className="overflow-x-auto">
          <table className="table-frame min-w-[860px]">
            <thead>
              <tr className="table-head-row">
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} className="px-3 py-2.5">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="table-row">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Skeleton className="h-4.5 w-16 rounded-md" />
                  </td>
                  <td className="px-3 py-2.5">
                    <Skeleton className="h-3 w-12" />
                  </td>
                  <td className="px-3 py-2.5">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="px-3 py-2.5">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Skeleton className="h-7 w-7 rounded-lg" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function VmTableSkeleton() {
  return <AssetsTableSkeleton />;
}

export function DatabaseTableSkeleton() {
  return <AssetsTableSkeleton />;
}

export function UsersTableSkeleton() {
  return <AssetsTableSkeleton />;
}
