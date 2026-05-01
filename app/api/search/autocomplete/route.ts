// app/api/search/autocomplete/route.ts
// GET /api/search/autocomplete — taxonomy + template name suggestions as user types

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getAutocompleteSuggestions } from '@/lib/services/search';

const TextSchema = z.string();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  // q is required and must be non-empty
  if (!q || q.trim() === '') {
    return error('Search query is required', 400);
  }
  if (!TextSchema.safeParse(q).success || q.trim().length > 100) {
    return error('Search query must be 100 characters or fewer', 400);
  }

  try {
    const suggestions = await getAutocompleteSuggestions(q.trim());
    return ok({ suggestions });
  } catch (err) {
    console.error('[/api/search/autocomplete] internal error:', err);
    return error('Autocomplete failed', 500);
  }
}