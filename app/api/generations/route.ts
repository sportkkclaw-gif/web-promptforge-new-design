import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

const IntSchema = z.coerce.number().int();

function parseLimit(raw: string | null): number {
  const parsed = IntSchema.safeParse(raw ?? 20);
  if (!parsed.success) return 20;
  if (parsed.data < 1) return 20;
  return Math.min(parsed.data, 100);
}

function parseOffset(raw: string | null): number {
  const parsed = IntSchema.safeParse(raw ?? 0);
  if (!parsed.success) return 0;
  if (parsed.data < 0) return 0;
  return parsed.data;
}

// GET /api/generations — list generation runs for the authenticated user
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get('limit'));
  const offset = parseOffset(searchParams.get('offset'));

  try {
    const runs = await prisma.generationRun.findMany({
      where: { userId: session.userId },
      include: {
        prompt: { select: { id: true, title: true, slug: true } },
        outputs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const total = await prisma.generationRun.count({ where: { userId: session.userId } });
    return ok({ runs, total, limit, offset });
  } catch {
    return error('Failed to fetch generations');
  }
}
