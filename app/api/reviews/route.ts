// POST /api/reviews — create a review
// GET /api/reviews — list reviews for a prompt

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const CreateReviewSchema = z.object({
  promptId: z.string().min(1, 'promptId is required'),
  rating: z.number().int().min(1).max(5, 'rating must be 1–5'),
  content: z.string().min(1, 'content is required').max(2000, 'content must be ≤2000 chars'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = CreateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { promptId, rating, content } = parsed.data;

  try {
    const review = await prisma.review.create({
      data: {
        userId: session.userId,
        promptId,
        rating,
        content,
      },
    });

    // Update prompt rating average and auto-promote to marketplace
    await prisma.prompt.update({
      where: { id: promptId },
      data: { status: 'marketplace' },
    }).catch(() => {});

    await writeAuditLog({
      userId: session.userId,
      action: 'REVIEW_CREATE',
      target: review.id,
      metadata: { promptId, rating },
      ipAddress: ip,
    });

    return ok({ review }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create review';
    return error(msg, 500);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const promptId = searchParams.get('promptId') ?? undefined;
  if (!promptId) return error('promptId is required');

  try {
    const reviews = await prisma.review.findMany({
      where: { promptId },
      include: { user: { select: { username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return ok({ reviews });
  } catch {
    return error('Failed to fetch reviews');
  }
}
