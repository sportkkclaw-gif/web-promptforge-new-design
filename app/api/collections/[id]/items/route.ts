import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const items = await prisma.collectionItem.findMany({
      where: { collectionId: params.id },
      include: {
        prompt: {
          select: { id: true, title: true, slug: true, summary: true, status: true, viewCount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok({ items });
  } catch {
    return error('Failed to fetch collection items');
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { promptId, note } = body;
    if (!promptId) return error('promptId is required');

    const item = await prisma.collectionItem.upsert({
      where: { collectionId_promptId: { collectionId: params.id, promptId } },
      update: { note },
      create: { collectionId: params.id, promptId, note },
    });
    return ok({ item }, 201);
  } catch {
    return error('Failed to add item to collection');
  }
}
