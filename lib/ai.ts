/**
 * AI Provider Service — Real OpenAI + Anthropic wiring with mock fallback.
 * 
 * Implements FULL_BUILD_CHECKLIST §6.1 P0:
 * - Real AI call: OpenAI GPT-4 (primary)
 * - Real AI call: Anthropic Claude (fallback/alternate)
 * - Mock mode: USE_MOCK_AI=true env var; must show "DEMO MODE" badge in UI
 * - If mock mode active, generation logs must indicate isMock: true
 * 
 * Routing logic:
 * 1. If USE_MOCK_AI=true → use mockGenerate (no API calls)
 * 2. Else if AI_PROVIDER=anthropic → use Anthropic Claude
 * 3. Else → use OpenAI GPT-4 (primary default)
 */

import { mockGenerate, type MockGenerationParams, type MockPromptGenerationResult } from '@/lib/mock/generation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'anthropic' | 'mock';

export interface GenerationResponse {
  text: string;
  provider: AIProvider;
  model: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Mock helper ──────────────────────────────────────────────────────────────

export function isMockMode(): boolean {
  return (
    process.env.USE_MOCK_AI === 'true' ||
    process.env.NEXT_PUBLIC_MOCK_AI === 'true' ||
    !process.env.OPENAI_API_KEY // no key = mock (local dev safe default)
  );
}

export function getAIProvider(): AIProvider {
  if (isMockMode()) return 'mock';
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'anthropic') return 'anthropic';
  return 'openai';
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<GenerationResponse> {
  const { systemPrompt, userPrompt, model = 'gpt-4', maxTokens = 500, temperature = 0.7 } = params;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{
      message: { content: string };
      finish_reason: string;
    }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  const choice = data.choices[0];
  return {
    text: choice.message.content ?? '',
    provider: 'openai',
    model,
    finishReason: choice.finish_reason,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

async function* streamOpenAI(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<StreamChunk> {
  const { systemPrompt, userPrompt, model = 'gpt-4', maxTokens = 500, temperature = 0.7 } = params;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finishReason = '';
  let usage: StreamChunk['usage'];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') {
          yield { delta: '', done: true, finishReason, usage };
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string };
              finish_reason?: string;
            }>;
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          };
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          finishReason = parsed.choices?.[0]?.finish_reason ?? finishReason;
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens,
              completionTokens: parsed.usage.completion_tokens,
              totalTokens: parsed.usage.total_tokens,
            };
          }
          if (delta) {
            yield { delta, done: false };
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { delta: '', done: true, finishReason, usage };
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

async function callAnthropic(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<GenerationResponse> {
  const { systemPrompt, userPrompt, model = 'claude-3-5-sonnet-20241022', maxTokens = 500, temperature = 0.7 } = params;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    content: Array<{ text: string }>;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  return {
    text: data.content[0]?.text ?? '',
    provider: 'anthropic',
    model,
    finishReason: data.stop_reason,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
}

async function* streamAnthropic(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): AsyncGenerator<StreamChunk> {
  const { systemPrompt, userPrompt, model = 'claude-3-5-sonnet-20241022', maxTokens = 500, temperature = 0.7 } = params;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'interleaved-thinking-2025-05-14',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') {
          yield { delta: '', done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            type: string;
            index?: number;
            delta?: { type: string; text?: string };
            usage?: { input_tokens: number; output_tokens: number };
            stop_reason?: string;
          };

          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            yield { delta: parsed.delta.text ?? '', done: false };
          } else if (parsed.type === 'message_delta' && parsed.usage) {
            yield {
              delta: '',
              done: true,
              finishReason: parsed.stop_reason,
              usage: {
                promptTokens: parsed.usage.input_tokens,
                completionTokens: parsed.usage.output_tokens,
                totalTokens: parsed.usage.input_tokens + parsed.usage.output_tokens,
              },
            };
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { delta: '', done: true };
}

// ─── Main dispatch ────────────────────────────────────────────────────────────

export interface AIGenerateParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Override provider; defaults to env-driven detection */
  provider?: AIProvider;
}

/**
 * Non-streaming AI generation.
 * Falls back to mock if USE_MOCK_AI=true or no API key configured.
 */
export async function aiGenerate(params: AIGenerateParams): Promise<{
  text: string;
  provider: AIProvider;
  model: string;
  finishReason: string;
  isMock: boolean;
  usage?: GenerationResponse['usage'];
}> {
  if (params.provider === 'mock' || isMockMode()) {
    const mockResult = await mockGenerate({
      engine: 'mock',
      model: params.model ?? 'mock-model',
      prompt: params.userPrompt,
      parameters: {
        systemPrompt: params.systemPrompt,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      },
    });
    return {
      text: mockResult.generatedPrompt,
      provider: 'mock',
      model: 'mock-model',
      finishReason: 'mock',
      isMock: true,
    };
  }

  const provider = params.provider ?? getAIProvider();

  if (provider === 'anthropic') {
    const result = await callAnthropic(params);
    return { ...result, isMock: false };
  }

  // OpenAI primary
  const result = await callOpenAI(params);
  return { ...result, isMock: false };
}

/**
 * Streaming AI generation (async generator).
 * Streams SSE-compatible chunks with partial tokens and final metadata.
 */
export async function* aiStream(params: AIGenerateParams): AsyncGenerator<{
  delta: string;
  done: boolean;
  finishReason?: string;
  isMock: boolean;
  provider: AIProvider;
  model: string;
  usage?: GenerationResponse['usage'];
}> {
  if (params.provider === 'mock' || isMockMode()) {
    // Simulate streaming for mock mode
    const mockResult = await mockGenerate({
      engine: 'mock',
      model: params.model ?? 'mock-model',
      prompt: params.userPrompt,
      parameters: {
        systemPrompt: params.systemPrompt,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      },
    });

    const text = mockResult.generatedPrompt;
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      await sleep(30);
      yield {
        delta: words[i] + (i < words.length - 1 ? ' ' : ''),
        done: false,
        isMock: true,
        provider: 'mock',
        model: 'mock-model',
      };
    }

    yield {
      delta: '',
      done: true,
      finishReason: 'mock',
      isMock: true,
      provider: 'mock',
      model: 'mock-model',
    };
    return;
  }

  const provider = params.provider ?? getAIProvider();

  if (provider === 'anthropic') {
    for await (const chunk of streamAnthropic(params)) {
      yield {
        delta: chunk.delta,
        done: chunk.done,
        finishReason: chunk.finishReason,
        isMock: false,
        provider: 'anthropic',
        model: params.model ?? 'claude-3-5-sonnet-20241022',
        usage: chunk.usage,
      };
    }
    return;
  }

  // OpenAI primary
  for await (const chunk of streamOpenAI(params)) {
    yield {
      delta: chunk.delta,
      done: chunk.done,
      finishReason: chunk.finishReason,
      isMock: false,
      provider: 'openai',
      model: params.model ?? 'gpt-4',
      usage: chunk.usage,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
