import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { mockGenerate } from '@/lib/mock/generation';
import { deductCredits } from '@/lib/quota';

// POST /api/generate
// MVP scope: generate prompt text + negative prompt (no image generation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, promptId, parameters } = body;

    const id = templateId ?? promptId;
    if (!id) return error('templateId or promptId is required');

    const prompt = await prisma.prompt.findUnique({ where: { id } });
    if (!prompt) return error('Prompt not found', 404);

    const user = await prisma.user.findFirst();
    if (!user) return error('No user found', 500);

    try {
      await deductCredits(user.id, 1, `Prompt generation: ${prompt.title}`, 'generation', id);
    } catch (quotaErr: any) {
      return error(quotaErr.message || 'Insufficient credits', 402);
    }

    const mergedParameters = { ...JSON.parse(prompt.parameters), ...(parameters ?? {}) };
    const result = await mockGenerate({
      engine: prompt.engine,
      model: prompt.model,
      prompt: prompt.content,
      negativePrompt: prompt.negativePrompt ?? undefined,
      parameters: mergedParameters,
    });

    const run = await prisma.generationRun.create({
      data: {
        promptId: id,
        userId: user.id,
        engine: prompt.engine,
        parameters: JSON.stringify(mergedParameters),
        status: result.status,
      },
    });

    return ok({
      runId: run.id,
      generatedPrompt: result.generatedPrompt,
      negativePrompt: result.negativePrompt,
      missingInfoHints: result.missingInfoHints,
      suggestions: result.suggestions,
      rewrittenPrompt: result.rewrittenPrompt,
      provider: result.provider,
      status: result.status,
    });
  } catch {
    return error('Generation failed');
  }
}
