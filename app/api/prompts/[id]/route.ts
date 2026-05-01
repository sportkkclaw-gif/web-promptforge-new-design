import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import { writeAuditLog, getClientIp } from '@/lib/audit';

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

const UpdatePromptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  summary: z.string().max(500).optional(),
  engine: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  parameters: z.record(z.unknown()).optional(),
  negativePrompt: z.string().max(5000).optional(),
  status: z.enum(['draft', 'published', 'archived', 'private', 'marketplace']).optional(),
});

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        promptTags: { include: { tag: true } },
        marketplaceItem: true,
        reviews: { include: { user: { select: { username: true } } }, take: 5 },
      },
    });
    if (!prompt) return error('Prompt not found', 404);
    return ok({ prompt });
  } catch {
    return error('Failed to fetch prompt');
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const resolved = await resolveUserId(request);
  if (!resolved) return error('No token provided', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = UpdatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  // Ownership guard
  const prompt = await prisma.prompt.findUnique({ where: { id: params.id } });
  if (!prompt) return error('Prompt not found', 404);
  if (prompt.ownerId !== resolved.userId) return error('Not your prompt', 403);

  const updateData: any = {};
  const d = parsed.data;
  if (d.title !== undefined) updateData.title = d.title;
  if (d.content !== undefined) updateData.content = d.content;
  if (d.summary !== undefined) updateData.summary = d.summary;
  if (d.engine !== undefined) updateData.engine = d.engine;
  if (d.model !== undefined) updateData.model = d.model;
  if (d.parameters !== undefined) updateData.parameters = JSON.stringify(d.parameters);
  if (d.negativePrompt !== undefined) updateData.negativePrompt = d.negativePrompt;
  if (d.status !== undefined) updateData.status = d.status;

  try {
    const updated = await prisma.prompt.update({
      where: { id: params.id },
      data: updateData,
    });
    const ip = getClientIp(request);
    await writeAuditLog({ userId: resolved.userId, action: 'PROMPT_UPDATE', target: params.id, metadata: { title: updated.title }, ipAddress: ip });
    return ok({ prompt: updated });
  } catch {
    return error('Failed to update prompt');
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const resolved = await resolveUserId(request);
  if (!resolved) return error('No token provided', 401);

  // Ownership guard
  const prompt = await prisma.prompt.findUnique({ where: { id: params.id } });
  if (!prompt) return error('Prompt not found', 404);
  if (prompt.ownerId !== resolved.userId) return error('Not your prompt', 403);

  try {
    await prisma.prompt.delete({ where: { id: params.id } });
    const ip = getClientIp(request);
    await writeAuditLog({ userId: resolved.userId, action: 'PROMPT_ARCHIVE', target: params.id, metadata: { title: prompt.title }, ipAddress: ip });
    return ok({ deleted: true });
  } catch {
    return error('Failed to delete prompt');
  }
}
