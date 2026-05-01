// GET /api/credits/quota — current usage vs plan quota for authenticated user
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession, resolveSessionToken } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';

async function resolveUserId(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyResult = await validateApiKey(authHeader);
  if (apiKeyResult) return { userId: apiKeyResult.userId };
  const token = resolveSessionToken(request);
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  return { userId: session.userId };
}

export async function GET(request: NextRequest) {
  const resolved = await resolveUserId(request);
  if (!resolved) return error('No token provided', 401);

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: resolved.userId },
      select: { id: true, credits: true },
    });
  } catch (err) {
    console.error('[/api/credits/quota] DB error:', err);
    return error('Internal server error', 500);
  }

  if (!user) {
    return error('User not found', 404);
  }

  // Get current period start (first day of current month)
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  // Fetch subscription + plan and usage concurrently
  let subscription;
  let usedCredits;
  try {
    [subscription, usedCredits] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          workspace: { ownerId: resolved.userId },
          status: { in: ['active', 'trialing'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { code: true, creditQuota: true } } },
      }),
      prisma.creditsLedger.aggregate({
        where: {
          userId: resolved.userId,
          createdAt: { gte: periodStart },
          delta: { lt: 0 },
        },
        _sum: { delta: true },
      }),
    ]);
  } catch (err) {
    console.error('[/api/credits/quota] DB error:', err);
    return error('Internal server error', 500);
  }

  const plan = subscription?.plan;
  const creditQuota = plan?.creditQuota ?? 50;
  const used = Math.abs(usedCredits._sum.delta ?? 0);
  const remaining = Math.max(0, creditQuota - used);
  const periodEnd = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );

  return ok({
    userId: user.id,
    plan: plan?.code ?? 'FREE',
    creditQuota,
    used,
    remaining,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    walletBalance: user.credits,
  });
}