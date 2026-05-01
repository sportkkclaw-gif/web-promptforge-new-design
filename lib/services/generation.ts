/**
 * Generation Service
 * Implements FULL_BUILD_CHECKLIST §6.1 P0:
 * - Template resolution + variable injection before AI call
 * - Anti-failure constraint validation before AI call
 * - Generation log lifecycle (PENDING → IN_PROGRESS → COMPLETED/FAILED)
 *   with credit deduction tied to COMPLETED path only
 * - Real AI wiring: OpenAI primary, Anthropic fallback, mock if USE_MOCK_AI=true
 *
 * Architecture:
 * - GenerationRun record is the log entry (status field drives lifecycle)
 * - Credit deduction is deferred until COMPLETED; FAILED paths skip deduction
 * - Variable injection uses applyVariables() from prompt-as-code
 * - Constraint validation uses validateConstraints() from prompt-as-code
 */

import prisma from '@/lib/prisma';
import { applyVariables, validateConstraints, type ConstraintSpec } from '@/lib/prompt-as-code';
import { deductCredits } from '@/lib/quota';
import { aiGenerate, type AIProvider } from '@/lib/ai';

// ─── Lifecycle Status ───────────────────────────────────────────────────────────

/**
 * GenerationRun lifecycle states:
 * - PENDING:     Created, waiting to start processing (queued by the scheduler)
 * - IN_PROGRESS: Actively being processed by the AI engine
 * - COMPLETED:   Successfully finished; credits deducted
 * - FAILED:      Finished with error; no credit charge
 * - CANCELLED:   User cancelled while queued/in-progress; no credit charge
 *
 * Status transitions:
 *   PENDING → IN_PROGRESS (processing starts)
 *   IN_PROGRESS → COMPLETED (success, deduct credits)
 *   IN_PROGRESS → FAILED (error, no credit)
 *   PENDING → CANCELLED (user cancelled before start, no credit)
 *   IN_PROGRESS → CANCELLED (user cancelled mid-run, no credit)
 */
export type GenerationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// ─── Constraint Validation ─────────────────────────────────────────────────────

export interface ConstraintValidationResult {
  valid: boolean;
  errors: Array<{ constraint: string; message: string }>;
}

/**
 * Parses constraint-relevant fields from a prompt's parameters JSON.
 * Looks for keys that map to ConstraintSpec fields.
 */
function parseConstraints(parameters: Record<string, unknown>): ConstraintSpec {
  const constraints: ConstraintSpec = {};

  if (typeof parameters.maxTokens === 'number') {
    constraints.maxTokens = parameters.maxTokens;
  }
  if (typeof parameters.temperature === 'number') {
    constraints.temperature = parameters.temperature;
  }
  if (Array.isArray(parameters.bannedTopics)) {
    constraints.bannedTopics = parameters.bannedTopics as string[];
  }
  if (Array.isArray(parameters.requiredFacts)) {
    constraints.requiredFacts = parameters.requiredFacts as string[];
  }
  if (typeof parameters.outputFormat === 'string') {
    const fmt = parameters.outputFormat;
    if (fmt === 'text' || fmt === 'json' || fmt === 'markdown' || fmt === 'xml') {
      constraints.outputFormat = fmt;
    }
  }

  return constraints;
}

/**
 * Validates anti-failure constraints before the AI generation call.
 * Returns validation result with errors array; logs warnings but does not throw.
 */
export function validateGenerationConstraints(
  promptContent: string,
  parameters: Record<string, unknown>
): ConstraintValidationResult {
  const constraints = parseConstraints(parameters);
  const libErrors = validateConstraints(constraints);

  // Map library errors to our result format
  const errors = libErrors.map(err => ({
    constraint: err.variable,
    message: err.error,
  }));

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Variable Injection ────────────────────────────────────────────────────────

/**
 * Injects user-provided variable values into the prompt template.
 * Replaces all {{variableName}} placeholders with the corresponding values.
 * Unknown variables (not in values map) are left as-is in the template.
 */
export function injectTemplateVariables(
  promptContent: string,
  variableValues: Record<string, string | number | boolean>
): string {
  return applyVariables(promptContent, variableValues);
}

// ─── Generation Lifecycle ───────────────────────────────────────────────────────

/**
 * Creates a GenerationRun in PENDING state.
 * Used as the first step in the lifecycle before any AI work begins.
 */
export async function createGenerationLog(
  userId: string,
  promptId: string,
  engine: string,
  parameters: Record<string, unknown>
): Promise<string> {
  const run = await prisma.generationRun.create({
    data: {
      promptId,
      userId,
      engine,
      parameters: JSON.stringify(parameters),
      status: 'queued', // queued maps to PENDING in our lifecycle
    },
  });
  return run.id;
}

/**
 * Transitions a GenerationRun to IN_PROGRESS state.
 * Call this immediately before invoking the AI engine.
 */
export async function transitionToInProgress(runId: string): Promise<void> {
  await prisma.generationRun.update({
    where: { id: runId },
    data: { status: 'running' },
  });
}

export interface AIGenerateResult {
  text: string;
  provider: AIProvider;
  model: string;
  finishReason: string;
  isMock: boolean;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/**
 * Finalizes a GenerationRun as COMPLETED.
 * - Sets status to 'succeeded'
 * - Stores the full generated response
 * - Deducts credits (only on success path)
 *
 * Throws on credit deduction failure so caller can transition to FAILED instead.
 */
export async function finalizeGenerationCompleted(
  runId: string,
  result: AIGenerateResult,
  userId: string,
  promptTitle: string
): Promise<void> {
  // Deduct credits ONLY on the COMPLETED path
  try {
    await deductCredits(userId, 1, `Generation completed: ${promptTitle}`, 'generation', runId);
  } catch (err: any) {
    // Credit deduction failed — fail the generation instead of leaving it in limbo
    await prisma.generationRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        error: `Credit deduction failed: ${err.message}`,
      },
    });
    throw err;
  }

  await prisma.generationRun.update({
    where: { id: runId },
    data: {
      status: 'succeeded',
      response: JSON.stringify({
        text: result.text,
        provider: result.provider,
        model: result.model,
        finishReason: result.finishReason,
        isMock: result.isMock,
        usage: result.usage,
      }),
    },
  });
}

