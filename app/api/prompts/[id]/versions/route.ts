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

const CreateVersionSchema = z.object({
  content: z.string().max(50000).optional(),
  negativePrompt: z.string().max(5000).optional(),
  parameters: z.record(z.unknown()).optional(),
  changelog: z.string().max(1000).optional(),
});

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const versions = await prisma.promptVersion.findMany({
      where: { promptId: params.id },
      orderBy: { version: 'desc' },
    });
    return ok({ versions });
  } catch {
    return error('Failed to fetch versions');
  }
}

export async function POST(request: NextRequest, { params }: Params) {
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

  const parsed = CreateVersionSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { content, negativePrompt, parameters, changelog } = parsed.data;

  try {
    // Get latest version number
    const latest = await prisma.promptVersion.findFirst({
      where: { promptId: params.id },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const version = await prisma.promptVersion.create({
      data: {
        promptId: params.id,
        version: nextVersion,
        content: content ?? '',
        negativePrompt: negativePrompt ?? '',
        parameters: JSON.stringify(parameters ?? {}),
        changelog: changelog ?? '',
      },
    });

    // Update main prompt with new content
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (negativePrompt !== undefined) updateData.negativePrompt = negativePrompt;
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters);
    if (Object.keys(updateData).length > 0) {
      await prisma.prompt.update({ where: { id: params.id }, data: updateData });
    }

    const ip = getClientIp(request);
    await writeAuditLog({ userId: resolved.userId, action: 'PROMPT_UPDATE', target: params.id, metadata: { version: nextVersion, changelog: changelog ?? '' }, ipAddress: ip });

    return ok({ version }, 201);
  } catch {
    return error('Failed to create version');
  }
}
