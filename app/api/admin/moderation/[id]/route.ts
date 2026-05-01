import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-admin';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;

const DecisionBodySchema = z.object({
  decision: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'decision must be "approved" or "rejected"' }) }),
  reason: z.string().optional(),
});

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!CUID_PATTERN.test(params.id)) {
    return error('Invalid id format', 400);
  }

  try {
    const event = await prisma.moderationEvent.findUnique({ where: { id: params.id } });
    if (!event) return error('Moderation event not found', 404);
    return ok({ event });
  } catch {
    return error('Failed to fetch moderation event');
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  if (!CUID_PATTERN.test(params.id)) {
    return error('Invalid id format', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = DecisionBodySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { decision, reason } = parsed.data;

  try {
    const event = await prisma.moderationEvent.findUnique({ where: { id: params.id } });
    if (!event) return error('Moderation event not found', 404);

    const updated = await prisma.moderationEvent.update({
      where: { id: params.id },
      data: {
        status: decision,
        moderatorId: auth.userId,
        reason: reason ?? event.reason,
      },
    });

    if (decision === 'rejected' && event.targetType === 'prompt') {
      await prisma.prompt.updateMany({
        where: { id: event.targetId },
        data: { status: 'archived' },
      }).catch(() => {});
    }

    const ip = getClientIp(request);
    await writeAuditLog({
      userId: auth.userId,
      action: 'MODERATION_DECISION',
      target: `moderation:${params.id}`,
      metadata: { decision, reason: reason ?? event.reason, targetType: event.targetType, targetId: event.targetId },
      ipAddress: ip,
    });

    return ok({ event: updated, message: `Moderation decision: ${decision}` });
  } catch (e: any) {
    return error(e.message, 500);
  }
}
