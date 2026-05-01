// app/api/templates/[id]/deprecate/route.ts
// POST /api/templates/:id/deprecate — Mark template as deprecated (owner only)

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';

interface Params { params: { id: string } }

const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;
function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

export async function POST(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  try {
    const prompt = await prisma.prompt.findUnique({
      where: isValidId(params.id) ? { id: params.id } : { slug: params.id },
    });
    if (!prompt) return error('Template not found', 404);
    if (prompt.ownerId !== session.userId) return error('Forbidden', 403);

    // Mark as deprecated by archiving status
    const updated = await prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        status: 'archived',
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'PROMPT_ARCHIVE',
      target: `template:${prompt.id}`,
      metadata: { deprecated: true, formerStatus: prompt.status },
      ipAddress: getClientIp(request),
    });

    return ok({ prompt: updated });
  } catch {
    return error('Failed to deprecate template');
  }
}