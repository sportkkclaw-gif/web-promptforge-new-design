// app/api/marketplace/creators/[userId]/route.ts
// GET /api/marketplace/creators/:userId — creator profile + templates

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!userId || userId.trim() === '') {
    return error('userId is required', 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        marketplaceItems: {
          select: { id: true, priceCredits: true, license: true, salesCount: true, ratingAvg: true },
        },
      },
    });

    if (!user) {
      return error('Creator not found', 404);
    }

    const templates = await prisma.prompt.findMany({
      where: {
        ownerId: userId,
        status: { in: ['published', 'marketplace'] },
        marketplaceItem: { isNot: null },
      },
      include: {
        marketplaceItem: {
          select: { id: true, priceCredits: true, license: true, salesCount: true, ratingAvg: true },
        },
        promptTags: { include: { tag: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: 50,
    });

    const totalSales = user.marketplaceItems.reduce((sum, item) => sum + item.salesCount, 0);

    return ok({
      creator: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        memberSince: user.createdAt,
        totalSales,
        templateCount: templates.length,
      },
      templates,
    });
  } catch (err) {
    console.error('[/api/marketplace/creators/:userId] internal error:', err);
    return error('Failed to fetch creator profile', 500);
  }
}