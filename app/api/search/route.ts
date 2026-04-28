import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { searchPrompts } from '@/lib/services/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const categorySlug = searchParams.get('category') ?? undefined;
  const engine = searchParams.get('engine') ?? undefined;
  const minPrice = parseInt(searchParams.get('minPrice') ?? '0');
  const maxPrice = parseInt(searchParams.get('maxPrice') ?? '999999');
  const sortBy = (searchParams.get('sortBy') ?? 'relevance') as 'relevance' | 'popular' | 'recent';

  if (!q) return error('Search query is required');

  try {
    const result = await searchPrompts(q, { categorySlug, engine, minPrice, maxPrice, sortBy });
    return ok(result);
  } catch {
    return error('Search failed');
  }
}
