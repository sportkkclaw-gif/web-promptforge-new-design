// POST /api/generate/quality-flag — flag generation quality (good/bad)
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const QualityFlagSchema = z.object({
  runId: z.string(),
  rating: z.enum(['good', 'bad']),
});

export async function POST(request: NextRequest) {
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

  const parsed = QualityFlagSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { runId, rating } = parsed.data;

  try {
    const run = await prisma.generationRun.findUnique({ where: { id: runId } });

    if (!run) return error('Generation run not found', 404);

    // Ensure the run belongs to the authenticated user
    if (run.userId !== session.userId) return error('Not authorized', 403);

    // Store quality feedback in GenerationRun.response as metadata
    const existingResponse = run.response ? JSON.parse(run.response) : {};
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        response: JSON.stringify({
          ...existingResponse,
          qualityRating: rating,
          qualityRatedAt: new Date().toISOString(),
        }),
      },
    });

    return ok({ message: 'Quality feedback recorded', rating });
  } catch {
    return error('Failed to record quality flag');
  }
}
