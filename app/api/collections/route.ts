import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const CreateCollectionSchema = z.object({
  name: z.string().min(1, 'name is required').max(200, 'name must be ≤200 chars'),
  visibility: z.enum(['private', 'public']).optional(),
  workspaceId: z.string().nullable().optional(),
});

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
  const ip = getClientIp(request);
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

  const parsed = CreateCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { name, visibility, workspaceId } = parsed.data;

  try {
    const collection = await prisma.collection.create({
      data: {
        ownerId: session.userId,
        name,
        visibility: visibility ?? 'private',
        workspaceId: workspaceId ?? null,
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'COLLECTION_CREATE',
      target: collection.id,
      metadata: { name, visibility },
      ipAddress: ip,
    });

    return ok({ collection }, 201);
  } catch {
    return error('Failed to create collection');
  }
}
