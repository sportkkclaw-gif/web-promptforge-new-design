import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const runs = await prisma.generationRun.findMany({
      where: userId ? { userId } : {},
      include: {
        prompt: { select: { id: true, title: true, slug: true } },
        outputs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const total = await prisma.generationRun.count({ where: userId ? { userId } : {} });
    return ok({ runs, total, limit, offset });
  } catch {
    return error('Failed to fetch generations');
  }
}
