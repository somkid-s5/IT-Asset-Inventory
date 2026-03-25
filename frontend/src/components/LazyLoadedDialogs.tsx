'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

// Simple loading skeleton without Dialog wrapper
function DialogSkeleton({ title = 'Loading...' }: { title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="surface-panel max-w-2xl p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <div className="flex items-center justify-center px-5 py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <p className="text-sm">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lazy load AssetFormDialog with loading skeleton
export const AssetFormDialog = dynamic(
  () => import('@/components/AssetFormDialog').then((mod) => mod.AssetFormDialog),
  {
    loading: () => <DialogSkeleton title="Loading Asset Form..." />,
    ssr: false,
  }
);

// Lazy load VmFormDialog
export const VmFormDialog = dynamic(
  () => import('@/components/VmFormDialog').then((mod) => mod.VmFormDialog),
  {
    loading: () => <DialogSkeleton title="Loading VM Form..." />,
    ssr: false,
  }
);

// Lazy load DatabaseFormDialog
export const DatabaseFormDialog = dynamic(
  () => import('@/components/DatabaseFormDialog').then((mod) => mod.DatabaseFormDialog),
  {
    loading: () => <DialogSkeleton title="Loading Database Form..." />,
    ssr: false,
  }
);
