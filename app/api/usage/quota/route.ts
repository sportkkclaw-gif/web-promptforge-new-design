import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import { writeAuditLog, getClientIp } from '@/lib/audit';

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

  try {
    const user = await prisma.user.findUnique({
      where: { id: resolved.userId },
    });
    if (!user) return error('User not found', 404);

    const member = await prisma.workspaceMember.findFirst({
      where: { userId: resolved.userId },
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

    if (process.env.NODE_ENV !== 'test') {
      await writeAuditLog({
        userId: resolved.userId,
        action: 'QUOTA_VIEW',
        target: 'usage:quota',
        metadata: { creditQuota: quota.creditQuota, remaining: quota.remaining },
        ipAddress: getClientIp(request),
      });
    }

    return ok({ quota, userId: resolved.userId });
  } catch {
    return error('Failed to fetch quota');
  }
}
