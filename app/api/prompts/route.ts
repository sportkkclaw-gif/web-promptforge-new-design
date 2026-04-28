import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getPublishedPrompts } from '@/lib/services/prompts';

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
  try {
    const body = await request.json();
    const { title, content, summary, engine, model, parameters, negativePrompt } = body;

    if (!title || !content) {
      return error('title and content are required');
    }

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

    return ok({ prompt }, 201);
  } catch (e) {
    return error('Failed to create prompt');
  }
}
