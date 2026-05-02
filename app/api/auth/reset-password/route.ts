// POST /api/auth/reset-password
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { checkRateLimit } from '@/lib/security/rate-limit';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token required'),
  newPassword: z
    .string()
    .min(8, 'Password must be ≥8 chars')
    .max(128, 'Password must be ≤128 chars'),
});

// Rate limit: 5 attempts per IP per 15 minutes
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit check
  if (!checkRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS)) {
    return error('Too many requests, please try again later', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { token, newPassword } = parsed.data;

  // Always look up user by token stored in DB — never derive userId from token
  let user = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { not: null },
      },
    });
  } catch (err) {
    console.error('[POST /api/auth/reset-password] DB lookup error:', err);
    return error('Internal server error', 500);
  }

  if (!user) {
    await writeAuditLog({ action: 'RESET_PASSWORD_FAILURE', metadata: { reason: 'invalid_token' }, ipAddress: ip });
    return error('Invalid or expired token', 401);
  }

  // Check expiry
  if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
    await writeAuditLog({ userId: user.id, action: 'RESET_PASSWORD_FAILURE', metadata: { reason: 'token_expired' }, ipAddress: ip });
    return error('Invalid or expired token', 401);
  }

  // Hash new password and clear reset token (one-time invalidation)
  const newHash = await hashPassword(newPassword);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  } catch (err) {
    console.error('[POST /api/auth/reset-password] update error:', err);
    await writeAuditLog({ userId: user.id, action: 'RESET_PASSWORD_FAILURE', ipAddress: ip });
    return error('Internal server error', 500);
  }

  await writeAuditLog({ userId: user.id, action: 'RESET_PASSWORD_SUCCESS', ipAddress: ip });

  return ok({ message: 'Password reset successfully' });
}
