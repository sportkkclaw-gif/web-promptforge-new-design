import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const UpdateCollectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  visibility: z.enum(['private', 'public']).optional(),
});

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
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);
  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = UpdateCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const ip = getClientIp(request);
  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.visibility !== undefined) updateData.visibility = parsed.data.visibility;

  try {
    const collection = await prisma.collection.update({
      where: { id: params.id },
      data: updateData,
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'COLLECTION_UPDATE',
      target: collection.id,
      metadata: { name: collection.name, visibility: collection.visibility },
      ipAddress: ip,
    });

    return ok({ collection });
  } catch {
    return error('Failed to update collection');
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);
  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  const ip = getClientIp(request);

  try {
    await prisma.collection.delete({ where: { id: params.id } });

    await writeAuditLog({
      userId: session.userId,
      action: 'COLLECTION_DELETE',
      target: params.id,
      ipAddress: ip,
    });

    return ok({ deleted: true });
  } catch {
    return error('Failed to delete collection');
  }
}
