import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const where: any = {};
    if (categorySlug) {
      // Join through prompt -> category logic would need category field on prompt
      // For now, return all marketplace items
    }

    const items = await prisma.marketplaceItem.findMany({
      where,
      include: {
        prompt: {
          select: { id: true, title: true, slug: true, summary: true, viewCount: true },
        },
        seller: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { salesCount: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.marketplaceItem.count();
    return ok({ items, total, limit, offset });
  } catch {
    return error('Failed to fetch marketplace items');
  }
}
