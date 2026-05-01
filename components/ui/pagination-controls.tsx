import Link from 'next/link';
import { cn } from '@/lib/ui';
import { Button } from './button';

export interface PaginationControlsProps {
  /** 1-indexed current page */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Base URL for page links (default: /browse) */
  baseUrl?: string;
  /** Additional query params to preserve (e.g. { q: 'cyber', category: 'gaming' }) */
  preserveParams?: Record<string, string>;
  /** Additional className for the wrapper */
  className?: string;
}

function buildUrl(baseUrl: string, page: number, preserveParams?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (preserveParams) {
    for (const [k, v] of Object.entries(preserveParams)) {
      if (v) params.set(k, v);
    }
  }
  params.set('page', String(page));
  const query = params.toString();
  return `${baseUrl}${query ? `?${query}` : ''}`;
}

export function PaginationControls({
  currentPage,
  totalPages,
  baseUrl = '/browse',
  preserveParams,
  className,
}: PaginationControlsProps) {
  // Show nothing when there's only one page (or zero/invalid)
  if (totalPages <= 0 || currentPage < 1) return null;

  const prevHref = currentPage > 1
    ? buildUrl(baseUrl, currentPage - 1, preserveParams)
    : null;

  const nextHref = currentPage < totalPages
    ? buildUrl(baseUrl, currentPage + 1, preserveParams)
    : null;

  return (
    <div
      className={cn('flex items-center justify-center gap-2', className)}
      aria-label="Pagination"
    >
      {prevHref ? (
        <Link href={prevHref}>
          <Button variant="outline" size="sm" aria-label="Previous page">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 mr-1"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled aria-label="Previous page">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 mr-1"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous
        </Button>
      )}

      <span className="text-sm text-muted-foreground px-3" aria-live="polite">
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </span>

      {nextHref ? (
        <Link href={nextHref}>
          <Button variant="outline" size="sm" aria-label="Next page">
            Next
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 ml-1"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled aria-label="Next page">
          Next
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 ml-1"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      )}
    </div>
  );
}