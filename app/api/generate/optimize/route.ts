import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';

// POST /api/generate/optimize
// Return structured optimization guidance in MVP mock mode
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parameters = body?.parameters ?? {};

    const missingInfoHints = [
      !parameters.subject && 'subject 未填寫',
      !parameters.style && 'style 未填寫',
      !parameters.composition && 'composition 未填寫',
      !parameters.lighting && 'lighting 未填寫',
    ].filter(Boolean) as string[];

    const suggestions = [
      '在 details 增加材質/紋理關鍵詞',
      '補上 camera 焦段與 aperture 參數',
      '為 targetModel 指定對應語法風格',
    ];

    const rewrittenPrompt = [
      parameters.subject || 'professional subject',
      parameters.style || 'cinematic style',
      parameters.composition || 'balanced composition',
      parameters.lighting || 'studio lighting',
    ].join(', ');

    return ok({
      missingInfoHints,
      suggestions,
      rewrittenPrompt,
      provider: 'mock',
    });
  } catch {
    return error('Optimization failed');
  }
}
