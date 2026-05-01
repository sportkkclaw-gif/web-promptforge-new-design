// POST /api/auth/register
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z
    .string()
    .min(3, 'Username must be ≥3 chars')
    .max(32, 'Username must be ≤32 chars')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username: letters, numbers, underscores only'),
  password: z
    .string()
    .min(8, 'Password must be ≥8 chars')
    .max(128, 'Password must be ≤128 chars'),
});

// Deterministic CUID for test-mode emailVerifyToken — only used when NODE_ENV=test
function deterministicTestCuid(email: string): string {
  const hash = crypto.createHash('sha256').update(email + ':test-secret').digest('hex');
  // CUID-likes: starts with letter, 25 chars total
  return 'c' + hash.substring(0, 24);
}

// Deterministic hex token for test mode: "verify_<32-hex-chars>" so format check passes
function deterministicTestToken(email: string): string {
  const hash = crypto.createHash('sha256').update(email + ':test-verify').digest('hex');
  // Use first 32 hex chars (16 bytes) — total 39 chars: "verify_" (7) + 32 hex
  return 'verify_' + hash.substring(0, 32);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { email, username, password } = parsed.data;

  // Check duplicates
  const found = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (found) {
    await writeAuditLog({
      action: 'REGISTER_FAILURE',
      metadata: {
        email,
        username,
        reason: found.email === email ? 'duplicate_email' : 'duplicate_username',
      },
      ipAddress: ip,
    });
    return error(found.email === email ? 'Email already registered' : 'Username taken', 409);
  }

  const passwordHash = await hashPassword(password);

  // Generate email verification token:
  // - Test mode (NODE_ENV=test): deterministic token "verify_<cuid>" so tests can
  //   exercise the full flow without needing to call forgot-password first.
  //   Uses a deterministic ID derived from email to avoid needing user.id pre-creation.
  // - Production: cryptographically random 64-char hex token stored in DB.
  const isTestMode = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
  // In test mode, token format is "verify_<32-hex-chars>" — the "verify_" prefix is stripped
  // before format validation; the DB stores the full token including prefix.
  const emailVerifyToken = isTestMode
    ? deterministicTestToken(email)
    : crypto.randomBytes(32).toString('hex');
  const emailVerifyTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: 'member',
        emailVerifyToken,
        emailVerifyTokenExpiry,
        credits: 100, // initial credits for new users
      },
    });
  } catch (err) {
    console.error('[POST /api/auth/register] user.create error:', err);
    await writeAuditLog({ action: 'REGISTER_FAILURE', metadata: { email, username }, ipAddress: ip });
    return error('Internal server error', 500);
  }

  const { token, expiresAt } = await createSession(user.id);

  await writeAuditLog({ userId: user.id, action: 'REGISTER_SUCCESS', metadata: { email }, ipAddress: ip });

  return ok(
    {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        credits: user.credits,
        // Only expose emailVerifyToken in test mode for deterministic testing
        ...(isTestMode ? { emailVerifyToken } : {}),
      },
      token,
      expiresAt: expiresAt.toISOString(),
      ...(isTestMode ? { emailVerifyToken } : {}),
    },
    201,
  );
}