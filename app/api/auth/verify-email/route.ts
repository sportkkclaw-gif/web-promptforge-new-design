// POST /api/auth/verify-email
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { checkRateLimit } from '@/lib/security/rate-limit';

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token required'),
});

// Rate limit: 10 attempts per IP per 15 minutes
const RATE_LIMIT = 10;
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

  const parsed = VerifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { token } = parsed.data;

  // Token format validation:
  // - Test tokens: "verify_<32-hex-chars>" — accept the prefix by stripping it first
  // - Production: pure 64-char hex token
  // In both cases the DB stores the full token including any prefix.
  const isTestVerifyToken = /^verify_[a-f0-9]{32}$/i.test(token);
  if (!isTestVerifyToken && !/^[a-f0-9]{64}$/i.test(token)) {
    // Reject tokens that don't look like 64-char hex (production) or "verify_<hex>" (test)
    await writeAuditLog({ action: 'EMAIL_VERIFY_FAILURE', metadata: { reason: 'invalid_token_format' }, ipAddress: ip });
    return error('Invalid or expired token', 401);
  }

  // Always use DB token lookup — never derive userId from token
  let user = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyTokenExpiry: { not: null },
      },
    });
  } catch (err) {
    console.error('[POST /api/auth/verify-email] DB lookup error:', err);
    return error('Internal server error', 500);
  }

  if (!user) {
    await writeAuditLog({ action: 'EMAIL_VERIFY_FAILURE', metadata: { reason: 'token_not_found' }, ipAddress: ip });
    return error('Invalid or expired token', 401);
  }

  // Check expiry
  if (user.emailVerifyTokenExpiry && user.emailVerifyTokenExpiry < new Date()) {
    await writeAuditLog({ userId: user.id, action: 'EMAIL_VERIFY_FAILURE', metadata: { reason: 'token_expired' }, ipAddress: ip });
    return error('Invalid or expired token', 401);
  }

  if (user.emailVerified) {
    // Already verified — treat as success (idempotent)
    return ok({ message: 'Email already verified' });
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerifyToken: null,
        emailVerifyTokenExpiry: null,
      },
    });
  } catch (err) {
    console.error('[POST /api/auth/verify-email] update error:', err);
    await writeAuditLog({ userId: user.id, action: 'EMAIL_VERIFY_FAILURE', ipAddress: ip });
    return error('Internal server error', 500);
  }

  await writeAuditLog({ userId: user.id, action: 'EMAIL_VERIFY_SUCCESS', ipAddress: ip });

  return ok({ message: 'Email verified successfully' });
}
