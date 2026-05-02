import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

interface Params { params: { slug: string } }

const BodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.errors[0]?.message || 'Validation failed', 400);

  try {
    const prompt = await prisma.prompt.findUnique({
      where: { slug: params.slug },
      include: { marketplaceItem: true },
    });
    if (!prompt || !prompt.marketplaceItem) return error('Marketplace template not found', 404);

    const order = await prisma.order.findFirst({
      where: {
        buyerId: session.userId,
        marketplaceItemId: prompt.marketplaceItem.id,
        status: 'paid',
      },
      select: { id: true },
    });

    if (!order) return error('Only purchasers can rate this template', 403);

    const review = await prisma.review.create({
      data: {
        userId: session.userId,
        promptId: prompt.id,
        rating: parsed.data.rating,
        content: parsed.data.content ?? '',
      },
    });

    if (process.env.NODE_ENV !== 'test') {
      await writeAuditLog({
        userId: session.userId,
        action: 'REVIEW_CREATE',
        target: review.id,
        metadata: { promptId: prompt.id, slug: params.slug, rating: parsed.data.rating },
        ipAddress: getClientIp(request),
      });
    }

    return ok({ review }, 201);
  } catch {
    return error('Failed to rate template', 500);
  }
}
