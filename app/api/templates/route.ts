import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category') ?? undefined;
  const tagSlug = searchParams.get('tag') ?? undefined;
  const search = searchParams.get('q') ?? searchParams.get('search') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const prompts = await prisma.prompt.findMany({
      where: {
        status: { in: ['published', 'marketplace'] },
        ...(categorySlug ? { promptTags: { some: { tag: { slug: categorySlug } } } } : {}),
        ...(search ? { OR: [
          { title: { contains: search } },
          { summary: { contains: search } },
          { content: { contains: search } },
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
  } catch {
    return error('Failed to fetch templates');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, summary, engine, model, parameters, negativePrompt, templateId, category } = body;

    if (!title || !content) {
      return error('title and content are required');
    }

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

    return ok({ prompt }, 201);
  } catch {
    return error('Failed to create template');
  }
}
