// GET /api/credits/transactions — paginated ledger entries for authenticated user
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';

const IntSchema = z.coerce.number().int();

function parsePage(raw: string | null): number {
  const parsed = IntSchema.safeParse(raw ?? 1);
  if (!parsed.success || parsed.data < 1) return 1;
  return parsed.data;
}

function parseLimit(raw: string | null): number {
  const parsed = IntSchema.safeParse(raw ?? 50);
  if (!parsed.success || parsed.data < 1) return 50;
  return Math.min(parsed.data, 200);
}

async function resolveUserId(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyResult = await validateApiKey(authHeader);
  if (apiKeyResult) return { userId: apiKeyResult.userId };
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  return { userId: session.userId };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveUserId(request);
  if (!resolved) return error('No token provided', 401);

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get('page'));
  const limit = parseLimit(searchParams.get('limit'));
  const offset = (page - 1) * limit;

  let transactions;
  let total;
  try {
    [transactions, total] = await Promise.all([
      prisma.creditsLedger.findMany({
        where: { userId: resolved.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          delta: true,
          reason: true,
          refType: true,
          refId: true,
          createdAt: true,
        },
      }),
      prisma.creditsLedger.count({ where: { userId: resolved.userId } }),
    ]);
  } catch (err) {
    console.error('[/api/credits/transactions] DB error:', err);
    return error('Internal server error', 500);
  }

  return ok({
    transactions: transactions.map((t) => ({
      id: t.id,
      delta: t.delta,
      reason: t.reason,
      refType: t.refType,
      refId: t.refId,
      createdAt: t.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
