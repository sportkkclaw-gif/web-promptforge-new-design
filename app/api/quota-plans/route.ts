// app/api/quota-plans/route.ts
// GET /api/quota-plans — Public list of available quota plans
// POST /api/quota-plans — Subscribe/upgrade to a plan (authenticated)

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = getSession(token);
  return session?.userId ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: 'asc' },
      select: {
        id: true,
        code: true,
        monthlyPrice: true,
        creditQuota: true,
        maxSeats: true,
      },
    });

    return ok({ plans });
  } catch (err) {
    console.error('[/api/quota-plans] DB error:', err);
    return error('Failed to fetch plans', 500);
  }
}

const SubscribeSchema = z.object({
  planId: z.string(),
});

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return error('No token provided', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return error('planId is required', 400);
  }

  const { planId } = parsed.data;

  try {
    // Fetch the plan
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return error('Plan not found', 404);

    // Get or create the user's workspace
    let workspace = await prisma.workspace.findFirst({
      where: { ownerId: userId },
    });

    if (!workspace) {
      // Create workspace for user
      workspace = await prisma.workspace.create({
        data: {
          name: 'My Workspace',
          slug: `ws-${userId.slice(0, 8)}-${Date.now()}`,
          ownerId: userId,
          planId: plan.id,
        },
      });

      // Create initial subscription
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          workspaceId: workspace.id,
          planId: plan.id,
          status: 'active',
          currentPeriodEnd: periodEnd,
        },
      });
    } else {
      // Upgrade/downgrade: update workspace plan
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { planId: plan.id },
      });

      // Update active subscription
      await prisma.subscription.updateMany({
        where: {
          workspaceId: workspace.id,
          status: { in: ['active', 'trialing'] },
        },
        data: {
          planId: plan.id,
          status: 'active',
        },
      });
    }

    await writeAuditLog({
      userId,
      action: 'SUBSCRIPTION_UPDATE',
      target: `plan:${plan.code}`,
      metadata: {
        planId: plan.id,
        planCode: plan.code,
        creditQuota: plan.creditQuota,
      },
      ipAddress: getClientIp(request),
    });

    return ok({
      plan: {
        id: plan.id,
        code: plan.code,
        monthlyPrice: plan.monthlyPrice,
        creditQuota: plan.creditQuota,
        maxSeats: plan.maxSeats,
      },
      workspaceId: workspace.id,
    });
  } catch (err) {
    console.error('[/api/quota-plans POST] Error:', err);
    return error('Failed to update subscription', 500);
  }
}
