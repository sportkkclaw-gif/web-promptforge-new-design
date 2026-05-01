// app/api/marketplace/taxonomy/route.ts
// GET /api/marketplace/taxonomy — List all taxonomy categories

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { getSession } from '@/lib/auth';

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get('limit');
    const limit = parseInt(rawLimit ?? '20', 10);

    if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
      return error(`limit must be 1-${MAX_LIMIT}`, 400);
    }

    const categories = await prisma.category.findMany({
      take: limit,
      orderBy: { name: 'asc' },
    });

    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    const session = token ? getSession(token) : null;

    if (process.env.NODE_ENV !== 'test') {
      await writeAuditLog({
        userId: session?.userId ?? null,
        action: 'MARKETPLACE_LIST',
        target: 'marketplace:taxonomy',
        metadata: { count: categories.length },
        ipAddress: getClientIp(request),
      });
    }

    return ok({ categories });
  } catch {
    return error('Failed to fetch taxonomy', 500);
  }
}