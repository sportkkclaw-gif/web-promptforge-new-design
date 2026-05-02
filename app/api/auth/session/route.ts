// GET /api/auth/session
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return error('No token provided', 401);
  }

  const session = await getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: session.userId } });
  } catch (err) {
    console.error('[GET /api/auth/session] DB error:', err);
    return error('Internal server error', 500);
  }
  if (!user) {
    return error('User not found', 404);
  }

  return ok({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      credits: user.credits,
    },
    expiresAt: session.expiresAt.toISOString(),
  });
}
