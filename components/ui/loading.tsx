import * as React from 'react';
import { cn } from '@/lib/ui';

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin h-5 w-5', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

interface LoadingProps {
  variant?: 'spinner' | 'skeleton';
  className?: string;
  rows?: number;
}

function Loading({ variant = 'spinner', className, rows = 3 }: LoadingProps) {
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-center', className)} role="status" aria-label="Loading">
      <Spinner />
    </div>
  );
}

export { Spinner, Skeleton, Loading };