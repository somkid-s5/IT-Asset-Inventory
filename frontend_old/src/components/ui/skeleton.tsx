import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className || ''}`}
      {...props}
    />
  );
}

interface SkeletonPageProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 1, className }: SkeletonPageProps) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 && lines > 1 ? 'w-3/4' : undefined}
        />
      ))}
      <style>{`.${className || ''}`}</style>
    </div>
  );
}
