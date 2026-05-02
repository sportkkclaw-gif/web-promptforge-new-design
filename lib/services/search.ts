import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { trackEvent } from '@/lib/analytics';

export interface AutocompleteSuggestion {
  type: 'template' | 'category';
  id: string;
  label: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Elasticsearch integration stub
// ---------------------------------------------------------------------------
// ES_CLIENT_URL is optional; when absent or unreachable, search falls back to
// Prisma contains queries. This provides a deterministic fallback for local
// dev / CI environments where ES is not provisioned.
// ---------------------------------------------------------------------------
interface EsClient {
  search(params: { index: string; body: object }): Promise<{ hits: { hits: Array<{ _source: unknown }>; total: { value: number } } }>;
}

let _esClient: EsClient | null = null;
async function getEsClient(): Promise<EsClient | null> {
  if (_esClient !== null) return _esClient;
  const url = process.env.ES_CLIENT_URL;
  if (!url) return null;
  try {
    // Dynamic import to avoid breaking builds when ES env is absent
    const dynamicImporter = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
    const elasticModule = await dynamicImporter('@elastic/elasticsearch');
    const Client = elasticModule?.Client ?? elasticModule?.default?.Client;
    if (!Client) return null;
    _esClient = new Client({ node: url }) as unknown as EsClient;
    return _esClient;
  } catch {
    return null;
  }
}

async function searchWithEs(
  query: string,
  filters: {
    categorySlug?: string;
    engine?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'relevance' | 'popular' | 'recent';
    limit?: number;
    offset?: number;
  },
): Promise<{ prompts: SearchResult['prompts']; total: number } | null> {
  const es = await getEsClient();
  if (!es) return null;

  const must: object[] = [
    {
      multi_match: {
        query,
        fields: ['title^3', 'summary^2', 'content', 'tags', 'variableNames'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    },
  ];

  if (filters.categorySlug) {
    must.push({ term: { 'taxonomyPath.slug': filters.categorySlug } });
  }
  if (filters.engine) {
    must.push({ term: { engine: filters.engine } });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    must.push({
      range: {
        priceCredits: {
          gte: filters.minPrice ?? 0,
          lte: filters.maxPrice ?? 999999,
        },
      },
    });
  }

  let sort: object[];
  switch (filters.sortBy) {
    case 'popular': sort = [{ viewCount: 'desc' }]; break;
    case 'recent': sort = [{ createdAt: 'desc' }]; break;
    default: sort = [{ _score: 'desc' }];
  }

  try {
    const result = await es.search({
      index: 'promptforge_templates',
      body: {
        query: { bool: { must } },
        sort,
        from: filters.offset ?? 0,
        size: filters.limit ?? 20,
      },
    });

    const hits = result.hits.hits as Array<{ _source: unknown }>;
    const total = typeof result.hits.total === 'object' ? result.hits.total.value : (result.hits.total as number);

    return {
      prompts: hits.map((h) => h._source as SearchResult['prompts'][0]),
      total,
    };
  } catch {
    return null;
  }
}

export async function getAutocompleteSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
  const [templates, categories] = await Promise.all([
    prisma.prompt.findMany({
      where: {
        status: { in: ['published', 'marketplace'] },
        title: { contains: query },
      },
      select: { id: true, title: true, slug: true },
      take: 5,
      orderBy: { viewCount: 'desc' },
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { slug: { contains: query } },
        ],
      },
      select: { id: true, name: true, slug: true },
      take: 5,
      orderBy: { sort: 'asc' },
    }),
  ]);

  const templateSuggestions: AutocompleteSuggestion[] = templates.map((t) => ({
    type: 'template',
    id: t.id,
    label: t.title,
    slug: t.slug,
  }));

  const categorySuggestions: AutocompleteSuggestion[] = categories.map((c) => ({
    type: 'category',
    id: c.id,
    label: c.name,
    slug: c.slug,
  }));

  return [...templateSuggestions, ...categorySuggestions];
}

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

export async function searchPrompts(
  query: string,
  filters?: {
    categorySlug?: string;
    engine?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'relevance' | 'popular' | 'recent';
    limit?: number;
    offset?: number;
  },
): Promise<SearchResult> {
  const {
    categorySlug,
    engine,
    minPrice = 0,
    maxPrice = 999999,
    sortBy = 'relevance',
    limit = 24,
    offset = 0,
  } = filters ?? {};

  // Try ES first; fall back to Prisma on any error / unavailability
  const esResult = await searchWithEs(query, { categorySlug, engine, minPrice, maxPrice, sortBy, limit, offset });
  if (esResult) {
    return { prompts: esResult.prompts, total: esResult.total };
  }

  // Prisma fallback — deterministic for local dev / CI
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
  if (categorySlug) {
    where.promptTags = {
      some: {
        tag: {
          slug: categorySlug,
        },
      },
    };
  }

  const orderBy: Prisma.PromptOrderByWithRelationInput =
    sortBy === 'popular' ? { viewCount: 'desc' } :
    sortBy === 'recent' ? { createdAt: 'desc' } :
    { viewCount: 'desc' };

  const [prompts, total] = await Promise.all([
    prisma.prompt.findMany({
      where,
      include: { owner: { select: { username: true, avatarUrl: true } } },
      orderBy,
      take: limit,
      skip: offset,
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
