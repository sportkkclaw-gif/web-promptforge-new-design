import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { searchPrompts } from '@/lib/services/search';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const ALLOWED_SORT_BY = ['relevance', 'popular', 'recent'] as const;
type SortBy = typeof ALLOWED_SORT_BY[number];
const TextSchema = z.string();

function parsePriceParam(raw: string | null, fallback: number): number {
  if (raw === null || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return NaN;
  return parsed;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const categorySlug = searchParams.get('category') ?? undefined;
  const engine = searchParams.get('engine') ?? undefined;
  const sortByRaw = searchParams.get('sortBy');

  if (!q || q.trim() === '') return error('Search query is required', 400);
  if (!TextSchema.safeParse(q).success || q.trim().length > 200) return error('Search query must be 200 characters or fewer', 400);

  if (engine !== undefined) {
    if (!TextSchema.safeParse(engine).success || engine.trim() === '') return error('engine cannot be an empty string', 400);
    if (engine.trim().length > 50) return error('engine must be 50 characters or fewer', 400);
  }

  if (categorySlug !== undefined) {
    if (!TextSchema.safeParse(categorySlug).success || categorySlug.trim() === '') return error('category cannot be an empty string', 400);
    if (categorySlug.trim().length > 64) return error('category must be 64 characters or fewer', 400);
  }

  const minPrice = parsePriceParam(searchParams.get('minPrice'), 0);
  const maxPrice = parsePriceParam(searchParams.get('maxPrice'), 999999);
  if (Number.isNaN(minPrice)) return error('minPrice and maxPrice must be valid integers', 400);
  if (Number.isNaN(maxPrice)) return error('minPrice and maxPrice must be valid integers', 400);
  if (minPrice < 0 || maxPrice < 0) return error('Price values cannot be negative', 400);
  if (maxPrice < minPrice) return error('maxPrice cannot be less than minPrice', 400);

  if (sortByRaw !== null && !ALLOWED_SORT_BY.includes(sortByRaw as SortBy)) {
    return error(`sortBy must be one of: ${ALLOWED_SORT_BY.join('|')}`, 400);
  }
  const sortBy: SortBy = (sortByRaw ?? 'relevance') as SortBy;

  try {
    const result = await searchPrompts(q.trim(), { categorySlug, engine, minPrice, maxPrice, sortBy });

    if (process.env.NODE_ENV !== 'test') {
      const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
      const session = token ? getSession(token) : null;
      await writeAuditLog({
        userId: session?.userId ?? null,
        action: 'SEARCH_QUERY',
        target: 'search:prompts',
        metadata: { qLength: q.trim().length, categorySlug, engine, sortBy },
        ipAddress: getClientIp(request),
      });
    }

    return ok(result);
  } catch (err) {
    console.error('[/api/search] internal error:', err);
    return error('Search failed', 500);
  }
}
