// GET /api/generate/:id — get a single generation run by ID
// POST /api/generate/:id/cancel — cancel an in-progress generation run

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/generate/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  const { id } = params;

  try {
    const run = await prisma.generationRun.findUnique({
      where: { id },
      include: {
        prompt: { select: { id: true, title: true, slug: true } },
        outputs: true,
      },
    });

    if (!run) return error('Generation run not found', 404);

    // Ensure the run belongs to the authenticated user
    if (run.userId !== session.userId) return error('Not authorized to access this run', 403);

    return ok({ run });
  } catch {
    return error('Failed to fetch generation run');
  }
}

// POST /api/generate/:id/cancel
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  const { id } = params;

  try {
    const run = await prisma.generationRun.findUnique({ where: { id } });

    if (!run) return error('Generation run not found', 404);

    if (run.userId !== session.userId) return error('Not authorized to cancel this run', 403);

    // Only cancel if still in a cancellable state
    const cancellable = ['queued', 'running'];
    if (!cancellable.includes(run.status)) {
      return error(`Cannot cancel run in '${run.status}' state`, 409);
    }

    const updated = await prisma.generationRun.update({
      where: { id },
      data: { status: 'failed', error: 'Cancelled by user' },
    });

    return ok({ run: updated, message: 'Generation cancelled' });
  } catch {
    return error('Failed to cancel generation run');
  }
}