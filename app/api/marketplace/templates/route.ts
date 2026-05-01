// app/api/marketplace/templates/route.ts
// GET /api/marketplace/templates — search/filter marketplace templates (extends items with search)

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { getSession } from '@/lib/auth';

const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;
const TextSchema = z.string();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse & validate pagination
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');
  const limit = parseInt(rawLimit ?? '20', 10);
  const offset = parseInt(rawOffset ?? '0', 10);

  if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0 || limit > MAX_LIMIT || offset > MAX_OFFSET) {
    return error(`limit must be 1-${MAX_LIMIT} and offset must be 0-${MAX_OFFSET}`, 400);
  }

  // Parse optional search/filter params
  const q = searchParams.get('q') ?? undefined;
  const categorySlug = searchParams.get('category') ?? undefined;
  const sortBy = searchParams.get('sortBy') ?? 'popular';
  const rawMinPrice = searchParams.get('minPrice');
  const rawMaxPrice = searchParams.get('maxPrice');

  // Validate text inputs
  if (q !== undefined) {
    if (!TextSchema.safeParse(q).success || q.trim() === '') {
      return error('q cannot be an empty string', 400);
    }
    if (q.trim().length > 200) {
      return error('q must be 200 characters or fewer', 400);
    }
  }
  if (categorySlug !== undefined) {
    if (!TextSchema.safeParse(categorySlug).success || categorySlug.trim() === '') {
      return error('category cannot be an empty string', 400);
    }
    if (categorySlug.trim().length > 64) {
      return error('category must be 64 characters or fewer', 400);
    }
  }

  const allowedSort = ['popular', 'recent', 'rating', 'trending'];
  if (!allowedSort.includes(sortBy)) {
    return error(`sortBy must be one of: ${allowedSort.join('|')}`, 400);
  }

  // Parse price filters
  const parsePrice = (raw: string | null, fallback: number): number => {
    if (raw === null || raw === '') return fallback;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return NaN;
    return parsed;
  };

  const minPrice = parsePrice(rawMinPrice, 0);
  const maxPrice = parsePrice(rawMaxPrice, 999999);
  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
    return error('minPrice and maxPrice must be valid integers', 400);
  }
  if (minPrice < 0 || maxPrice < 0) {
    return error('Price values cannot be negative', 400);
  }
  if (maxPrice < minPrice) {
    return error('maxPrice cannot be less than minPrice', 400);
  }

  try {
    // Build where clause
    const where: any = {
      marketplaceItem: { isNot: null },
      status: { in: ['published', 'marketplace'] },
    };

    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q.trim() } },
        { summary: { contains: q.trim() } },
        { content: { contains: q.trim() } },
      ];
    }

    if (categorySlug) {
      // Category matching via PromptTag -> Tag -> Category
      where.promptTags = { some: { tag: { slug: categorySlug } } };
    }

    if (!Number.isNaN(minPrice) && !Number.isNaN(maxPrice)) {
      where.priceCredits = { gte: minPrice, lte: maxPrice };
    }

    // Order by
    let orderBy: any;
    switch (sortBy) {
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'rating':
        orderBy = { viewCount: 'desc' }; // placeholder until ratingAvg on MarketplaceItem is used
        break;
      case 'trending':
        orderBy = { viewCount: 'desc' };
        break;
      case 'popular':
      default:
        orderBy = { viewCount: 'desc' };
    }

    const [templates, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: {
          owner: { select: { id: true, username: true, avatarUrl: true } },
          marketplaceItem: {
            select: { id: true, priceCredits: true, license: true, salesCount: true, ratingAvg: true },
          },
          promptTags: { include: { tag: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.prompt.count({ where }),
    ]);

    if (process.env.NODE_ENV !== 'test') {
      const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
      const session = token ? getSession(token) : null;
      await writeAuditLog({
        userId: session?.userId ?? null,
        action: 'MARKETPLACE_SEARCH',
        target: 'marketplace:templates',
        metadata: { q, categorySlug, sortBy, limit, offset, total },
        ipAddress: getClientIp(request),
      });
    }

    return ok({ templates, total, limit, offset });
  } catch (err) {
    console.error('[/api/marketplace/templates] internal error:', err);
    return error('Failed to search marketplace', 500);
  }
}