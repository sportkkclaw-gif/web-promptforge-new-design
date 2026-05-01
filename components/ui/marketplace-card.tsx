/**
 * MarketplaceCard Component
 * Reusable card for displaying marketplace template items.
 * Supports: title, slug/link, price, rating, category/tag, author, cover/placeholder, purchased badge.
 */

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from './card';
import { Badge } from './badge';

interface MarketplaceCardProps {
  /** Unique item ID */
  id: string;
  /** Template title */
  title: string;
  /** Template slug for URL generation */
  slug: string;
  /** Short description/summary */
  summary?: string | null;
  /** Price in credits */
  priceCredits: number;
  /** Average rating (0-5) */
  rating?: number | null;
  /** Total sales count */
  salesCount?: number | null;
  /** License type (personal|commercial|extended) */
  license?: string;
  /** Creator username */
  authorUsername: string;
  /** Creator avatar URL */
  authorAvatarUrl?: string | null;
  /** Cover image URL */
  coverUrl?: string | null;
  /** Category/tag to display as badge */
  category?: string | null;
  /** Whether the current user has already purchased this item */
  isPurchased?: boolean;
  /** Custom href override (defaults to /marketplace/{slug}) */
  href?: string;
  /** Additional CSS class */
  className?: string;
}

function getLicenseBadgeVariant(license: string): 'default' | 'secondary' | 'outline' {
  switch (license) {
    case 'commercial':
      return 'default';
    case 'extended':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function MarketplaceCard({
  id,
  title,
  slug,
  summary,
  priceCredits,
  rating,
  salesCount,
  license,
  authorUsername,
  authorAvatarUrl,
  coverUrl,
  category,
  isPurchased,
  href,
  className,
}: MarketplaceCardProps) {
  const cardHref = href ?? `/marketplace/${slug}`;

  return (
    <Link href={cardHref} className="group block">
      <Card
        interactive
        className={`overflow-hidden h-full flex flex-col ${className ?? ''}`}
        aria-label={`${title} by @${authorUsername}`}
      >
        {/* Cover / Placeholder */}
        <div className="bg-muted h-40 flex items-center justify-center relative flex-shrink-0">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`${title} cover`}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-4xl opacity-30" aria-hidden="true">
              🖼️
            </span>
          )}
          {/* Purchased badge */}
          {isPurchased && (
            <span className="absolute top-2 right-2">
              <Badge variant="default" className="bg-green-600 text-white">
                Purchased
              </Badge>
            </span>
          )}
        </div>

        <CardContent className="flex flex-col flex-1 p-4">
          {/* Category tag */}
          {category && (
            <div className="mb-2">
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            </div>
          )}

          {/* Title */}
          <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-1 text-base">
            {title}
          </h3>

          {/* Summary */}
          {summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">
              {summary}
            </p>
          )}

          {/* Footer: price + author */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm font-bold text-primary">
              {priceCredits > 0 ? `${priceCredits} credits` : 'Free'}
            </span>
            <div className="flex items-center gap-1">
              {authorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatarUrl}
                  alt={authorUsername}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs">
                  {authorUsername.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-xs text-muted-foreground">@{authorUsername}</span>
            </div>
          </div>

          {/* Stats: rating + sales + license */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {rating != null && (
              <span aria-label={`Rating: ${rating.toFixed(1)} out of 5`}>
                ★ {rating.toFixed(1)}
              </span>
            )}
            {salesCount != null && (
              <span aria-label={`${salesCount} sales`}>
                {salesCount} sales
              </span>
            )}
            {license && (
              <span>
                <Badge variant={getLicenseBadgeVariant(license)} className="text-xs">
                  {license}
                </Badge>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default MarketplaceCard;