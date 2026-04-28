import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { items: true } },
        owner: { select: { username: true, avatarUrl: true } },
        items: {
          include: {
            prompt: {
              select: { id: true, title: true, slug: true, summary: true, status: true, viewCount: true },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!collection) return error('Collection not found', 404);
    return ok({ collection });
  } catch {
    return error('Failed to fetch collection');
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { name, visibility } = body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (visibility !== undefined) updateData.visibility = visibility;

    const collection = await prisma.collection.update({
      where: { id: params.id },
      data: updateData,
    });
    return ok({ collection });
  } catch {
    return error('Failed to update collection');
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.collection.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return error('Failed to delete collection');
  }
}
