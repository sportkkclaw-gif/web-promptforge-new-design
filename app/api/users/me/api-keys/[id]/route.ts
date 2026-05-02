// DELETE /api/users/me/api-keys/:id
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const IdParamSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]{24}$/, 'Invalid key id format'),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const ip = getClientIp(request);

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  const { id } = await params;

  const parsed = IdParamSchema.safeParse({ id });
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Invalid key id format', 400);
  }

  // Atomic delete: enforce ownership in the query itself to avoid time-of-check-use race.
  // Only one row can be deleted since id is unique, and userId must match.
  let deletedCount: number;
  try {
    const result = await prisma.apiKey.deleteMany({
      where: { id: parsed.data.id, userId: session.userId },
    });
    deletedCount = result.count;
  } catch (err: unknown) {
    console.error('[DELETE /api/users/me/api-keys/:id] DB error:', err);
    return error('Internal server error', 500);
  }

  if (deletedCount === 0) {
    return error('API key not found', 404);
  }

  await writeAuditLog({ userId: session.userId, action: 'API_KEY_REVOKE', target: parsed.data.id, ipAddress: ip });

  return ok({ revoked: true });
}
