import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';

async function resolveUserId(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyResult = await validateApiKey(authHeader);
  if (apiKeyResult) return { userId: apiKeyResult.userId };
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  return { userId: session.userId };
}

const PublishSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive'], { errorMap: () => ({ message: 'action must be "publish"|"unpublish"|"archive"' }) }),
});

// CUID pattern: starts with letter, 25 chars total (Prisma cuid())
const CUID_PATTERN = /^[a-z][A-Za-z0-9]{23}$/;

interface Params { params: { id: string } }

function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

const ACTION_TO_AUDIT: Record<string, string> = {
  publish: 'PROMPT_PUBLISH',
  unpublish: 'PROMPT_UNPUBLISH',
  archive: 'PROMPT_ARCHIVE',
};

export async function POST(request: NextRequest, { params }: Params) {
  if (!isValidId(params.id)) {
    return error('Invalid prompt ID', 400);
  }

  const resolved = await resolveUserId(request);
  if (!resolved) return error('No token provided', 401);

  // Ownership guard
  const prompt = await prisma.prompt.findUnique({ where: { id: params.id } });
  if (!prompt) return error('Prompt not found', 404);
  if (prompt.ownerId !== resolved.userId) return error('Not your prompt', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const action = parsed.data.action;
  const targetStatus = action === 'publish' ? 'published' : action === 'unpublish' ? 'private' : 'archived';

  try {
    const updated = await prisma.prompt.update({
      where: { id: params.id },
      data: { status: targetStatus },
    });

    const ip = getClientIp(request);
    await writeAuditLog({ userId: resolved.userId, action: ACTION_TO_AUDIT[action] as any, target: params.id, metadata: { previousStatus: prompt.status, newStatus: targetStatus }, ipAddress: ip });

    return ok({ prompt: updated, newStatus: targetStatus });
  } catch {
    return error('Failed to change publish status');
  }
}
