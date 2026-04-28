import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

// GET /api/saved — List saved/favorited prompts (collections)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? undefined;

  try {
    const collections = await prisma.collection.findMany({
      where: userId ? { ownerId: userId } : {},
      include: {
        _count: { select: { items: true } },
        items: {
          include: {
            prompt: {
              include: {
                owner: { select: { username: true } },
              },
            },
          },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return ok({ saved: collections });
  } catch {
    return error('Failed to fetch saved items');
  }
}
