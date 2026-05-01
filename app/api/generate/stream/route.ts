// POST /api/generate/stream — SSE streaming generation endpoint
// Implements FULL_BUILD_CHECKLIST §6.1:
// - Real AI call: OpenAI GPT-4 (primary) + Anthropic Claude (fallback)
// - Streaming response via SSE with full-fidelity partial tokens
// - Generation log entry (PENDING → IN_PROGRESS → COMPLETED/FAILED)
// - Response stored in GenerationRun (full fidelity, including partial tokens for streaming)
// - Credits deducted ONLY on COMPLETED path
// - Mock mode: USE_MOCK_AI=true; isMock flagged in response

import { NextRequest } from 'next/server';
import { sseEvent, sseComment } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';
import { aiStream } from '@/lib/ai';
import { deductCredits, checkGenerationQuota } from '@/lib/quota';
import { validateGenerationConstraints, injectTemplateVariables } from '@/lib/services/generation';
import { z } from 'zod';

const GenerateBodySchema = z.object({
  templateId: z.string().optional(),
  promptId: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
}).refine(data => data.templateId || data.promptId, {
  message: 'Either templateId or promptId must be provided',
});

async function resolveUserId(request: NextRequest) {
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
  const resolved = await resolveUserId(request);
  if (!resolved) {
    return new Response(
      sseEvent('error', { message: 'No token provided' }),
      { status: 401, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }
  const { userId } = resolved;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      sseEvent('error', { message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }

  const parsed = GenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      sseEvent('error', { message: parsed.error.errors[0]?.message || 'Validation failed' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }

  const { templateId, promptId, parameters } = parsed.data;
  const id = templateId ?? promptId;
  if (!id) {
    return new Response(
      sseEvent('error', { message: 'templateId or promptId is required' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }

  const prompt = await prisma.prompt.findUnique({ where: { id } });
  if (!prompt) {
    return new Response(
      sseEvent('error', { message: 'Prompt not found' }),
      { status: 404, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }

  const mergedParameters = { ...JSON.parse(prompt.parameters), ...(parameters ?? {}) };

  // ── Anti-failure constraint validation (BEFORE AI call) ────────────────────
  const constraintResult = validateGenerationConstraints(prompt.content, mergedParameters);
  if (!constraintResult.valid) {
    const messages = constraintResult.errors.map(e => `${e.constraint}: ${e.message}`).join('; ');
    return new Response(
      sseEvent('error', { message: `Constraint validation failed: ${messages}` }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }

  // ── Template variable injection (BEFORE AI call) ────────────────────────────
  const variableValues: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(mergedParameters)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      variableValues[key] = value;
    }
  }
  const resolvedPrompt = injectTemplateVariables(prompt.content, variableValues);

  // ── Quota availability check (credits validated before stream; actual deduction on COMPLETED) ─
  const quotaCheck = await checkGenerationQuota(userId, 1);
  if (!quotaCheck.allowed) {
    return new Response(
      sseEvent('error', {
        message: quotaCheck.reason ?? 'Insufficient credits',
        code: 'QUOTA_EXCEEDED',
        currentCredits: quotaCheck.currentCredits,
        requiredCredits: quotaCheck.requiredCredits,
        periodRemaining: quotaCheck.periodRemaining,
      }),
      { status: 402, headers: { 'Content-Type': 'text/event-stream', 'X-Accel-Buffering': 'no' } }
    );
  }

  // ── Create GenerationRun in PENDING (queued) state ───────────────────────────
  const run = await prisma.generationRun.create({
    data: {
      promptId: id,
      userId,
      engine: prompt.engine,
      parameters: JSON.stringify(mergedParameters),
      status: 'queued', // PENDING lifecycle state
    },
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          // Controller may already be closed
        }
      };

      const sendComment = (comment: string) => {
        try {
          controller.enqueue(encoder.encode(sseComment(comment)));
        } catch {
          // Controller may already be closed
        }
      };

      try {
        // Stage 1: PENDING notification
        send('progress', { stage: 'queued', runId: run.id, message: 'Generation queued (PENDING)' });
        sendComment('status: PENDING');
        await sleep(50);

        // Stage 2: transition to IN_PROGRESS
        await prisma.generationRun.update({ where: { id: run.id }, data: { status: 'running' } });
        send('progress', { stage: 'running', runId: run.id, message: 'Generating... (IN_PROGRESS)' });
        sendComment('status: IN_PROGRESS');
        await sleep(50);

        // Stage 3: Build prompt for AI
        const systemPrompt = resolvedPrompt;
        const userPrompt = `Generate a prompt based on: ${JSON.stringify(variableValues)}`;

        // Collect streamed text for full-fidelity persistence
        let fullText = '';
        let finalMeta: {
          provider: string;
          model: string;
          finishReason: string;
          isMock: boolean;
          usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
        } | null = null;

        // Stage 4: Stream using real AI (or mock if USE_MOCK_AI=true)
        for await (const chunk of aiStream({
          systemPrompt,
          userPrompt,
          model: prompt.model ?? undefined,
          maxTokens: (mergedParameters.maxTokens as number) || 500,
          temperature: (mergedParameters.temperature as number) || 0.7,
        })) {
          fullText += chunk.delta;

          // Send SSE token event for real-time display
          send('token', {
            delta: chunk.delta,
            partial: fullText,
            done: chunk.done,
          });

          // Persist partial token every ~50 characters for full-fidelity
          if (fullText.length % 50 < (chunk.delta.length % 50) || chunk.done) {
            await prisma.generationRun.update({
              where: { id: run.id },
              data: {
                response: JSON.stringify({
                  text: fullText,
                  partial: true,
                  provider: chunk.provider,
                  model: chunk.model,
                  isMock: chunk.isMock,
                }),
              },
            });
          }

          if (chunk.done) {
            finalMeta = {
              provider: chunk.provider,
              model: chunk.model,
              finishReason: chunk.finishReason ?? 'stop',
              isMock: chunk.isMock,
              usage: chunk.usage,
            };
          }
        }

        // Stage 5: Deduct credits + transition to COMPLETED + persist full response
        if (!finalMeta) {
          finalMeta = { provider: 'unknown', model: 'unknown', finishReason: 'unknown', isMock: true };
        }

        try {
          await deductCredits(userId, 1, `Prompt generation (stream): ${prompt.title}`, 'generation', run.id);
        } catch {
          // Credit deduction failed → mark as failed, skip response persistence
          await prisma.generationRun.update({
            where: { id: run.id },
            data: { status: 'failed', error: 'Credit deduction failed' },
          });
          send('error', { message: 'Credit deduction failed', code: 'CREDIT_DEDUCTION_FAILED' });
          controller.close();
          return;
        }

        // Final COMPLETED persistence with full response + metadata
        await prisma.generationRun.update({
          where: { id: run.id },
          data: {
            status: 'succeeded',
            response: JSON.stringify({
              text: fullText,
              partial: false,
              provider: finalMeta.provider,
              model: finalMeta.model,
              finishReason: finalMeta.finishReason,
              isMock: finalMeta.isMock,
              usage: finalMeta.usage,
            }),
          },
        });

        send('complete', {
          runId: run.id,
          text: fullText,
          provider: finalMeta.provider,
          model: finalMeta.model,
          finishReason: finalMeta.finishReason,
          isMock: finalMeta.isMock,
          usage: finalMeta.usage,
          status: 'succeeded',
        });
        sendComment('status: COMPLETED');
      } catch (err: any) {
        // AI call failed → credits were NOT deducted (deduction only on SUCCESS path)
        await prisma.generationRun.update({
          where: { id: run.id },
          data: { status: 'failed', error: err.message || 'Generation failed' },
        });
        send('error', { message: err.message || 'Generation failed', code: 'GENERATION_FAILED' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
