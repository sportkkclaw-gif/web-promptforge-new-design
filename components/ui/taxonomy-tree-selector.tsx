'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/ui';

export interface TaxonomyCategory {
  id: string;
  name: string;
  slug: string;
  children?: TaxonomyCategory[];
}

interface TaxonomyTreeSelectorProps {
  /** Currently selected category slug */
  selectedSlug?: string;
  /** Callback when a category is selected */
  onSelect?: (slug: string) => void;
  /** Additional class for the wrapper nav element */
  className?: string;
}

export function TaxonomyTreeSelector({
  selectedSlug,
  onSelect,
  className,
}: TaxonomyTreeSelectorProps) {
  const [categories, setCategories] = React.useState<TaxonomyCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/search/taxonomy')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          if (json.ok) {
            setCategories(json.data?.categories ?? []);
          } else {
            setError('Failed to load categories');
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load categories');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-8 bg-muted rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">{error}</p>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No categories available</p>
    );
  }

  return (
    <nav className={cn('space-y-1', className)} aria-label="Category navigation">
      {categories.map((cat) => (
        <TaxonomyNode
          key={cat.id}
          category={cat}
          selectedSlug={selectedSlug}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </nav>
  );
}

interface TaxonomyNodeProps {
  category: TaxonomyCategory;
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  depth: number;
}

function TaxonomyNode({ category, selectedSlug, onSelect, depth }: TaxonomyNodeProps) {
  const hasChildren = Boolean(category.children && category.children.length > 0);
  const isSelected = selectedSlug === category.slug;

  const handleClick = () => {
    onSelect?.(category.slug);
  };

  return (
    <div>
      <Link
        href={`/browse?category=${category.slug}`}
        onClick={handleClick}
        className={cn(
          'flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
          isSelected
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
        aria-current={isSelected ? 'page' : undefined}
      >
        <span className="truncate">{category.name}</span>
        {hasChildren && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 shrink-0"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </Link>

      {hasChildren && (
        <div>
          {category.children!.map((child) => (
            <TaxonomyNode
              key={child.id}
              category={child}
              selectedSlug={selectedSlug}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}