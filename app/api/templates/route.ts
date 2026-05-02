import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;

const GetTemplatesQuerySchema = z.object({
  category: z.string().max(64).optional(),
  tag: z.string().max(64).optional(),
  q: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
  offset: z.coerce.number().int().min(0).max(MAX_OFFSET).default(0),
});

const CreateTemplateSchema = z.object({
  title: z.string().min(1, 'title is required').max(200),
  content: z.string().min(1, 'content is required').max(20000),
  summary: z.string().max(1000).optional(),
  engine: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  parameters: z.record(z.unknown()).optional(),
  negativePrompt: z.string().max(5000).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = {
    category: searchParams.get('category') ?? undefined,
    tag: searchParams.get('tag') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  };
  const parsed = GetTemplatesQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Invalid query params', 400);
  }

  const { category, tag, q, search, limit, offset } = parsed.data;
  const categorySlug = category;
  const tagSlug = tag;
  const searchQuery = q ?? search;
  const ip = getClientIp(request);

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (token) {
    const session = getSession(token);
    if (session) {
      await writeAuditLog({ userId: session.userId, action: 'TEMPLATE_LIST', ipAddress: ip });
    }
  }

  try {
    const prompts = await prisma.prompt.findMany({
      where: {
        status: { in: ['published', 'marketplace'] },
        ...(categorySlug ? { promptTags: { some: { tag: { slug: categorySlug } } } } : {}),
        ...(tagSlug ? { promptTags: { some: { tag: { slug: tagSlug } } } } : {}),
        ...(searchQuery ? { OR: [
          { title: { contains: searchQuery } },
          { summary: { contains: searchQuery } },
          { content: { contains: searchQuery } },
        ]} : {}),
      },
      include: {
        owner: { select: { id: true, username: true, avatarUrl: true } },
        promptTags: { include: { tag: true } },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
    return ok({ prompts, limit, offset });
  } catch (err) {
    console.error('[GET /api/templates] DB error:', err);
    return error('Failed to fetch templates', 500);
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const parsed = CreateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || 'Invalid request body';
      return error(message, 400);
    }

    const { title, content, summary, engine, model, parameters, negativePrompt } = parsed.data;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const prompt = await prisma.prompt.create({
      data: {
        ownerId: session.userId,
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

    await writeAuditLog({
      userId: session.userId,
      action: 'PROMPT_CREATE',
      target: `template:${prompt.id}`,
      metadata: { source: 'templates.create' },
      ipAddress: getClientIp(request),
    });

    return ok({ prompt }, 201);
  } catch {
    return error('Failed to create template');
  }
}
