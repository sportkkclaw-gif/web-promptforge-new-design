// Legacy endpoint: POST /api/prompts/:id/generate — generate from prompt ID
// Implements FULL_BUILD_CHECKLIST §6.1:
// - Template resolution + variable injection before generation call
// - Anti-failure constraint validation before AI call
// - Generation log lifecycle: PENDING → IN_PROGRESS → COMPLETED/FAILED
// - Credits deducted ONLY on COMPLETED path
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';
import { mockGenerate } from '@/lib/mock/generation';
import { deductCredits, checkGenerationQuota } from '@/lib/quota';
import { validateGenerationConstraints, injectTemplateVariables } from '@/lib/services/generation';
import { z } from 'zod';

const PromptGenerateBodySchema = z.object({
  parameters: z.record(z.unknown()).optional(),
});

// CUID pattern: starts with letter, 25 chars total (Prisma cuid())
const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;

const ParamsSchema = z.object({
  id: z.string().regex(CUID_PATTERN, 'Invalid prompt ID'),
});

interface Params { params: { id: string } }

function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

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

export async function POST(request: NextRequest, { params }: Params) {
  // Check auth first before any input validation
  const resolved = await resolveUserId(request);
  if (!resolved) return error('No token provided', 401);
  const { userId } = resolved;

  const paramsResult = ParamsSchema.safeParse({ id: params.id });
  if (!paramsResult.success) {
    return error(paramsResult.error.errors[0]?.message || 'Invalid prompt ID', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = PromptGenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  try {
    const { parameters } = parsed.data;

    const prompt = await prisma.prompt.findUnique({ where: { id: params.id } });
    if (!prompt) return error('Prompt not found', 404);

    const mergedParameters = { ...JSON.parse(prompt.parameters), ...(parameters ?? {}) };

    // ── Anti-failure constraint validation (BEFORE AI call) ────────────────────────
    const constraintResult = validateGenerationConstraints(prompt.content, mergedParameters);
    if (!constraintResult.valid) {
      const messages = constraintResult.errors.map(e => `${e.constraint}: ${e.message}`).join('; ');
      return error(`Constraint validation failed: ${messages}`, 400);
    }

    // ── Template variable injection (BEFORE AI call) ───────────────────────────────
    const variableValues: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(mergedParameters)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        variableValues[key] = value;
      }
    }
    const resolvedPrompt = injectTemplateVariables(prompt.content, variableValues);

    // ── Two-phase credit check: wallet balance AND monthly quota ─────────────────
    const quotaCheck = await checkGenerationQuota(userId, 1);
    if (!quotaCheck.allowed) {
      return error(quotaCheck.reason ?? 'Insufficient credits', 402);
    }

    // ── Create GenerationRun in PENDING (queued) state ────────────────────────────
    const run = await prisma.generationRun.create({
      data: {
        promptId: params.id,
        userId: userId,
        engine: prompt.engine,
        parameters: JSON.stringify(mergedParameters),
        status: 'queued', // PENDING lifecycle state
      },
    });

    // ── Transition to IN_PROGRESS ─────────────────────────────────────────────────
    await prisma.generationRun.update({
      where: { id: run.id },
      data: { status: 'running' },
    });

    // ── Execute mock generation ────────────────────────────────────────────────────
    let result: Awaited<ReturnType<typeof mockGenerate>>;
    try {
      result = await mockGenerate({
        engine: prompt.engine,
        model: prompt.model,
        prompt: resolvedPrompt,
        negativePrompt: prompt.negativePrompt ?? undefined,
        parameters: mergedParameters,
      });
    } catch (err: any) {
      // AI call failed → transition to FAILED, no credit
      await prisma.generationRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: err.message || 'Generation engine error' },
      });
      return error('Generation failed: ' + (err.message || 'Unknown error'), 500);
    }

    // ── Create mock output records ─────────────────────────────────────────────────
    const runIdStr = run.id;
    const outputSeeds = Array.from({ length: 4 }, (_, index) => `${runIdStr}-${index}`);
    await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        prisma.generationOutput.create({
          data: {
            runId: runIdStr,
            url: `/mock-output/${runIdStr}/${index + 1}.png`,
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
            seed: outputSeeds[index],
          },
        })
      )
    );

    // ── Transition to COMPLETED + deduct credits ──────────────────────────────────
    try {
      await deductCredits(userId, 1, `Prompt generation: ${prompt.title}`, 'generation', run.id);
    } catch (quotaErr: any) {
      // Credit deduction failed → mark as FAILED
      await prisma.generationRun.update({
        where: { id: run.id },
        data: { status: 'failed', error: `Credit deduction failed: ${quotaErr.message}` },
      });
      return error('Generation completed but credit deduction failed', 500);
    }

    await prisma.generationRun.update({
      where: { id: run.id },
      data: { status: 'succeeded' },
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
      outputs: outputSeeds.map((seed, index) => ({
        id: `${runIdStr}_${index + 1}`,
        url: `/mock-output/${runIdStr}/${index + 1}.png`,
        seed,
        prompt: result.generatedPrompt,
        provider: result.provider,
        status: 'succeeded',
      })),
    });
  } catch {
    return error('Generation failed');
  }
}
