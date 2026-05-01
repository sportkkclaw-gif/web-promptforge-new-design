// GET|PATCH|DELETE /api/users/me — current authenticated user profile
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession, deleteSession, resolveSessionToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const PatchSchema = z.object({
  username: z
    .string({ errorMap: () => ({ message: 'username must be a non-empty string' }) })
    .min(1, 'username must be a non-empty string')
    .max(50, 'username must be 50 characters or fewer'),
});

export async function GET(request: NextRequest) {
  const token = resolveSessionToken(request);
  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
  } catch (err) {
    console.error('[/api/users/me] DB error:', err);
    return error('Internal server error', 500);
  }
  if (!user) {
    return error('User not found', 404);
  }

  return ok({
    id: user.id,
    email: user.email,
    name: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}

export async function PATCH(request: NextRequest) {
  const token = resolveSessionToken(request);
  const ip = getClientIp(request);

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    const msg = issue?.message || 'Validation failed';
    // Zod 3.x with errorMap: empty object {} → received="undefined", wrong type → received="number"
    if (msg === 'username must be a non-empty string') {
      if ((issue as { received?: string }).received === 'undefined') {
        return error('Empty payload', 400);
      }
      // else fall through to return the message as-is
    }
    return error(msg, 400);
  }

  const { username } = parsed.data;

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: session.userId },
      data: { username },
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      return error('Username already taken', 409);
    }
    if (code === 'P2025') {
      return error('User not found', 404);
    }
    console.error('[/api/users/me PATCH] DB error:', err);
    return error('Internal server error', 500);
  }

  await writeAuditLog({ userId: session.userId, action: 'PROFILE_UPDATE', metadata: { field: 'username' }, ipAddress: ip });

  return ok({
    id: updated.id,
    email: updated.email,
    name: updated.username,
    role: updated.role,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(request: NextRequest) {
  const token = resolveSessionToken(request);
  const ip = getClientIp(request);

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  // Delete user first — session is only invalidated after confirmed user deletion.
  // This prevents a false logout (session killed, user still alive) if DB fails.
  try {
    await prisma.user.delete({ where: { id: session.userId } });
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2025') {
      // User already gone — delete orphaned session and treat as success
      deleteSession(token);
      return ok({ deleted: true });
    }
    console.error('[/api/users/me DELETE] DB error:', err);
    return error('Internal server error', 500);
  }

  // User deleted successfully — now invalidate session
  deleteSession(token);

  await writeAuditLog({ userId: session.userId, action: 'ACCOUNT_DELETE', ipAddress: ip });

  return ok({ deleted: true });
}
