// POST /api/auth/login
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    await writeAuditLog({ action: 'LOGIN_FAILURE', metadata: { email }, ipAddress: ip });
    return error('Invalid credentials', 401);
  }

  if (!verifyPassword(password, user.passwordHash)) {
    await writeAuditLog({ userId: user.id, action: 'LOGIN_FAILURE', metadata: { email }, ipAddress: ip });
    return error('Invalid credentials', 401);
  }

  const { token, expiresAt } = await createSession(user.id);

  await writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', ipAddress: ip });

  const cookieMaxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const secureAttr = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  return ok(
    {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        credits: user.credits,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    },
    200,
    [
      [
        'Set-Cookie',
        `pf_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${cookieMaxAge}${secureAttr}`,
      ],
    ]
  );
}