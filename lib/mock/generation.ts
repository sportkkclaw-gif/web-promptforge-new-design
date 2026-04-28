// Mock Prompt Generation Service
// MVP scope: generate prompt TEXT only (no in-app image generation)

export interface MockGenerationParams {
  engine?: string;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  parameters: Record<string, unknown>;
}

export interface MockPromptGenerationResult {
  runId: string;
  status: 'mocked';
  generatedPrompt: string;
  negativePrompt: string;
  missingInfoHints: string[];
  suggestions: string[];
  rewrittenPrompt: string;
  provider: 'mock';
}

export function generateMockSeed(): string {
  return String(Math.floor(Math.random() * 999999));
}

export function generateMockRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function mockGenerate(params: MockGenerationParams): Promise<MockPromptGenerationResult> {
  const p = params.parameters ?? {};

  const subject = text(p.subject);
  const style = text(p.style);
  const composition = text(p.composition);
  const lighting = text(p.lighting);
  const camera = text(p.camera);
  const background = text(p.background);
  const details = text(p.details);
  const targetModel = text(p.targetModel) || text(params.model) || 'midjourney-v6';

  const missingInfoHints = [
    !subject && '請補充 subject（主體）',
    !style && '請補充 style（風格）',
    !composition && '請補充 composition（構圖）',
    !lighting && '請補充 lighting（光線）',
    !camera && '請補充 camera（鏡頭）',
    !background && '請補充 background（背景）',
  ].filter(Boolean) as string[];

  const generatedPrompt = [
    subject || 'professional product hero subject',
    style || 'commercial product photography style',
    composition || 'rule-of-thirds composition',
    lighting || 'soft box studio lighting',
    camera || '85mm lens, f/2.8',
    background || 'clean minimal background',
    details || 'ultra-detailed texture, realistic material reflection',
    `optimized for ${targetModel}`,
  ].join(', ');

  const negativePrompt =
    text(p.negativePrompt) ||
    params.negativePrompt ||
    'blurry, low quality, overexposed, watermark, text artifacts, distorted anatomy';

  const suggestions = [
    '加入明確材質與色溫描述可提升一致性',
    '補上鏡頭焦段與景深可減少構圖漂移',
    '為不同模型拆分參數版本（Midjourney / SDXL）',
  ];

  const rewrittenPrompt = `High-end commercial visual: ${generatedPrompt}`;

  return {
    runId: generateMockRunId(),
    status: 'mocked',
    generatedPrompt,
    negativePrompt,
    missingInfoHints,
    suggestions,
    rewrittenPrompt,
    provider: 'mock',
  };
}

export function isMockMode(): boolean {
  return process.env.AI_MOCK_MODE === 'true' || process.env.NEXT_PUBLIC_MOCK_AI === 'true';
}
