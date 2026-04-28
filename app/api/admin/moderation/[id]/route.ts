import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

interface Params { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { decision } = body; // 'approved' | 'rejected'
    const { reason } = body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return error('decision must be "approved" or "rejected"');
    }

    const moderationEvent = await prisma.moderationEvent.update({
      where: { id: params.id },
      data: {
        status: decision,
        reason: reason ?? null,
      },
    });

    return ok({ moderationEvent });
  } catch {
    return error('Failed to process moderation decision');
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const event = await prisma.moderationEvent.findUnique({ where: { id: params.id } });
    if (!event) return error('Moderation event not found', 404);
    return ok({ event });
  } catch {
    return error('Failed to fetch moderation event');
  }
}
