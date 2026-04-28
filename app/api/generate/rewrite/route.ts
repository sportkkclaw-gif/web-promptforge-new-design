import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';

// POST /api/generate/rewrite
// Return rewritten prompt in structured response format
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const basePrompt = (body?.prompt || '').trim();
    const style = (body?.style || 'professional-commercial').trim();

    if (!basePrompt) return error('prompt is required');

    const missingInfoHints: string[] = [];
    const suggestions = [
      '可加入具體構圖與鏡位關鍵字',
      '可指定輸出語言與禁用詞列表',
    ];
    const rewrittenPrompt = `[${style}] ${basePrompt}`;

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
