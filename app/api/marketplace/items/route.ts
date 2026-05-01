import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const IntSchema = z.number().int();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');
  const limit = parseInt(rawLimit ?? '20', 10);
  const offset = parseInt(rawOffset ?? '0', 10);

  const MAX_LIMIT = 100;
  const MAX_OFFSET = 10000;
  const validLimit = IntSchema.safeParse(limit).success;
  const validOffset = IntSchema.safeParse(offset).success;
  if (!validLimit || !validOffset || limit < 1 || offset < 0 || limit > MAX_LIMIT || offset > MAX_OFFSET) {
    return error(`limit must be 1-${MAX_LIMIT} and offset must be 0-${MAX_OFFSET}`, 400);
  }

  try {
    const items = await prisma.marketplaceItem.findMany({
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

    if (process.env.NODE_ENV !== 'test') {
      const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
      const session = token ? getSession(token) : null;
      await writeAuditLog({
        userId: session?.userId ?? null,
        action: 'MARKETPLACE_LIST',
        target: 'marketplace:items',
        metadata: { limit, offset, total },
        ipAddress: getClientIp(request),
      });
    }

    return ok({ items, total, limit, offset });
  } catch {
    return error('Failed to fetch marketplace items', 500);
  }
}
