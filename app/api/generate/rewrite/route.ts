import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const RewriteBodySchema = z.object({
  prompt: z.string().min(1, 'prompt is required').max(5000, 'prompt must be ≤5000 chars'),
  style: z.string().max(100, 'style must be ≤100 chars').optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = RewriteBodySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const basePrompt = parsed.data.prompt.trim();
  const style = (parsed.data.style || 'professional-commercial').trim();

  try {
    const missingInfoHints: string[] = [];
    const suggestions = [
      '可加入具體構圖與鏡位關鍵字',
      '可指定輸出語言與禁用詞列表',
    ];
    const rewrittenPrompt = `[${style}] ${basePrompt}`;

    const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
    const session = token ? getSession(token) : null;
    await writeAuditLog({
      userId: session?.userId ?? null,
      action: 'PROMPT_UPDATE',
      target: 'generate:rewrite',
      metadata: { style },
      ipAddress: getClientIp(request),
    });

    return ok({
      missingInfoHints,
      suggestions,
      rewrittenPrompt,
      provider: 'mock',
    });
  } catch {
    return error('Rewrite failed');
  }
}