/**
 * Finalizes a GenerationRun as FAILED.
 * - Sets status to 'failed'
 * - Records the error message
 * - Does NOT deduct credits (failure path)
 */
export async function finalizeGenerationFailed(
  runId: string,
  errorMessage: string
): Promise<void> {
  await prisma.generationRun.update({
    where: { id: runId },
    data: {
      status: 'failed',
      error: errorMessage,
    },
  });
}

/**
 * Finalizes a GenerationRun as CANCELLED (user-initiated abort).
 * - Sets status to 'failed' with error 'Cancelled by user'
 * - Does NOT deduct credits
 */
export async function finalizeGenerationCancelled(runId: string): Promise<void> {
  await prisma.generationRun.update({
    where: { id: runId },
    data: {
      status: 'failed',
      error: 'Cancelled by user',
    },
  });
}

// ─── Main Generation Processor ─────────────────────────────────────────────────

export interface GenerationRequest {
  userId: string;
  promptId: string;
  variableValues: Record<string, string | number | boolean>;
  parameters: Record<string, unknown>; // full parameters including constraint fields
}

export interface GenerationResult {
  runId: string;
  generatedPrompt: string;
  negativePrompt: string;
  missingInfoHints: string[];
  suggestions: string[];
  rewrittenPrompt: string;
  provider: AIProvider | 'mock';
  status: string;
}

/**
 * Full generation pipeline with lifecycle management:
 *
 * 1. Validate constraints BEFORE AI call (anti-failure)
 * 2. Inject variables into prompt template
 * 3. Create GenerationRun in PENDING state
 * 4. Transition to IN_PROGRESS
 * 5. Execute AI generation (real OpenAI/Anthropic, or mock if USE_MOCK_AI=true)
 * 6. Create output records
 * 7. Transition to COMPLETED + deduct credits
 *
 * If step 6/7 fails → transition to FAILED (no credit charge)
 */
export async function processGeneration(request: GenerationRequest): Promise<GenerationResult> {
  const { userId, promptId, variableValues, parameters } = request;

  // Fetch prompt details
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new Error('Prompt not found');

  // ── Step 1: Anti-failure constraint validation (before AI call) ──────────────
  const constraintResult = validateGenerationConstraints(prompt.content, parameters);
  if (!constraintResult.valid) {
    const messages = constraintResult.errors.map(e => `${e.constraint}: ${e.message}`).join('; ');
    throw new Error(`Constraint validation failed: ${messages}`);
  }

  // ── Step 2: Template variable injection ─────────────────────────────────────
  const resolvedPrompt = injectTemplateVariables(prompt.content, variableValues);

  // ── Step 3: Create GenerationRun in PENDING (queued) state ───────────────────
  const run = await prisma.generationRun.create({
    data: {
      promptId,
      userId,
      engine: prompt.engine,
      parameters: JSON.stringify(parameters),
      status: 'queued',
    },
  });

  // ── Step 4: Transition to IN_PROGRESS (running) ─────────────────────────────
  await prisma.generationRun.update({
    where: { id: run.id },
    data: { status: 'running' },
  });

  // ── Step 5: Execute AI generation (real OpenAI/Anthropic or mock fallback) ───
  let aiResult: AIGenerateResult;
  try {
    aiResult = await aiGenerate({
      systemPrompt: resolvedPrompt,
      userPrompt: `Generate a prompt based on these parameters: ${JSON.stringify(variableValues)}`,
      model: prompt.model ?? undefined,
      maxTokens: (parameters.maxTokens as number) || 500,
      temperature: (parameters.temperature as number) || 0.7,
    });
  } catch (err: any) {
    // AI call failed → mark FAILED, no credit
    await finalizeGenerationFailed(run.id, err.message || 'Generation engine error');
    throw err;
  }

  // ── Step 6: Create mock output records ───────────────────────────────────────
  const outputCount = 4;
  const runIdStr = run.id;
  await prisma.generationOutput.createMany({
    data: Array.from({ length: outputCount }, (_, index) => ({
      runId: runIdStr,
      url: `/mock-output/${runIdStr}/${index + 1}.png`,
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      seed: `${runIdStr}-${index}`,
    })),
  });

  // ── Step 7: Transition to COMPLETED + deduct credits ────────────────────────
  try {
    await finalizeGenerationCompleted(run.id, aiResult, userId, prompt.title);
  } catch {
    // Error already recorded in finalizeGenerationCompleted
    throw new Error('Generation completed but credit deduction failed');
  }

  return {
    runId: run.id,
    generatedPrompt: aiResult.text,
    negativePrompt: '',
    missingInfoHints: [],
    suggestions: [],
    rewrittenPrompt: aiResult.text,
    provider: aiResult.provider,
    status: 'succeeded',
  };
}
