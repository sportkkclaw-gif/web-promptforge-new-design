import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const OptimizeBodySchema = z.object({
  parameters: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = OptimizeBodySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const parameters = parsed.data.parameters ?? {};

  try {
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

    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    const session = token ? getSession(token) : null;
    await writeAuditLog({
      userId: session?.userId ?? null,
      action: 'PROMPT_UPDATE',
      target: 'generate:optimize',
      metadata: { hasParameters: Object.keys(parameters).length > 0 },
      ipAddress: getClientIp(request),
    });

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
