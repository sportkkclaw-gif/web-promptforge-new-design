import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getPublishedPrompts } from '@/lib/services/prompts';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const CreatePromptSchema = z.object({
  title: z.string().min(1, 'title is required').max(200, 'title must be ≤200 chars'),
  content: z.string().min(1, 'content is required').max(50000, 'content must be ≤50000 chars'),
  summary: z.string().max(500, 'summary must be ≤500 chars').optional(),
  engine: z.string().max(50, 'engine must be ≤50 chars').optional(),
  model: z.string().max(50, 'model must be ≤50 chars').optional(),
  parameters: z.record(z.unknown()).optional(),
  negativePrompt: z.string().max(5000, 'negativePrompt must be ≤5000 chars').optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category') ?? undefined;
  const tagSlug = searchParams.get('tag') ?? undefined;
  const search = searchParams.get('q') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const prompts = await getPublishedPrompts({ categorySlug, tagSlug, search, limit, offset });
    return ok({ prompts, limit, offset });
  } catch (e) {
    return error('Failed to fetch prompts');
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = CreatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { title, content, summary, engine, model, parameters, negativePrompt } = parsed.data;

  try {
    // In mock mode, use a seed user
    const user = await prisma.user.findFirst();
    if (!user) return error('No user found', 500);

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const prompt = await prisma.prompt.create({
      data: {
        ownerId: user.id,
        title,
        slug,
        summary: summary ?? title,
        content,
        negativePrompt: negativePrompt ?? '',
        engine: engine ?? 'stable-diffusion',
        model: model ?? 'sd-xl',
        parameters: JSON.stringify(parameters ?? {}),
        status: 'draft',
      },
    });

    const ip = getClientIp(request);
    await writeAuditLog({ userId: user.id, action: 'PROMPT_CREATE', target: prompt.id, metadata: { title, engine: prompt.engine, model: prompt.model }, ipAddress: ip });

    return ok({ prompt }, 201);
  } catch (e) {
    return error('Failed to create prompt');
  }
}
