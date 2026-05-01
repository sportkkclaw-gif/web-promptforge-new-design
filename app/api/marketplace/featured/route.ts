// app/api/marketplace/featured/route.ts
// GET /api/marketplace/featured — featured templates

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);
  const maxLimit = 20;

  if (isNaN(limit) || limit < 1 || limit > maxLimit) {
    return error(`limit must be 1-${maxLimit}`, 400);
  }

  try {
    const featured = await prisma.prompt.findMany({
      where: {
        status: { in: ['published', 'marketplace'] },
        marketplaceItem: { isNot: null },
      },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        marketplaceItem: {
          select: { id: true, priceCredits: true, license: true, salesCount: true, ratingAvg: true },
        },
      },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });

    return ok({ featured });
  } catch (err) {
    console.error('[/api/marketplace/featured] internal error:', err);
    return error('Failed to fetch featured templates', 500);
  }
}