// POST /api/admin/credits/grant — Admin manual credit grant with audit reason
// Full Build Checklist §5.1.4: Credit grant on admin manual grant
// Full Build Checklist §5.2.7: Admin quota override (with audit reason)

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { grantCredits } from '@/lib/quota';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const GrantSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  amount: z.number().int().positive('Amount must be a positive integer'),
  reason: z.string().min(1, 'reason is required'),
});

/**
 * Returns true if the session has admin privileges.
 */
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
}

export async function POST(request: NextRequest) {
  // ── Auth: must be authenticated ────────────────────────────────────────────
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Invalid token', 401);

  // ── Auth: must be admin ─────────────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!adminUser || (adminUser.role !== 'ADMIN' && adminUser.role !== 'SUPERADMIN')) {
    return error('Forbidden — admin role required', 403);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = GrantSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { userId, amount, reason } = parsed.data;

  // Target user must exist
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return error('Target user not found', 404);

  // ── Execute atomic grant ───────────────────────────────────────────────────
  let newBalance: number;
  try {
    const result = await grantCredits(userId, amount, `Admin grant: ${reason}`, 'admin_grant', session.userId);
    newBalance = result.newBalance;
  } catch (err: any) {
    return error(err.message || 'Credit grant failed', 500);
  }

  // ── Audit log — required for checklist §5.2.7 ────────────────────────────
  await writeAuditLog({
    userId: session.userId,
    action: 'ADMIN_CREDITS_GRANT',
    target: `user:${userId}`,
    metadata: {
      amount,
      reason,
      newBalance,
      targetUserEmail: targetUser.email,
    },
    ipAddress: getClientIp(request),
  });

  return ok({
    userId,
    amountGranted: amount,
    newBalance,
    reason,
    grantedBy: session.userId,
  }, 201);
}
