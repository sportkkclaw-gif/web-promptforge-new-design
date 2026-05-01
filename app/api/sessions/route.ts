import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const GetSessionsSchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/sessions — List generation sessions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = {
    userId: searchParams.get('userId') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  };
  const parsed = GetSessionsSchema.safeParse(raw);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Invalid params', 400);
  }

  const { userId, limit, offset } = parsed.data;
  const ip = getClientIp(request);

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const session = token ? getSession(token) : null;
  if (!session) return error('No token provided', 401);

  try {
    const where = userId ? { userId } : { userId: session.userId };
    const runs = await prisma.generationRun.findMany({
      where,
      include: {
        prompt: { select: { id: true, title: true, slug: true } },
        outputs: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const total = await prisma.generationRun.count({ where });

    // Audit log — VIEW action for session list
    if (session) {
      await writeAuditLog({ userId: session.userId, action: 'SESSION_VIEW', ipAddress: ip });
    }

    return ok({ sessions: runs, total, limit, offset });
  } catch (err) {
    console.error('[GET /api/sessions] DB error:', err);
    return error('Failed to fetch sessions', 500);
  }
}
