// POST /api/admin/moderation/:id/decision - Make moderation decision

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, error } from '@/lib/api';

interface Props {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const body = await request.json();
    const { decision, moderatorId, reason } = body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return error('decision must be "approved" or "rejected"', 400);
    }

    const event = await prisma.moderationEvent.findUnique({ where: { id: params.id } });
    if (!event) return error('Moderation event not found', 404);

    const updated = await prisma.moderationEvent.update({
      where: { id: params.id },
      data: {
        status: decision,
        moderatorId: moderatorId ?? null,
        reason: reason ?? event.reason,
      },
    });

    // If rejected, update the target prompt status to archived
    if (decision === 'rejected' && event.targetType === 'prompt') {
      await prisma.prompt.updateMany({
        where: { id: event.targetId },
        data: { status: 'archived' },
      }).catch(() => {}); // Ignore if target doesn't exist
    }

    return ok({ event: updated, message: `Moderation decision: ${decision}` });
  } catch (e: any) {
    return error(e.message, 500);
  }
}
