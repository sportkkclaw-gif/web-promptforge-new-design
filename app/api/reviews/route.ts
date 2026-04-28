import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptId, rating, content } = body;

    if (!promptId || !rating || !content) {
      return error('promptId, rating, and content are required');
    }

    const user = await prisma.user.findFirst();
    if (!user) return error('No user found', 500);

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        promptId,
        rating,
        content,
      },
    });

    // Update prompt rating average
    const allReviews = await prisma.review.findMany({ where: { promptId } });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await prisma.prompt.update({
      where: { id: promptId },
      data: { status: 'marketplace' }, // Auto-promote to marketplace on review
    });

    return ok({ review, newAvg: avg }, 201);
  } catch {
    return error('Failed to create review');
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
