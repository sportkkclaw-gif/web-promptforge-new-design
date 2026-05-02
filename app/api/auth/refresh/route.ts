// POST /api/auth/refresh
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession, deleteSession, createAccessToken, registerRefreshToken } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    const ip = getClientIp(request);

    if (!token) {
      return error('No token provided', 401);
    }

    // Look up the session using the token (supports both JWT access tokens
    // and legacy opaque tokens via getSession)
    const session = await getSession(token);
    if (!session) {
      return error('Session expired or invalid', 401);
    }

    // Verify user still exists in DB
    let user;
    try {
      user = await prisma.user.findUnique({ where: { id: session.userId } });
    } catch (dbErr) {
      console.error('[POST /api/auth/refresh] DB error:', dbErr);
      return error('Internal server error', 500);
    }
    if (!user) {
      return error('User not found', 404);
    }

    // Invalidate old access token (add to revoked set)
    deleteSession(token);

    // Issue new access token
    const { token: newToken, expiresAt } = createAccessToken(session.userId);

    writeAuditLog({ userId: session.userId, action: 'REFRESH_TOKEN', ipAddress: ip }).catch((err) => {
      console.error('[refresh] audit log failed:', err);
    });

    return ok({
      token: newToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[POST /api/auth/refresh] unexpected error:', err);
    return error('Internal server error', 500);
  }
}