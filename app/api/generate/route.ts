// POST /api/generate
// Implements FULL_BUILD_CHECKLIST §6.1:
// - Real AI call: OpenAI GPT-4 (primary) + Anthropic Claude (fallback)
// - Template resolution + variable injection before generation call
// - Anti-failure constraint validation before AI call
// - Generation log lifecycle: PENDING → IN_PROGRESS → COMPLETED/FAILED
// - Credits deducted ONLY on COMPLETED path
// - Response stored in GenerationRun (full fidelity)
// - Mock mode: USE_MOCK_AI=true; isMock flagged in response
// - Overage response: 402 with upgrade prompt contract

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';
import { aiGenerate } from '@/lib/ai';
import { deductCredits, checkGenerationQuota } from '@/lib/quota';
import {
  processGeneration,
  validateGenerationConstraints,
  injectTemplateVariables,
} from '@/lib/services/generation';
import { z } from 'zod';

const GenerateBodySchema = z.object({
  templateId: z.string().optional(),
  promptId: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
}).refine(data => data.templateId || data.promptId, {
  message: 'Either templateId or promptId must be provided',
});

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

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveUserId(request);
    if (!resolved) return error('No token provided', 401);
    const { userId } = resolved;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error('Invalid JSON body', 400);
    }

    const parsed = GenerateBodySchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
    }

    const { templateId, promptId, parameters } = parsed.data;
    const id = templateId ?? promptId;
    if (!id) return error('templateId or promptId is required');

    // ── Fetch prompt ──────────────────────────────────────────────────────────────
    const prompt = await prisma.prompt.findUnique({ where: { id } });
    if (!prompt) return error('Prompt not found', 404);

    const mergedParameters = { ...JSON.parse(prompt.parameters), ...(parameters ?? {}) };

    // ── Anti-failure constraint validation (BEFORE AI call) ─────────────────────
    const constraintResult = validateGenerationConstraints(prompt.content, mergedParameters);
    if (!constraintResult.valid) {
      const messages = constraintResult.errors.map(e => `${e.constraint}: ${e.message}`).join('; ');
      return error(`Constraint validation failed: ${messages}`, 400);
    }

    // ── Template variable injection (BEFORE AI call) ────────────────────────────
    const variableValues: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(mergedParameters)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        variableValues[key] = value;
      }
    }
    const resolvedPrompt = injectTemplateVariables(prompt.content, variableValues);

    // ── Two-phase quota check: wallet balance AND monthly quota ─────────────────
    const quotaCheck = await checkGenerationQuota(userId, 1);
    if (!quotaCheck.allowed) {
      // ── Overage response: 402 with upgrade prompt contract ──────────────────
      return error(quotaCheck.reason ?? 'Insufficient credits', 402, {
        code: 'QUOTA_EXCEEDED',
        currentCredits: quotaCheck.currentCredits,
        requiredCredits: quotaCheck.requiredCredits,
        periodRemaining: quotaCheck.periodRemaining,
        upgradeRequired: true,
        message: quotaCheck.reason ?? 'Insufficient credits',
      });
    }

    // ── Execute generation with full lifecycle management ─────────────────────────
    // processGeneration handles: PENDING → IN_PROGRESS → COMPLETED/FAILED
    // Credits are deducted inside processGeneration only on COMPLETED
    let result: Awaited<ReturnType<typeof processGeneration>>;
    try {
      result = await processGeneration({
        userId,
        promptId: id,
        variableValues,
        parameters: mergedParameters,
      });
    } catch (err: any) {
      if (err.message?.includes('Constraint validation failed')) {
        return error(err.message, 400);
      }
      if (err.message?.includes('Prompt not found')) {
        return error('Prompt not found', 404);
      }
      if (err.message?.includes('Credit deduction failed')) {
        return error('Generation completed but credit deduction failed', 500);
      }
      return error('Generation failed: ' + (err.message || 'Unknown error'));
    }

    return ok({
      runId: result.runId,
      generatedPrompt: result.generatedPrompt,
      negativePrompt: result.negativePrompt,
      missingInfoHints: result.missingInfoHints,
      suggestions: result.suggestions,
      rewrittenPrompt: result.rewrittenPrompt,
      provider: result.provider,
      isMock: result.provider === 'mock',
      status: result.status,
    });
  } catch {
    return error('Generation failed');
  }
}
