import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { trackEvent } from '@/lib/analytics';

export interface SearchResult {
  prompts: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string;
    status: string;
    viewCount: number;
    owner: { username: string; avatarUrl: string | null };
  }>;
  total: number;
}

export async function searchPrompts(query: string, filters?: {
  categorySlug?: string;
  engine?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'relevance' | 'popular' | 'recent';
}): Promise<SearchResult> {
  const { categorySlug, engine, minPrice = 0, maxPrice = 999999, sortBy = 'relevance' } = filters ?? {};

  const where: any = {
    status: { in: ['published', 'marketplace'] },
    OR: [
      { title: { contains: query } },
      { summary: { contains: query } },
      { content: { contains: query } },
    ],
    priceCredits: { gte: minPrice, lte: maxPrice },
  };

  if (engine) where.engine = engine;

  const orderBy: Prisma.PromptOrderByWithRelationInput =
    sortBy === 'popular' ? { viewCount: 'desc' } :
    sortBy === 'recent' ? { createdAt: 'desc' } :
    { viewCount: 'desc' };

  const [prompts, total] = await Promise.all([
    prisma.prompt.findMany({
      where,
      include: { owner: { select: { username: true, avatarUrl: true } } },
      orderBy,
      take: 24,
    }),
    prisma.prompt.count({ where }),
  ]);

  return {
    prompts: prompts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      status: p.status,
      viewCount: p.viewCount,
      owner: p.owner,
    })),
    total,
  };
}
