// app/api/marketplace/trending/route.ts
// GET /api/marketplace/trending — trending templates (7-day window by view count delta)

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10', 10);
  const maxLimit = 50;

  if (isNaN(limit) || limit < 1 || limit > maxLimit) {
    return error(`limit must be 1-${maxLimit}`, 400);
  }

  // 7-day trending window
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const trending = await prisma.prompt.findMany({
      where: {
        status: { in: ['published', 'marketplace'] },
        marketplaceItem: { isNot: null },
        updatedAt: { gte: sevenDaysAgo },
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

    return ok({ trending });
  } catch (err) {
    console.error('[/api/marketplace/trending] internal error:', err);
    return error('Failed to fetch trending templates', 500);
  }
}