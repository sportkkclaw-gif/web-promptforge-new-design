// app/api/templates/[id]/route.ts
// GET /api/templates/:id — get template detail
// PATCH /api/templates/:id — update template (creates new version)
// DELETE /api/templates/:id — soft delete template

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';

interface Params { params: { id: string } }

const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;

const UpdateTemplateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  engine: z.string().optional(),
  model: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  negativePrompt: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  // Versioning fields
  changelog: z.string().optional(),
});

function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

export async function GET(_req: NextRequest, { params }: Params) {
  // Support both CUID id and slug
  const where = isValidId(params.id)
    ? { id: params.id }
    : { slug: params.id };

  try {
    const prompt = await prisma.prompt.findUnique({
      where,
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        promptTags: { include: { tag: true } },
        marketplaceItem: true,
        reviews: { include: { user: { select: { username: true } } }, take: 5 },
      },
    });
    if (!prompt) return error('Template not found', 404);
    return ok({ prompt });
  } catch {
    return error('Failed to fetch template');
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  try {
    const existing = await prisma.prompt.findUnique({
      where: isValidId(params.id) ? { id: params.id } : { slug: params.id },
    });
    if (!existing) return error('Template not found', 404);
    if (existing.ownerId !== session.userId) return error('Forbidden', 403);

    const body = await request.json();
    const parsed = UpdateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return error('Invalid request body', 400);
    }

    const { title, content, summary, engine, model, parameters, negativePrompt, status, changelog } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (engine !== undefined) updateData.engine = engine;
    if (model !== undefined) updateData.model = model;
    if (negativePrompt !== undefined) updateData.negativePrompt = negativePrompt;
    if (status !== undefined) updateData.status = status;
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters);

    // ── Versioning: auto-create a new PromptVersion if content changed ──────────
    let newVersionNumber: number | null = null;
    const resolvedPromptId = isValidId(params.id) ? params.id : (await prisma.prompt.findUnique({ where: { slug: params.id } }))?.id;
    if (!resolvedPromptId) return error('Template not found', 404);

    if (content !== undefined && resolvedPromptId) {
      // Fetch latest version number
      const latest = await prisma.promptVersion.findFirst({
        where: { promptId: resolvedPromptId },
        orderBy: { version: 'desc' },
      });
      newVersionNumber = (latest?.version ?? 0) + 1;

      // Create new version record
      await prisma.promptVersion.create({
        data: {
          promptId: resolvedPromptId,
          version: newVersionNumber,
          content,
          negativePrompt: negativePrompt ?? existing.negativePrompt ?? '',
          parameters: JSON.stringify(parameters ?? {}),
          changelog: changelog ?? '',
        },
      });
    }

    // Update main prompt record (always use id for update)
    if (Object.keys(updateData).length > 0 && resolvedPromptId) {
      await prisma.prompt.update({
        where: { id: resolvedPromptId },
        data: updateData,
      });
    }

    // Fetch the actual id for response
    const resolvedId = resolvedPromptId ?? params.id;
    const updatedPrompt = await prisma.prompt.findUnique({
      where: { id: resolvedId },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'PROMPT_UPDATE',
      target: `template:${params.id}`,
      metadata: {
        fields: Object.keys(updateData),
        ...(newVersionNumber !== null ? { newVersion: newVersionNumber } : {}),
      },
      ipAddress: getClientIp(request),
    });

    return ok({ prompt: updatedPrompt, version: newVersionNumber });
  } catch {
    return error('Failed to update template');
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  try {
    // Resolve id-or-slug first
    const resolvedId = isValidId(params.id) ? params.id : (await prisma.prompt.findUnique({ where: { slug: params.id } }))?.id;
    if (!resolvedId) return error('Template not found', 404);

    const existing = await prisma.prompt.findUnique({ where: { id: resolvedId } });
    if (!existing) return error('Template not found', 404);
    if (existing.ownerId !== session.userId) return error('Forbidden', 403);

    // Soft-delete: set status to 'archived' instead of hard-deleting
    const updated = await prisma.prompt.update({
      where: { id: resolvedId },
      data: { status: 'archived' },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'PROMPT_ARCHIVE',
      target: `template:${resolvedId}`,
      metadata: { softDeleted: true, formerStatus: existing.status },
      ipAddress: getClientIp(request),
    });

    return ok({ deleted: true, prompt: { id: updated.id, status: updated.status } });
  } catch {
    return error('Failed to delete template');
  }
}
