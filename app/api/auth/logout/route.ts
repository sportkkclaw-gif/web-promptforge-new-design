// POST /api/auth/logout
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { deleteSession, getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace('Bearer ', '').trim() ?? null;

    // Also check pf_session cookie
    let token: string | null = bearerToken;
    if (!token) {
      try {
        token = request.cookies?.get('pf_session')?.value ?? null;
      } catch {
        // cookies not accessible
      }
    }

    const ip = getClientIp(request);

    if (token) {
      // Capture userId before deleting session, if session exists
      const session = await getSession(token);
      if (session) {
        // Fire-and-forget audit — non-blocking, failures must not affect the response
        writeAuditLog({ userId: session.userId, action: 'LOGOUT', ipAddress: ip }).catch((err) => {
          console.error('[logout] audit log failed:', err);
        });
      }
      deleteSession(token);
    }

    // Always return 200 — logout is idempotent and must not fail on invalid/missing token
    return ok({ message: 'Logged out' }, 200);
  } catch (err) {
    console.error('[POST /api/auth/logout] unexpected error:', err);
    return error('Internal server error', 500);
  }
}