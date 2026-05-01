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
const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;

interface Params { params: { id: string } }

function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

// Helper: resolve prompt id from id-or-slug param
async function resolvePromptId(idOrSlug: string): Promise<string | null> {
  if (isValidId(idOrSlug)) return idOrSlug;
  const prompt = await prisma.prompt.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
  return prompt?.id ?? null;
}

const ACTION_TO_AUDIT: Record<string, string> = {
  publish: 'PROMPT_PUBLISH',
  unpublish: 'PROMPT_UNPUBLISH',
  archive: 'PROMPT_ARCHIVE',
};

export async function POST(request: NextRequest, { params }: Params) {
  const resolvedUserId = await resolveUserId(request);
  if (!resolvedUserId) return error('No token provided', 401);

  const promptId = await resolvePromptId(params.id);
  if (!promptId) return error('Prompt not found', 404);

  // Ownership guard
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) return error('Prompt not found', 404);
  if (prompt.ownerId !== resolvedUserId.userId) return error('Not your prompt', 403);

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
      where: { id: promptId },
      data: { status: targetStatus },
    });

    const ip = getClientIp(request);
    await writeAuditLog({ userId: resolvedUserId.userId, action: ACTION_TO_AUDIT[action] as any, target: promptId, metadata: { previousStatus: prompt.status, newStatus: targetStatus }, ipAddress: ip });

    // Auto-create marketplace item for published prompts (if not already listed)
    let marketplaceItemCreated = false;
    try {
      const existingItem = await prisma.marketplaceItem.findUnique({ where: { promptId: updated.id } });
      if (!existingItem) {
        await prisma.marketplaceItem.create({
          data: {
            promptId: updated.id,
            sellerId: resolvedUserId.userId,
            priceCredits: 0,
            license: 'personal',
          },
        });
        marketplaceItemCreated = true;
      }
    } catch (miErr: unknown) {
      console.error('marketplace item auto-create failed:', typeof miErr === 'string' ? miErr : JSON.stringify(miErr));
      // Non-fatal: still return success since prompt publish succeeded
    }

    return ok({ prompt: updated, newStatus: targetStatus, marketplaceItemCreated });
  } catch (err) {
    console.error('Publish route error:', err);
    return error('Failed to change publish status');
  }
}
