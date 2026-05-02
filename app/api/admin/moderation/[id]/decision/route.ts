// POST /api/admin/moderation/:id/decision - Make moderation decision

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, error } from '@/lib/api';
import { requireAdmin } from '@/lib/auth-admin';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const DecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'decision must be "approved" or "rejected"' }) }),
  reason: z.string().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const idParsed = z.string().regex(/^[a-z][a-z0-9]{24}$/, 'Invalid id format').safeParse(id);
  if (!idParsed.success) {
    return error('Invalid id format', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { decision, reason } = parsed.data;

  try {
    const event = await prisma.moderationEvent.findUnique({ where: { id } });
    if (!event) return error('Moderation event not found', 404);

    const updated = await prisma.moderationEvent.update({
      where: { id },
      data: {
        status: decision,
        moderatorId: auth.userId,
        reason: reason ?? event.reason,
      },
    });

    // If rejected, update the target prompt status to archived
    if (decision === 'rejected' && event.targetType === 'prompt') {
      await prisma.prompt.updateMany({
        where: { id: event.targetId },
        data: { status: 'archived' },
      }).catch(() => {});
    }

    await writeAuditLog({
      userId: auth.userId,
      action: 'MODERATION_DECISION',
      target: `moderation:${id}`,
      metadata: { decision, reason: reason ?? event.reason, targetType: event.targetType, targetId: event.targetId },
    });

    return ok({ event: updated, message: `Moderation decision: ${decision}` });
  } catch (e: any) {
    return error(e.message, 500);
  }
}
