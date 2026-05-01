// app/api/marketplace/detail/[slug]/route.ts
// GET /api/marketplace/detail/:slug — Get marketplace template detail by slug

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { getSession } from '@/lib/auth';

interface Params { params: { slug: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { slug: params.slug },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        marketplaceItem: {
          include: {
            orders: {
              where: { status: 'paid' },
              select: { id: true, buyerId: true },
            },
          },
        },
        promptTags: { include: { tag: true } },
        reviews: {
          include: { user: { select: { username: true } } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!prompt || !prompt.marketplaceItem) {
      return error('Marketplace template not found', 404);
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    const session = token ? getSession(token) : null;

    if (process.env.NODE_ENV !== 'test') {
      await writeAuditLog({
        userId: session?.userId ?? null,
        action: 'MARKETPLACE_LIST',
        target: `marketplace:detail:${params.slug}`,
        metadata: { slug: params.slug },
        ipAddress: getClientIp(request),
      });
    }

    return ok({ prompt });
  } catch {
    return error('Failed to fetch marketplace template', 500);
  }
}