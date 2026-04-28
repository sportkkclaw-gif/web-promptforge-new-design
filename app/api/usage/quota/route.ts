import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

// GET /api/usage/quota — Get user quota usage
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? undefined;

  try {
    const targetUserId = userId ?? (await prisma.user.findFirst())?.id;
    if (!targetUserId) return error('User not found', 404);

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) return error('User not found', 404);

    // Lookup subscription via workspace membership
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: targetUserId },
      include: { workspace: { include: { plan: true } } },
    });
    const plan = member?.workspace?.plan;
    const quota = plan ? {
      creditQuota: plan.creditQuota,
      used: plan.creditQuota - user.credits,
      remaining: user.credits,
    } : {
      creditQuota: 50,
      used: 50 - user.credits,
      remaining: user.credits,
    };

    return ok({ quota, userId: targetUserId });
  } catch {
    return error('Failed to fetch quota');
  }
}
