import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const GetSavedSchema = z.object({
  userId: z.string().optional(),
});

// GET /api/saved — List saved/favorited prompts (collections)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = { userId: searchParams.get('userId') ?? undefined };
  const parsed = GetSavedSchema.safeParse(raw);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Invalid params', 400);
  }

  const { userId } = parsed.data;
  const ip = getClientIp(request);

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const session = token ? getSession(token) : null;
  if (!session) return error('No token provided', 401);

  try {
    const collections = await prisma.collection.findMany({
      where: userId ? { ownerId: userId } : { ownerId: session.userId },
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

    if (session) {
      await writeAuditLog({ userId: session.userId, action: 'SAVED_VIEW', ipAddress: ip });
    }

    return ok({ saved: collections });
  } catch (err) {
    console.error('[GET /api/saved] DB error:', err);
    return error('Failed to fetch saved items', 500);
  }
}
