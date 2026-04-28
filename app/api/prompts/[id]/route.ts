import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

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
  try {
    const body = await request.json();
    const { title, content, summary, engine, model, parameters, negativePrompt, status } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (engine !== undefined) updateData.engine = engine;
    if (model !== undefined) updateData.model = model;
    if (parameters !== undefined) updateData.parameters = JSON.stringify(parameters);
    if (negativePrompt !== undefined) updateData.negativePrompt = negativePrompt;
    if (status !== undefined) updateData.status = status;

    const prompt = await prisma.prompt.update({
      where: { id: params.id },
      data: updateData,
    });
    return ok({ prompt });
  } catch {
    return error('Failed to update prompt');
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.prompt.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return error('Failed to delete prompt');
  }
}
