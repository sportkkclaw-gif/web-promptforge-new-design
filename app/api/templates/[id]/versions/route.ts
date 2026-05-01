import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';

interface Params { params: { id: string } }

const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;
function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

const CreateVersionSchema = z.object({
  content: z.string().min(1).optional(),
  negativePrompt: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  changelog: z.string().optional(),
});

// Helper: resolve prompt id from id-or-slug param
async function resolvePromptId(idOrSlug: string): Promise<string | null> {
  if (isValidId(idOrSlug)) return idOrSlug;
  const prompt = await prisma.prompt.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
  return prompt?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const promptId = await resolvePromptId(params.id);
    if (!promptId) return error('Template not found', 404);

    const versions = await prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { version: 'desc' },
    });
    return ok({ versions });
  } catch {
    return error('Failed to fetch versions');
  }
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
    const promptId = await resolvePromptId(params.id);
    if (!promptId) return error('Template not found', 404);

    const promptExists = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!promptExists) return error('Template not found', 404);
    if (promptExists.ownerId !== session.userId) return error('Forbidden', 403);

    const body = await request.json();
    const parsed = CreateVersionSchema.safeParse(body);
    if (!parsed.success) {
      return error('Invalid request body', 400);
    }

    const { content, negativePrompt, parameters, changelog } = parsed.data;

    const latest = await prisma.promptVersion.findFirst({
      where: { promptId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const version = await prisma.promptVersion.create({
      data: {
        promptId,
        version: nextVersion,
        content: content ?? '',
        negativePrompt: negativePrompt ?? '',
        parameters: JSON.stringify(parameters ?? {}),
        changelog: changelog ?? '',
      },
    });

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (negativePrompt !== undefined) updateData.negativePrompt = negativePrompt;
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters);
    if (Object.keys(updateData).length > 0) {
      await prisma.prompt.update({ where: { id: promptId }, data: updateData });
    }

    await writeAuditLog({
      userId: session.userId,
      action: 'PROMPT_UPDATE',
      target: `template:${promptId}:version:${version.id}`,
      metadata: { templateId: promptId, version: version.version },
      ipAddress: getClientIp(request),
    });

    return ok({ version }, 201);
  } catch {
    return error('Failed to create version');
  }
}
