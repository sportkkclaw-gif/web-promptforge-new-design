import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? undefined;

  try {
    const collections = await prisma.collection.findMany({
      where: userId ? { ownerId: userId } : {},
      include: {
        _count: { select: { items: true } },
        owner: { select: { username: true, avatarUrl: true } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return ok({ collections });
  } catch {
    return error('Failed to fetch collections');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, visibility, workspaceId } = body;

    if (!name) return error('name is required');

    const user = await prisma.user.findFirst();
    if (!user) return error('No user found', 500);

    const collection = await prisma.collection.create({
      data: {
        ownerId: user.id,
        name,
        visibility: visibility ?? 'private',
        workspaceId: workspaceId ?? null,
      },
    });
    return ok({ collection }, 201);
  } catch {
    return error('Failed to create collection');
  }
}
