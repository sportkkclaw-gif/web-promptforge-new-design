// GET /api/credits/balance — authenticated user's current credit balance
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';

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

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: resolved.userId },
      select: { id: true, credits: true, username: true },
    });
  } catch (err) {
    console.error('[/api/credits/balance] DB error:', err);
    return error('Internal server error', 500);
  }

  if (!user) {
    return error('User not found', 404);
  }

  return ok({
    userId: user.id,
    username: user.username,
    credits: user.credits,
  });
}