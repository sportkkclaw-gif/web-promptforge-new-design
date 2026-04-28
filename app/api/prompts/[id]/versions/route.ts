import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';

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
  try {
    const body = await request.json();
    const { content, negativePrompt, parameters, changelog } = body;

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

    return ok({ version }, 201);
  } catch {
    return error('Failed to create version');
  }
}
